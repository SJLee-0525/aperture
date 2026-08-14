import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  requestRagSync: vi.fn(),
  requestPublicRevalidate: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db: unknown, _name?: unknown, id?: unknown) => ({ id: id ?? "generated-id" })),
  getDoc: mocks.getDoc,
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,
}));

vi.mock("@/lib/firebase/client", () => ({ getFirebaseDb: vi.fn(() => ({})) }));
vi.mock("@/lib/ai/request-rag-sync", () => ({ requestRagSync: mocks.requestRagSync }));
vi.mock("@/lib/cache/request-revalidate", () => ({
  requestPublicRevalidate: mocks.requestPublicRevalidate,
}));

import { listCrud, type PostSyncPolicy } from "@/lib/firebase/list-crud";

type Entity = { id: string; published: boolean; body: string };

const toEntity = (id: string, d: Record<string, unknown>): Entity => ({
  id,
  published: (d.published as boolean) ?? false,
  body: (d.body as string) ?? "",
});

/**
 * getDoc 이 돌려줄 기존 문서 스냅샷을 흉내 낸다.
 *
 * @param {Record<string, unknown> | null} data 문서 필드. `null` 이면 없는 문서다.
 * @returns {{ id: string; exists: () => boolean; data: () => Record<string, unknown> }} Firestore 스냅샷 대역.
 */
const snapshotOf = (data: Record<string, unknown> | null) => ({
  id: "doc-1",
  exists: () => data !== null,
  data: () => data ?? {},
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.setDoc.mockResolvedValue(undefined);
  mocks.updateDoc.mockResolvedValue(undefined);
  mocks.deleteDoc.mockResolvedValue(undefined);
  mocks.requestRagSync.mockResolvedValue(undefined);
});

describe("listCrud — 정책 미주입 (기존 컬렉션 경로)", () => {
  it("네 가지 쓰기 모두 동기화를 요청하고 쓰기 직전 스냅샷은 읽지 않는다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");

    await crud.create("doc-1", { published: false, body: "a" });
    await crud.update("doc-1", { published: false, body: "b" });
    await crud.setPublished("doc-1", true);
    await crud.remove("doc-1");

    expect(mocks.requestRagSync).toHaveBeenCalledTimes(4);
    expect(mocks.requestRagSync).toHaveBeenCalledWith("project", "doc-1");
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });
});

describe("listCrud — 정책 주입", () => {
  it("skip 을 돌려주면 동기화를 요청하지 않는다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("skip");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);
    mocks.getDoc.mockResolvedValue(snapshotOf({ published: false, body: "a" }));

    await crud.update("doc-1", { published: false, body: "b" });

    expect(policy).toHaveBeenCalledWith(
      { id: "doc-1", published: false, body: "a" },
      { id: "doc-1", published: false, body: "b" },
    );
    expect(mocks.requestRagSync).not.toHaveBeenCalled();
  });

  it("sync 와 remove 는 같은 동기화 요청으로 수렴한다", async () => {
    const policy = vi
      .fn<PostSyncPolicy<Entity>>()
      .mockReturnValueOnce("sync")
      .mockReturnValueOnce("remove");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);
    mocks.getDoc.mockResolvedValue(snapshotOf({ published: true, body: "a" }));

    await crud.update("doc-1", { published: true, body: "b" });
    await crud.remove("doc-1");

    expect(mocks.requestRagSync).toHaveBeenCalledTimes(2);
  });

  it("생성은 스냅샷을 읽지 않고 before 를 null 로 정책에 전달한다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("sync");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);

    await crud.create("doc-1", { published: true, body: "a" });

    expect(mocks.getDoc).not.toHaveBeenCalled();
    expect(policy).toHaveBeenCalledWith(null, { id: "doc-1", published: true, body: "a" });
  });

  it("setPublished 는 스냅샷에 published 만 얹어 정책에 전달한다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("sync");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);
    mocks.getDoc.mockResolvedValue(snapshotOf({ published: false, body: "a" }));

    await crud.setPublished("doc-1", true);

    expect(policy).toHaveBeenCalledWith(
      { id: "doc-1", published: false, body: "a" },
      { id: "doc-1", published: true, body: "a" },
    );
  });

  it("스냅샷 조회 실패는 쓰기를 막지 않고 정책 없이 강제 동기화한다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("skip");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);
    mocks.getDoc.mockRejectedValue(new Error("unavailable"));

    await crud.update("doc-1", { published: false, body: "b" });

    expect(mocks.updateDoc).toHaveBeenCalled();
    expect(policy).not.toHaveBeenCalled();
    expect(mocks.requestRagSync).toHaveBeenCalledWith("project", "doc-1");
  });

  it("ragSourceType 이 없으면 정책 결과와 무관하게 요청과 스냅샷 조회가 없다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("sync");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", undefined, policy);

    await crud.create("doc-1", { published: true, body: "a" });
    await crud.update("doc-1", { published: true, body: "b" });
    await crud.setPublished("doc-1", false);
    await crud.remove("doc-1");

    expect(mocks.requestRagSync).not.toHaveBeenCalled();
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });
});
