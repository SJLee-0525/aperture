import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listDevArticleImageRefsAdmin: vi.fn(),
  listFolderFiles: vi.fn(),
  deleteImageStrict: vi.fn(),
  publicImageUrl: vi.fn((path: string) => `https://cdn.test/media/${path}`),
}));

vi.mock("@/lib/supabase/admin-list", () => ({
  listDevArticleImageRefsAdmin: mocks.listDevArticleImageRefsAdmin,
}));
vi.mock("@/lib/supabase/storage", () => ({
  listFolderFiles: mocks.listFolderFiles,
  deleteImageStrict: mocks.deleteImageStrict,
  publicImageUrl: mocks.publicImageUrl,
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
  mocks.deleteImageStrict.mockResolvedValue(undefined);
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

    expect(result.groups.flatMap((group) => group.paths)).toEqual(["dev-blog/a1/stale.webp"]);
    expect(result.totalBytes).toBe(70);
    expect(result.scannedCount).toBe(5);
  });

  it("본문이 원본을 참조하면 같은 벌의 프리뷰·썸네일도 정리 대상이 아니다", async () => {
    // 본문 Markdown 은 원본 주소만 저장한다. 파일 단위로 보면 파생본 둘이 미참조다.
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([
      { cover: null, body: bodyImage("dev-blog/a1/asset-1.webp") },
    ]);
    mocks.listFolderFiles.mockResolvedValue([
      { path: "dev-blog/a1/asset-1.webp", size: 400, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/previews/asset-1.webp", size: 100, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/thumbnails/asset-1.webp", size: 20, createdAt: hoursAgo(48) },
    ]);

    const result = await scanOrphanArticleImages(now);

    expect(result.groups).toEqual([]);
    expect(result.totalBytes).toBe(0);
    expect(result.keptFiles).toEqual([
      { path: "dev-blog/a1/previews/asset-1.webp", size: 100 },
      { path: "dev-blog/a1/thumbnails/asset-1.webp", size: 20 },
    ]);
    expect(result.keptBytes).toBe(120);
  });

  it("24시간이 안 된 파일은 함께 유지한 파일 목록에 넣지 않는다", async () => {
    // 그룹에 참조된 파일이 있어도, 방금 올라온 파일까지 수동 삭제 대상으로 안내하면
    // 자동 삭제가 지키는 보호창이 뚫린다.
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([
      { cover: null, body: bodyImage("dev-blog/a1/asset-1.webp") },
    ]);
    mocks.listFolderFiles.mockResolvedValue([
      { path: "dev-blog/a1/asset-1.webp", size: 400, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/previews/asset-1.webp", size: 100, createdAt: hoursAgo(48) },
      // 파생본 하나가 늦게 도착했다.
      { path: "dev-blog/a1/thumbnails/asset-1.webp", size: 20, createdAt: hoursAgo(2) },
    ]);

    const result = await scanOrphanArticleImages(now);

    expect(result.groups).toEqual([]);
    expect(result.keptFiles).toEqual([{ path: "dev-blog/a1/previews/asset-1.webp", size: 100 }]);
    expect(result.keptBytes).toBe(100);
  });

  it("본문에서 그 이미지를 빼면 세 파일이 한 그룹으로 정리 대상이 된다", async () => {
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([{ cover: null, body: "본문만 남았다" }]);
    mocks.listFolderFiles.mockResolvedValue([
      { path: "dev-blog/a1/asset-1.webp", size: 400, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/previews/asset-1.webp", size: 100, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/thumbnails/asset-1.webp", size: 20, createdAt: hoursAgo(48) },
    ]);

    const result = await scanOrphanArticleImages(now);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].paths).toEqual([
      "dev-blog/a1/asset-1.webp",
      "dev-blog/a1/previews/asset-1.webp",
      "dev-blog/a1/thumbnails/asset-1.webp",
    ]);
    expect(result.groups[0].previewUrl).toBe(
      "https://cdn.test/media/dev-blog/a1/thumbnails/asset-1.webp",
    );
    expect(result.groups[0].size).toBe(520);
    expect(result.groups[0].estimated).toBe(false);
    expect(result.keptFiles).toEqual([]);
  });

  it("대표 이미지 한 벌은 세 파일 모두 참조돼 정리 대상이 아니다", async () => {
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([
      {
        cover: {
          url: "u",
          path: "dev-blog/a1/asset-1.webp",
          w: 1,
          h: 1,
          preview: { url: "u", path: "dev-blog/a1/previews/asset-1.webp", w: 1, h: 1 },
          thumbnail: { url: "u", path: "dev-blog/a1/thumbnails/asset-1.webp", w: 1, h: 1 },
        },
        body: "",
      },
    ]);
    mocks.listFolderFiles.mockResolvedValue([
      { path: "dev-blog/a1/asset-1.webp", size: 400, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/previews/asset-1.webp", size: 100, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/thumbnails/asset-1.webp", size: 20, createdAt: hoursAgo(48) },
    ]);

    const result = await scanOrphanArticleImages(now);

    expect(result.groups).toEqual([]);
    expect(result.keptFiles).toEqual([]);
  });

  it("그룹의 한 파일이라도 24시간이 안 됐으면 그룹 전체를 남긴다", async () => {
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([]);
    mocks.listFolderFiles.mockResolvedValue([
      { path: "dev-blog/a1/asset-1.webp", size: 400, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/previews/asset-1.webp", size: 100, createdAt: hoursAgo(48) },
      // 파생본 하나만 늦게 도착했다 — 아직 작성 중일 수 있다.
      { path: "dev-blog/a1/thumbnails/asset-1.webp", size: 20, createdAt: hoursAgo(2) },
    ]);

    const result = await scanOrphanArticleImages(now);

    expect(result.groups).toEqual([]);
    // 참조된 파일이 없어 남긴 것이라 '함께 유지한 파일' 집계에도 들어가지 않는다.
    expect(result.keptFiles).toEqual([]);
  });
});

