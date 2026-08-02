// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { migrateImageThumbnails } from "@/features/admin-maintenance/_lib/migrate-image-thumbnails";
import type { ImageMeta } from "@/types/image";

const mocks = vi.hoisted(() => ({
  compressPreviewToWebp: vi.fn(),
  compressThumbnailToWebp: vi.fn(),
  currentUser: null as { getIdToken: ReturnType<typeof vi.fn> } | null,
  devList: vi.fn(),
  devUpdate: vi.fn(),
  listAlbumsAdmin: vi.fn(),
  listPhotosAdmin: vi.fn(),
  musicList: vi.fn(),
  musicUpdate: vi.fn(),
  readDimensions: vi.fn(),
  updateAlbum: vi.fn(),
  updatePhoto: vi.fn(),
  uploadDevPreview: vi.fn(),
  uploadDevThumbnail: vi.fn(),
  uploadMusicPosterPreview: vi.fn(),
  uploadMusicPosterThumbnail: vi.fn(),
  uploadPhotoPreview: vi.fn(),
  uploadPhotoThumbnail: vi.fn(),
}));

vi.mock("@/features/image-upload/_lib/compress", () => ({
  compressPreviewToWebp: mocks.compressPreviewToWebp,
  compressThumbnailToWebp: mocks.compressThumbnailToWebp,
}));
vi.mock("@/features/image-upload/_lib/read-dimensions", () => ({
  readDimensions: mocks.readDimensions,
}));
vi.mock("@/lib/firebase/albums", () => ({
  listAlbumsAdmin: mocks.listAlbumsAdmin,
  updateAlbum: mocks.updateAlbum,
}));
vi.mock("@/lib/firebase/dev", () => ({
  devProjects: { list: mocks.devList, update: mocks.devUpdate },
}));
vi.mock("@/lib/firebase/firestore", () => ({
  listPhotosAdmin: mocks.listPhotosAdmin,
  updatePhoto: mocks.updatePhoto,
}));
vi.mock("@/lib/firebase/music", () => ({
  musicWorks: { list: mocks.musicList, update: mocks.musicUpdate },
}));
vi.mock("@/lib/firebase/client", () => ({
  auth: {
    get currentUser() {
      return mocks.currentUser;
    },
  },
}));
vi.mock("@/lib/firebase/storage", () => ({
  uploadDevPreview: mocks.uploadDevPreview,
  uploadDevThumbnail: mocks.uploadDevThumbnail,
  uploadMusicPosterPreview: mocks.uploadMusicPosterPreview,
  uploadMusicPosterThumbnail: mocks.uploadMusicPosterThumbnail,
  uploadPhotoPreview: mocks.uploadPhotoPreview,
  uploadPhotoThumbnail: mocks.uploadPhotoThumbnail,
}));

const image = (
  name: string,
  thumbnail?: ImageMeta["thumbnail"],
  preview?: ImageMeta["preview"],
): ImageMeta => ({
  url: `https://images.example/${name}.webp`,
  path: `${name}.webp`,
  w: 1200,
  h: 800,
  ...(preview ? { preview } : {}),
  ...(thumbnail ? { thumbnail } : {}),
});

const preview = (name: string) => ({
  url: `https://previews.example/${name}.webp`,
  path: `previews/${name}.webp`,
  w: 960,
  h: 640,
});

const thumbnail = (name: string) => ({
  url: `https://thumbs.example/${name}.webp`,
  path: `thumbs/${name}.webp`,
  w: 320,
  h: 213,
});

const asFixture = <T>(value: unknown): T => value as T;

