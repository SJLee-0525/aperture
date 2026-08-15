import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listDevArticleImageRefsAdmin: vi.fn(),
  listFolderFiles: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-list", () => ({
  listDevArticleImageRefsAdmin: mocks.listDevArticleImageRefsAdmin,
}));
vi.mock("@/lib/firebase/storage", () => ({ listFolderFiles: mocks.listFolderFiles }));
vi.mock("@/lib/firebase/client", () => ({ getFirebaseStorage: vi.fn(() => ({})) }));
vi.mock("firebase/storage", () => ({
  deleteObject: mocks.deleteObject,
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
}));

import {
  deleteOrphanArticleImages,
  scanOrphanArticleImages,
} from "@/features/admin-maintenance/_lib/find-orphan-article-images";

const NOW = new Date("2026-08-13T12:00:00.000Z");
const now = () => NOW;
/** 기준 시각에서 지정한 시간만큼 이전의 업로드 시각. */
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000);

const COVER_URL = "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/";
const bodyImage = (path: string) =>
  `![그림](${COVER_URL}${encodeURIComponent(path)}?alt=media&token=t)`;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deleteObject.mockResolvedValue(undefined);
});

describe("scanOrphanArticleImages", () => {
  it("미참조이면서 24시간이 지난 파일만 후보로 고른다", async () => {
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([
      {
        cover: {
          url: "u",
          path: "dev-blog/a1/cover.webp",
          w: 1,
          h: 1,
          preview: { url: "u", path: "dev-blog/a1/previews/p.webp", w: 1, h: 1 },
        },
        body: bodyImage("dev-blog/a1/inline.webp"),
      },
    ]);
    mocks.listFolderFiles.mockResolvedValue([
      { path: "dev-blog/a1/cover.webp", size: 100, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/previews/p.webp", size: 40, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/inline.webp", size: 90, createdAt: hoursAgo(48) },
      // 미참조 + 24시간 경과 → 후보
      { path: "dev-blog/a1/stale.webp", size: 70, createdAt: hoursAgo(25) },
      // 미참조지만 방금 올린 파일 → 작성 중 보호 창
      { path: "dev-blog/a1/uploading.webp", size: 30, createdAt: hoursAgo(1) },
    ]);

    const result = await scanOrphanArticleImages(now);

    expect(result.candidates.map((candidate) => candidate.path)).toEqual([
      "dev-blog/a1/stale.webp",
    ]);
    expect(result.totalBytes).toBe(70);
    expect(result.scannedCount).toBe(5);
  });
});

describe("deleteOrphanArticleImages", () => {
  const files = [
    { path: "dev-blog/a1/one.webp", size: 10, createdAt: hoursAgo(48) },
    { path: "dev-blog/a1/two.webp", size: 20, createdAt: hoursAgo(48) },
    { path: "dev-blog/a1/fresh-candidate.webp", size: 30, createdAt: hoursAgo(48) },
  ];

  it("확인한 경로와 재검증 후보의 교집합만 지운다", async () => {
    // 재검증 시점에는 two.webp 가 본문에 참조돼 있다 — 확인 목록에 있어도 지우면 안 된다.
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([
      { cover: null, body: bodyImage("dev-blog/a1/two.webp") },
    ]);
    mocks.listFolderFiles.mockResolvedValue(files);

    // fresh-candidate 는 재검증 후보지만 관리자가 확인한 목록에 없다 — 건드리지 않는다.
    const result = await deleteOrphanArticleImages(
      ["dev-blog/a1/one.webp", "dev-blog/a1/two.webp"],
      now,
    );

    expect(result.deleted).toEqual(["dev-blog/a1/one.webp"]);
    expect(result.skipped).toEqual(["dev-blog/a1/two.webp"]);
    expect(mocks.deleteObject).toHaveBeenCalledTimes(1);
  });

  it("파일별 실패를 격리하고 이미 없는 객체는 성공으로 친다", async () => {
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([]);
    mocks.listFolderFiles.mockResolvedValue(files);
    mocks.deleteObject
      .mockRejectedValueOnce({ code: "storage/object-not-found" })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);

    const result = await deleteOrphanArticleImages(
      files.map((file) => file.path),
      now,
    );

    expect(result.deleted).toHaveLength(2);
    expect(result.failed).toEqual([{ path: "dev-blog/a1/two.webp", message: "network" }]);
    expect(result.skipped).toEqual([]);
  });
});