describe("deleteOrphanArticleImages", () => {
  const files = [
    { path: "dev-blog/a1/one.webp", size: 10, createdAt: hoursAgo(48) },
    { path: "dev-blog/a1/two.webp", size: 20, createdAt: hoursAgo(48) },
    { path: "dev-blog/a1/fresh-candidate.webp", size: 30, createdAt: hoursAgo(48) },
  ];

  it("확인 후 그룹의 한 파일이 참조되면 같은 그룹을 통째로 지우지 않는다", async () => {
    const group = [
      { path: "dev-blog/a1/asset-1.webp", size: 400, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/previews/asset-1.webp", size: 100, createdAt: hoursAgo(48) },
      { path: "dev-blog/a1/thumbnails/asset-1.webp", size: 20, createdAt: hoursAgo(48) },
    ];
    // 관리자가 확인할 때는 셋 다 미참조였다.
    mocks.listDevArticleImageRefsAdmin.mockResolvedValueOnce([]);
    mocks.listFolderFiles.mockResolvedValue(group);
    const confirmed = (await scanOrphanArticleImages(now)).groups.flatMap((each) => each.paths);
    expect(confirmed).toHaveLength(3);

    // 삭제 재검사 시점에는 원본이 다시 본문에 들어가 있다.
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([
      { cover: null, body: bodyImage("dev-blog/a1/asset-1.webp") },
    ]);

    const result = await deleteOrphanArticleImages(confirmed, now);

    expect(result.skipped).toEqual(confirmed);
    expect(result.deleted).toEqual([]);
    expect(mocks.deleteImageStrict).not.toHaveBeenCalled();
  });

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
    expect(mocks.deleteImageStrict).toHaveBeenCalledTimes(1);
    expect(mocks.deleteImageStrict).toHaveBeenCalledWith("dev-blog/a1/one.webp");
  });

  it("파일별 실패를 격리한다 — 삭제 미확인은 그 파일만 실패로 보고한다", async () => {
    mocks.listDevArticleImageRefsAdmin.mockResolvedValue([]);
    mocks.listFolderFiles.mockResolvedValue(files);
    mocks.deleteImageStrict.mockImplementation(async (path: string) => {
      if (path === "dev-blog/a1/two.webp") throw new Error("network");
    });

    const result = await deleteOrphanArticleImages(
      files.map((file) => file.path),
      now,
    );

    expect(result.deleted).toHaveLength(2);
    expect(result.failed).toEqual([{ path: "dev-blog/a1/two.webp", message: "network" }]);
    expect(result.skipped).toEqual([]);
  });
});
