import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        list: mocks.list,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/media/${path}` },
        }),
      }),
    },
  }),
}));

import {
  deleteImageStrict,
  deleteImages,
  deletePhotoImages,
  listFolderFiles,
  uploadPhotoImage,
} from "@/lib/supabase/storage";

const fileEntry = (name: string, size = 10, createdAt = "2026-08-01T00:00:00.000Z") => ({
  name,
  id: `id-${name}`,
  created_at: createdAt,
  metadata: { size },
});
const folderEntry = (name: string) => ({ name, id: null });

/** `.list()` 한 페이지 응답. */
const page = (entries: unknown[]) => ({ data: entries, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({ data: { path: "p" }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.list.mockResolvedValue(page([]));
});

describe("uploadWebp 계열", () => {
  it("uuid 경로에 contentType 명시로 올리고 공개 URL 을 조립한다", async () => {
    const result = await uploadPhotoImage("p1", new Blob(["x"]));

    expect(mocks.upload).toHaveBeenCalledTimes(1);
    const [path, , options] = mocks.upload.mock.calls[0] as [string, Blob, { contentType: string }];
    expect(path).toMatch(/^photos\/p1\/[0-9a-f-]+\.webp$/);
    expect(options.contentType).toBe("image/webp");
    expect(result.path).toBe(path);
    // 버킷명은 path 에 없다 — 기존 문서의 path 형태와 같아야 한다.
    expect(result.path.startsWith("media/")).toBe(false);
    expect(result.url).toBe(`https://test.supabase.co/storage/v1/object/public/media/${path}`);
  });

  it("업로드 오류를 사용자 메시지로 바꾼다 — getPublicUrl 은 성공을 검증하지 않는다", async () => {
    mocks.upload.mockResolvedValue({ data: null, error: { message: "Payload too large" } });

    await expect(uploadPhotoImage("p1", new Blob(["x"]))).rejects.toThrow(
      "이미지 업로드에 실패했습니다",
    );
  });
});

describe("deleteImages", () => {
  it("중복을 제거하고 한 번의 remove 로 지운다 — 없는 경로도 오류가 아니다", async () => {
    await deleteImages(["a.webp", "a.webp", "", "b.webp"]);

    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith(["a.webp", "b.webp"]);
  });

  it("1,000개를 넘으면 청크로 나눠 보낸다", async () => {
    const paths = Array.from({ length: 1001 }, (_, index) => `f-${index}.webp`);

    await deleteImages(paths);

    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect((mocks.remove.mock.calls[0][0] as string[]).length).toBe(1000);
    expect((mocks.remove.mock.calls[1][0] as string[]).length).toBe(1);
  });

  it("청크 중간 실패를 전파한다", async () => {
    mocks.remove
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    const paths = Array.from({ length: 1001 }, (_, index) => `f-${index}.webp`);

    await expect(deleteImages(paths)).rejects.toThrow("denied");
  });
});

describe("deleteImageStrict", () => {
  it("응답 목록이 비어 있지 않으면 삭제 확인으로 본다", async () => {
    mocks.remove.mockResolvedValue({ data: [{ name: "one.webp" }], error: null });

    await expect(deleteImageStrict("dev-blog/a1/one.webp")).resolves.toBeUndefined();
    expect(mocks.remove).toHaveBeenCalledWith(["dev-blog/a1/one.webp"]);
  });

  it("오류 없이 빈 목록이면(세션 만료로 RLS 가 거른 경우) 실패로 처리한다", async () => {
    mocks.remove.mockResolvedValue({ data: [], error: null });

    await expect(deleteImageStrict("dev-blog/a1/one.webp")).rejects.toThrow(
      "파일이 삭제되지 않았습니다",
    );
  });
});

describe("deleteFolder (deletePhotoImages)", () => {
  it("하위 폴더를 재귀로 내려가며 파일만 remove 한다", async () => {
    mocks.list.mockImplementation(async (folder: string) => {
      if (folder === "photos/p1")
        return page([fileEntry("main.webp"), folderEntry("previews"), folderEntry("thumbnails")]);
      if (folder === "photos/p1/previews") return page([fileEntry("pre.webp")]);
      if (folder === "photos/p1/thumbnails") return page([fileEntry("thumb.webp")]);
      return page([]);
    });

    await deletePhotoImages("p1");

    const removed = mocks.remove.mock.calls.flatMap(([paths]) => paths as string[]);
    expect(removed.sort()).toEqual([
      "photos/p1/main.webp",
      "photos/p1/previews/pre.webp",
      "photos/p1/thumbnails/thumb.webp",
    ]);
  });
});

describe("listFolderFiles", () => {
  it("폴더 항목을 파일로 세지 않고 경로·크기·시각 어댑터를 유지한다", async () => {
    mocks.list.mockImplementation(async (folder: string) => {
      if (folder === "dev-blog")
        return page([folderEntry("a1"), fileEntry("loose.webp", 5, "2026-08-02T00:00:00.000Z")]);
      if (folder === "dev-blog/a1") return page([fileEntry("cover.webp", 100)]);
      return page([]);
    });

    const files = await listFolderFiles("dev-blog");

    expect(files).toEqual([
      { path: "dev-blog/loose.webp", size: 5, createdAt: new Date("2026-08-02T00:00:00.000Z") },
      {
        path: "dev-blog/a1/cover.webp",
        size: 100,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ]);
  });

  it("정확히 한 페이지(1,000개)면 다음 페이지를 한 번 더 확인한다", async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => fileEntry(`f-${index}.webp`));
    mocks.list.mockResolvedValueOnce(page(fullPage)).mockResolvedValueOnce(page([]));

    const files = await listFolderFiles("dev-blog");

    expect(files).toHaveLength(1000);
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(mocks.list.mock.calls[1][1]).toEqual({ limit: 1000, offset: 1000 });
  });

  it("1,001개는 두 페이지로 나눠 전량을 돌려준다", async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => fileEntry(`f-${index}.webp`));
    mocks.list
      .mockResolvedValueOnce(page(fullPage))
      .mockResolvedValueOnce(page([fileEntry("last.webp")]));

    const files = await listFolderFiles("dev-blog");

    expect(files).toHaveLength(1001);
  });

  // epoch 로 폴백하면 미사용 이미지 정리의 24시간 보호창이 항상 참이 되어,
  // 방금 올려 아직 본문에 넣지 않은 파일이 최우선 삭제 대상이 된다.
  it("메타 누락값은 0 크기로 폴백하고 업로드 시각은 지금으로 본다", async () => {
    mocks.list.mockResolvedValueOnce(
      page([{ name: "broken.webp", id: "id-broken", created_at: null, metadata: null }]),
    );
    const before = Date.now();

    const [file] = await listFolderFiles("dev-blog");

    expect(file.size).toBe(0);
    expect(file.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("list 오류는 빈 결과로 위장하지 않고 던진다", async () => {
    mocks.list.mockResolvedValueOnce({ data: null, error: { message: "denied" } });

    await expect(listFolderFiles("dev-blog")).rejects.toThrow("denied");
  });
});
