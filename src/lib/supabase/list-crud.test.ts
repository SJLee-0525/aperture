import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  listResult: vi.fn(),
  insert: vi.fn(),
  updateSelect: vi.fn(),
  del: vi.fn(),
  rpc: vi.fn(),
  requestRagSync: vi.fn(),
  requestPublicRevalidate: vi.fn(),
  hasSession: true,
}));

/** supabase-js 쿼리 빌더 대역 — 이 파일이 쓰는 체인만 재현한다. */
const builder = () => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    maybeSingle: () => Promise.resolve(mocks.maybeSingle()),
    insert: (row: unknown) => Promise.resolve(mocks.insert(row)),
    update: (row: unknown) => ({
      eq: () => ({ select: () => Promise.resolve(mocks.updateSelect(row)) }),
    }),
    delete: () => ({ eq: () => ({ select: () => Promise.resolve(mocks.del()) }) }),
    then: (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ): Promise<unknown> => Promise.resolve(mocks.listResult()).then(resolve, reject),
  };
  return chain;
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: () => builder(),
    rpc: (...args: unknown[]) => Promise.resolve(mocks.rpc(...args)),
    auth: {
      getSession: async () => ({
        data: { session: mocks.hasSession ? { access_token: "token" } : null },
        error: null,
      }),
    },
  }),
}));
vi.mock("@/lib/ai/request-rag-sync", () => ({ requestRagSync: mocks.requestRagSync }));
vi.mock("@/lib/cache/request-revalidate", () => ({
  requestPublicRevalidate: mocks.requestPublicRevalidate,
}));

import { listCrud, type PostSyncPolicy } from "@/lib/supabase/list-crud";

type Entity = { id: string; published: boolean; publishedAt?: Date; body: string };

const toEntity = (id: string, d: Record<string, unknown>): Entity => ({
  id,
  published: (d.published as boolean) ?? false,
  body: (d.body as string) ?? "",
});

/** 쓰기 직전 스냅샷으로 돌려줄 dev_articles 행 대역. `null` 이면 없는 문서다. */
const rowOf = (fields: { published: boolean; body: string } | null) =>
  fields === null
    ? { data: null, error: null }
    : {
        data: {
          id: "doc-1",
          published: fields.published,
          slug: "",
          published_at: null,
          data: { body: fields.body },
        },
        error: null,
      };

const ok = { data: null, error: null };
const okRows = { data: [{ id: "doc-1" }], error: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasSession = true;
  mocks.insert.mockReturnValue(ok);
  mocks.updateSelect.mockReturnValue(okRows);
  mocks.del.mockReturnValue(okRows);
  mocks.rpc.mockReturnValue({ data: 1, error: null });
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
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
});

/** dev_articles 인코더는 발행 글에 Date 형식 publishedAt 을 요구한다. */
const PUBLISHED_AT = new Date("2026-02-01T00:00:00.000Z");

describe("listCrud — 정책 주입", () => {
  it("skip 을 돌려주면 동기화를 요청하지 않는다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("skip");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);
    mocks.maybeSingle.mockReturnValue(rowOf({ published: false, body: "a" }));

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
    mocks.maybeSingle.mockReturnValue(rowOf({ published: true, body: "a" }));

    await crud.update("doc-1", { published: true, publishedAt: PUBLISHED_AT, body: "b" });
    await crud.remove("doc-1");

    expect(mocks.requestRagSync).toHaveBeenCalledTimes(2);
  });

  it("생성은 스냅샷을 읽지 않고 before 를 null 로 정책에 전달한다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("sync");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);

    await crud.create("doc-1", { published: true, publishedAt: PUBLISHED_AT, body: "a" });

    expect(mocks.maybeSingle).not.toHaveBeenCalled();
    expect(policy).toHaveBeenCalledWith(null, {
      id: "doc-1",
      published: true,
      publishedAt: PUBLISHED_AT,
      body: "a",
    });
  });

  it("setPublished 는 스냅샷에 published 만 얹어 정책에 전달한다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("sync");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);
    mocks.maybeSingle.mockReturnValue(rowOf({ published: false, body: "a" }));

    await crud.setPublished("doc-1", true);

    expect(policy).toHaveBeenCalledWith(
      { id: "doc-1", published: false, body: "a" },
      { id: "doc-1", published: true, body: "a" },
    );
  });

  it("스냅샷 조회 실패는 쓰기를 막지 않고 정책 없이 강제 동기화한다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("skip");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", "project", policy);
    mocks.maybeSingle.mockReturnValue({ data: null, error: { message: "unavailable" } });

    await crud.update("doc-1", { published: false, body: "b" });

    expect(mocks.updateSelect).toHaveBeenCalled();
    expect(policy).not.toHaveBeenCalled();
    expect(mocks.requestRagSync).toHaveBeenCalledWith("project", "doc-1");
  });

  it("ragSourceType 이 없으면 정책 결과와 무관하게 요청과 스냅샷 조회가 없다", async () => {
    const policy = vi.fn<PostSyncPolicy<Entity>>().mockReturnValue("sync");
    const crud = listCrud<Entity>("devArticles", toEntity, "글", undefined, policy);

    await crud.create("doc-1", { published: true, publishedAt: PUBLISHED_AT, body: "a" });
    await crud.update("doc-1", { published: true, publishedAt: PUBLISHED_AT, body: "b" });
    await crud.setPublished("doc-1", false);
    await crud.remove("doc-1");

    expect(mocks.requestRagSync).not.toHaveBeenCalled();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
});