describe("migrateImageThumbnails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { getIdToken: vi.fn().mockResolvedValue("admin-token") };
    mocks.listPhotosAdmin.mockResolvedValue([]);
    mocks.listAlbumsAdmin.mockResolvedValue([]);
    mocks.musicList.mockResolvedValue([]);
    mocks.devList.mockResolvedValue([]);
    mocks.compressPreviewToWebp.mockResolvedValue(new Blob(["preview"], { type: "image/webp" }));
    mocks.compressThumbnailToWebp.mockResolvedValue(
      new Blob(["thumbnail"], { type: "image/webp" }),
    );
    mocks.readDimensions.mockResolvedValue({ w: 320, h: 213 });
    mocks.uploadPhotoPreview.mockResolvedValue({
      url: "https://previews.example/photo.webp",
      path: "previews/photo.webp",
    });
    mocks.uploadPhotoThumbnail.mockResolvedValue({
      url: "https://thumbs.example/photo.webp",
      path: "thumbs/photo.webp",
    });
    mocks.uploadMusicPosterPreview.mockResolvedValue({
      url: "https://previews.example/music.webp",
      path: "previews/music.webp",
    });
    mocks.uploadMusicPosterThumbnail.mockResolvedValue({
      url: "https://thumbs.example/music.webp",
      path: "thumbs/music.webp",
    });
    mocks.uploadDevPreview.mockResolvedValue({
      url: "https://previews.example/dev.webp",
      path: "previews/dev.webp",
    });
    mocks.uploadDevThumbnail.mockResolvedValue({
      url: "https://thumbs.example/dev.webp",
      path: "thumbs/dev.webp",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["source"], { type: "image/jpeg" }),
      }),
    );
  });

  it("dry-run은 누락된 썸네일과 갱신될 앨범만 집계하고 외부 쓰기를 하지 않는다", async () => {
    const readyThumbnail = thumbnail("ready");
    const readyPreview = preview("ready");
    mocks.listPhotosAdmin.mockResolvedValue([
      asFixture({ id: "photo-missing", image: image("photo-missing") }),
      asFixture({ id: "photo-ready", image: image("photo-ready", readyThumbnail, readyPreview) }),
      asFixture({ id: "photo-empty", image: { ...image("photo-empty"), url: "" } }),
    ]);
    mocks.musicList.mockResolvedValue([
      asFixture({ id: "work-missing", poster: image("work-missing") }),
      asFixture({ id: "work-ready", poster: image("work-ready", readyThumbnail, readyPreview) }),
    ]);
    mocks.devList.mockResolvedValue([
      asFixture({
        id: "project-1",
        cover: image("dev-cover"),
        images: [
          image("dev-missing"),
          image("dev-ready", readyThumbnail, readyPreview),
          { ...image("dev-empty"), url: "" },
        ],
      }),
    ]);
    mocks.listAlbumsAdmin.mockResolvedValue([
      asFixture({ id: "album-update", coverPhotoId: "photo-missing", cover: null }),
      asFixture({
        id: "album-ready",
        coverPhotoId: "photo-ready",
        cover: image("photo-ready", readyThumbnail, readyPreview),
      }),
      asFixture({ id: "album-orphan", coverPhotoId: "unknown", cover: null }),
    ]);
    const progress = vi.fn();

    await expect(migrateImageThumbnails(true, progress)).resolves.toEqual({
      albums: 1,
      devImages: 2,
      musicPosters: 1,
      photos: 1,
      completed: 4,
      pending: 5,
      percent: 44,
      total: 9,
    });

    expect(mocks.updatePhoto).not.toHaveBeenCalled();
    expect(mocks.musicUpdate).not.toHaveBeenCalled();
    expect(mocks.devUpdate).not.toHaveBeenCalled();
    expect(mocks.updateAlbum).not.toHaveBeenCalled();
    expect(progress).toHaveBeenLastCalledWith({ stage: "완료", completed: 1, total: 1 });
  });

  it("실제 실행은 모든 이미지 종류를 업로드하고 새 사진 썸네일을 앨범 커버에 반영한다", async () => {
    const photoImage = image("photo");
    mocks.listPhotosAdmin.mockResolvedValue([
      asFixture({ id: "photo-1", title: "photo", image: photoImage }),
    ]);
    mocks.musicList.mockResolvedValue([
      asFixture({ id: "work-1", title: "work", poster: image("poster") }),
    ]);
    mocks.devList.mockResolvedValue([
      asFixture({
        id: "project-1",
        title: "project",
        cover: image("dev-cover"),
        images: [image("dev-image")],
      }),
      asFixture({
        id: "project-empty",
        title: "empty",
        cover: null,
        images: [],
      }),
    ]);
    mocks.listAlbumsAdmin.mockResolvedValue([
      asFixture({ id: "album-1", title: "album", coverPhotoId: "photo-1", cover: null }),
    ]);

    await expect(migrateImageThumbnails(false)).resolves.toEqual({
      albums: 1,
      devImages: 2,
      musicPosters: 1,
      photos: 1,
      completed: 5,
      pending: 0,
      percent: 100,
      total: 5,
    });

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch).toHaveBeenCalledWith("/api/admin/image-source", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: photoImage.url }),
    });
    expect(mocks.updatePhoto).toHaveBeenCalledWith(
      "photo-1",
      expect.objectContaining({
        image: expect.objectContaining({ thumbnail: thumbnail("photo") }),
      }),
    );
    expect(mocks.musicUpdate).toHaveBeenCalledWith(
      "work-1",
      expect.objectContaining({
        poster: expect.objectContaining({
          preview: expect.objectContaining({ url: "https://previews.example/music.webp" }),
          thumbnail: thumbnail("music"),
        }),
      }),
    );
    expect(mocks.devUpdate).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        cover: expect.objectContaining({
          preview: expect.objectContaining({ url: "https://previews.example/dev.webp" }),
          thumbnail: thumbnail("dev"),
        }),
        images: [
          expect.objectContaining({
            preview: expect.objectContaining({ url: "https://previews.example/dev.webp" }),
            thumbnail: thumbnail("dev"),
          }),
        ],
      }),
    );
    expect(mocks.updateAlbum).toHaveBeenCalledWith(
      "album-1",
      expect.objectContaining({
        cover: expect.objectContaining({
          preview: expect.objectContaining({ url: "https://previews.example/photo.webp" }),
          thumbnail: thumbnail("photo"),
        }),
      }),
    );
  });

  it("기존 썸네일은 유지하고 누락된 960px 프리뷰만 생성한다", async () => {
    const existingThumbnail = thumbnail("existing");
    mocks.listPhotosAdmin.mockResolvedValue([
      asFixture({ id: "photo-1", image: image("photo", existingThumbnail) }),
    ]);

    await migrateImageThumbnails(false);

    expect(mocks.compressPreviewToWebp).toHaveBeenCalledOnce();
    expect(mocks.uploadPhotoPreview).toHaveBeenCalledOnce();
    expect(mocks.compressThumbnailToWebp).not.toHaveBeenCalled();
    expect(mocks.uploadPhotoThumbnail).not.toHaveBeenCalled();
    expect(mocks.updatePhoto).toHaveBeenCalledWith(
      "photo-1",
      expect.objectContaining({
        image: expect.objectContaining({ thumbnail: existingThumbnail }),
      }),
    );
  });

  it("관리자 인증이 없으면 이미지 다운로드 전에 중단한다", async () => {
    mocks.currentUser = null;
    mocks.listPhotosAdmin.mockResolvedValue([asFixture({ id: "photo-1", image: image("photo") })]);

    await expect(migrateImageThumbnails(false)).rejects.toThrow("관리자 로그인이 필요합니다.");
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.updatePhoto).not.toHaveBeenCalled();
  });

  it("원본 다운로드 API 오류 메시지를 그대로 전달한다", async () => {
    mocks.listPhotosAdmin.mockResolvedValue([asFixture({ id: "photo-1", image: image("photo") })]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: "원본 접근 불가" }),
      }),
    );

    await expect(migrateImageThumbnails(false)).rejects.toThrow("원본 접근 불가");
  });

  it("원본 다운로드 오류 응답이 JSON이 아니면 상태 코드를 보여준다", async () => {
    mocks.listPhotosAdmin.mockResolvedValue([asFixture({ id: "photo-1", image: image("photo") })]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("invalid json");
        },
      }),
    );

    await expect(migrateImageThumbnails(false)).rejects.toThrow("원본 이미지 다운로드 실패 (503)");
  });
});
