import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAlbumsAdmin: vi.fn<() => Promise<Album[]>>(),
  albumUpdate: vi.fn<(table: string, row: unknown) => unknown>(() => ({
    data: [{ id: "a1" }],
    error: null,
  })),
  photoDelete: vi.fn<(table: string, id: string) => unknown>(() => ({
    data: [{ id: "p1" }],
    error: null,
  })),
  requestRagSync: vi.fn(),
  requestPublicRevalidate: vi.fn(),
}));

/** supabase-js 빌더 대역 — `deletePhoto` 가 쓰는 update·delete 체인만 재현한다. */
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => ({
      update: (row: unknown) => ({
        eq: () => ({ select: () => Promise.resolve(mocks.albumUpdate(table, row)) }),
      }),
      delete: () => ({
        eq: (_column: string, id: string) => ({
          select: () => Promise.resolve(mocks.photoDelete(table, id)),
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/albums", () => ({ listAlbumsAdmin: mocks.listAlbumsAdmin }));
vi.mock("@/lib/ai/request-rag-sync", () => ({ requestRagSync: mocks.requestRagSync }));
vi.mock("@/lib/cache/request-revalidate", () => ({
  requestPublicRevalidate: mocks.requestPublicRevalidate,
  requestPublicPathRevalidate: vi.fn(),
}));

import { collectionCacheTag } from "@/constants/cache";
import { COLLECTIONS } from "@/constants/collections";
import { deletePhoto } from "@/lib/supabase/photos";

import type { Album } from "@/types/album";

const album = (overrides: Partial<Album>): Album => ({
  id: "a1",
  title: { ko: "앨범", en: "Album" },
  subtitle: { ko: "", en: "" },
  coverPhotoId: "",
  cover: null,
  photoIds: [],
  order: 0,
  published: true,
  ...overrides,
});

/** 앨범 갱신에 실린 data jsonb. 인코더가 스칼라를 승격하므로 나머지는 여기 있다. */
const updatedData = (call: number) =>
  (mocks.albumUpdate.mock.calls[call]?.[1] as { data: Record<string, unknown> }).data;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.albumUpdate.mockReturnValue({ data: [{ id: "a1" }], error: null });
  mocks.photoDelete.mockReturnValue({ data: [{ id: "p1" }], error: null });
});

describe("deletePhoto — 앨범 참조 정리", () => {
  it("참조가 없는 앨범은 건드리지 않는다", async () => {
    mocks.listAlbumsAdmin.mockResolvedValue([album({ photoIds: ["other"] })]);

    await deletePhoto("p1");

    expect(mocks.albumUpdate).not.toHaveBeenCalled();
    expect(mocks.photoDelete).toHaveBeenCalledWith("photos", "p1");
  });

  it("사진 목록에서만 빼면 커버는 그대로 둔다", async () => {
    mocks.listAlbumsAdmin.mockResolvedValue([
      album({
        photoIds: ["p1", "p2"],
        coverPhotoId: "p2",
        cover: { url: "u", path: "p", w: 1, h: 1 },
      }),
    ]);

    await deletePhoto("p1");

    expect(updatedData(0)).toMatchObject({
      photoIds: ["p2"],
      coverPhotoId: "p2",
      cover: { url: "u", path: "p", w: 1, h: 1 },
    });
  });

  it("커버 사진을 지우면 커버 스냅샷도 비운다", async () => {
    // 커버 사진이 지워지면 Storage 객체도 함께 사라진다. 스냅샷을 남기면 죽은 URL 이
    // 관리자 목록과 챗 참조 카드에 그대로 그려진다.
    mocks.listAlbumsAdmin.mockResolvedValue([
      album({
        photoIds: ["p1", "p2"],
        coverPhotoId: "p1",
        cover: { url: "dead", path: "photos/p1", w: 1, h: 1 },
      }),
    ]);

    await deletePhoto("p1");

    expect(updatedData(0)).toMatchObject({ photoIds: ["p2"], coverPhotoId: "p2", cover: null });
  });

  it("참조를 가진 앨범을 모두 갱신한다", async () => {
    mocks.listAlbumsAdmin.mockResolvedValue([
      album({ id: "a1", photoIds: ["p1"] }),
      album({ id: "a2", photoIds: ["x"] }),
      album({ id: "a3", coverPhotoId: "p1" }),
    ]);

    await deletePhoto("p1");

    expect(mocks.albumUpdate).toHaveBeenCalledTimes(2);
  });
});

describe("deletePhoto — 실패 지점", () => {
  it("앨범 정리가 실패하면 사진을 지우지 않는다", async () => {
    // 여기서 멈추면 사진이 남아 있어 같은 삭제를 그대로 다시 시도할 수 있다.
    mocks.listAlbumsAdmin.mockResolvedValue([album({ photoIds: ["p1"] })]);
    mocks.albumUpdate.mockReturnValue({ data: [], error: null });

    await expect(deletePhoto("p1")).rejects.toThrow("사진 삭제에 실패했습니다.");
    expect(mocks.photoDelete).not.toHaveBeenCalled();
  });

  it("삭제가 0행이면 RLS 거부·부재를 실패로 처리한다", async () => {
    mocks.listAlbumsAdmin.mockResolvedValue([]);
    mocks.photoDelete.mockReturnValue({ data: [], error: null });

    await expect(deletePhoto("p1")).rejects.toThrow("사진 삭제에 실패했습니다.");
  });

  it("실패하면 캐시 무효화도 동기화도 요청하지 않는다", async () => {
    mocks.listAlbumsAdmin.mockRejectedValue(new Error("목록 조회 실패"));

    await expect(deletePhoto("p1")).rejects.toThrow("사진 삭제에 실패했습니다.");
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
    expect(mocks.requestRagSync).not.toHaveBeenCalled();
  });
});

describe("deletePhoto — 성공 후처리", () => {
  it("사진과 앨범 두 태그를 함께 무효화하고 사진만 동기화한다", async () => {
    // 앨범 갱신은 참조 정리일 뿐이라 앨범 RAG 문서는 다시 만들지 않는다.
    mocks.listAlbumsAdmin.mockResolvedValue([album({ photoIds: ["p1"] })]);

    await deletePhoto("p1");

    expect(mocks.requestPublicRevalidate).toHaveBeenCalledWith(
      collectionCacheTag(COLLECTIONS.PHOTOS),
      collectionCacheTag(COLLECTIONS.ALBUMS),
    );
    expect(mocks.requestRagSync).toHaveBeenCalledExactlyOnceWith("photo", "p1");
  });
});