describe("listCrud — patchData", () => {
  // 전체 문서를 되쓰면 디코더가 결측 필드에 채운 폴백까지 저장된다. 한 필드만 바꾸는
  // 작업이 공연일·촬영일을 덮어쓰는 것을 이 경로가 막는다.
  it("저장된 data 를 그대로 읽어 병합하므로 모르는 필드가 남는다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트");
    mocks.maybeSingle.mockReturnValue({
      data: { data: { body: "a", legacyField: 7, performedAt: "2020-01-01T00:00:00.000Z" } },
      error: null,
    });
    mocks.updateSelect.mockReturnValue({ data: [{ id: "doc-1" }], error: null });

    await crud.patchData("doc-1", { body: "b" });

    expect(mocks.updateSelect).toHaveBeenCalledWith({
      data: { body: "b", legacyField: 7, performedAt: "2020-01-01T00:00:00.000Z" },
    });
  });

  it("공개 캐시 무효화와 RAG 동기화를 함께 요청한다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");
    mocks.maybeSingle.mockReturnValue({ data: { data: {} }, error: null });
    mocks.updateSelect.mockReturnValue({ data: [{ id: "doc-1" }], error: null });

    await crud.patchData("doc-1", { body: "b" });

    expect(mocks.requestPublicRevalidate).toHaveBeenCalled();
    expect(mocks.requestRagSync).toHaveBeenCalledWith("project", "doc-1");
  });

  it("문서가 없으면 쓰기를 시도하지 않는다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트");
    mocks.maybeSingle.mockReturnValue({ data: null, error: null });

    await expect(crud.patchData("doc-1", { body: "b" })).rejects.toThrow(
      "프로젝트 수정에 실패했습니다.",
    );
    expect(mocks.updateSelect).not.toHaveBeenCalled();
  });
});

describe("listCrud — supabase 오류·0행 처리", () => {
  it("insert 오류는 던지고 재검증·동기화를 호출하지 않는다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");
    mocks.insert.mockReturnValue({ data: null, error: { message: "denied" } });

    await expect(crud.create("doc-1", { published: true, body: "a" })).rejects.toThrow(
      "프로젝트 저장에 실패했습니다.",
    );
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
    expect(mocks.requestRagSync).not.toHaveBeenCalled();
  });

  it("update 가 0행이면 RLS 거부·부재를 실패로 처리한다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");
    mocks.updateSelect.mockReturnValue({ data: [], error: null });

    await expect(crud.update("doc-1", { published: true, body: "a" })).rejects.toThrow(
      "프로젝트 수정에 실패했습니다.",
    );
    expect(mocks.requestRagSync).not.toHaveBeenCalled();
  });

  it("delete 가 0행이면 RLS 거부·부재를 실패로 처리한다", async () => {
    // 세션 만료 시 DELETE 가 anon 으로 나가면 오류 없이 0행이 된다. 성공으로 위장되면
    // UI 는 행을 지우는데 라이브 데이터는 남는다.
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");
    mocks.del.mockReturnValue({ data: [], error: null });

    await expect(crud.remove("doc-1")).rejects.toThrow("프로젝트 삭제에 실패했습니다.");
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
    expect(mocks.requestRagSync).not.toHaveBeenCalled();
  });

  it("세션이 없으면 목록·단건 읽기가 로그인 오류로 끝난다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");
    mocks.hasSession = false;

    await expect(crud.list()).rejects.toThrow("관리자 로그인이 필요합니다.");
    await expect(crud.get("doc-1")).rejects.toThrow("관리자 로그인이 필요합니다.");
  });
});

describe("listCrud — 일괄 정렬", () => {
  it("정렬 RPC 1회를 호출하고 컬렉션 태그를 재검증한다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");
    mocks.rpc.mockReturnValue({ data: 2, error: null });

    await crud.updateOrder([
      { id: "a", order: 0 },
      { id: "b", order: 1 },
    ]);

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("update_dev_projects_sort_orders", {
      items: [
        { id: "a", sort_order: 0 },
        { id: "b", sort_order: 1 },
      ],
    });
    expect(mocks.requestPublicRevalidate).toHaveBeenCalledTimes(1);
  });

  it("반환 행 수가 요청과 다르면 부분 반영을 실패로 처리한다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");
    mocks.rpc.mockReturnValue({ data: 1, error: null });

    await expect(
      crud.updateOrder([
        { id: "a", order: 0 },
        { id: "없는-id", order: 1 },
      ]),
    ).rejects.toThrow("순서 저장에 실패했습니다.");
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
  });

  it("빈 변경 목록은 RPC 를 호출하지 않는다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");

    await crud.updateOrder([]);

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
  });

  it("중복 ID 는 행 수 대조가 무의미해 호출 전에 거른다", async () => {
    const crud = listCrud<Entity>("devProjects", toEntity, "프로젝트", "project");

    await expect(
      crud.updateOrder([
        { id: "a", order: 0 },
        { id: "a", order: 1 },
      ]),
    ).rejects.toThrow("중복된 정렬 대상이 있습니다.");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
