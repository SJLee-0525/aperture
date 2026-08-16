import { describe, expect, it } from "vitest";

import {
  groupArticleImageFiles,
  groupStartedAt,
} from "@/features/admin-maintenance/_lib/group-article-image-files";

import type { ArticleImageGroup } from "@/features/admin-maintenance/_lib/group-article-image-files";

const BASE = new Date("2026-08-13T12:00:00.000Z");
/** 기준 시각에서 지정한 초만큼 뒤의 업로드 시각. */
const secondsLater = (seconds: number) => new Date(BASE.getTime() + seconds * 1000);

const file = (path: string, seconds: number, size = 10) => ({
  path,
  url: `https://cdn.test/media/${path}`,
  size,
  uploadedAt: secondsLater(seconds),
});

const pathsOf = (group: ArticleImageGroup) => group.files.map((member) => member.path);

describe("groupArticleImageFiles", () => {
  it("파일명 asset ID 가 같은 세 변형을 원본 순서로 묶는다", () => {
    const groups = groupArticleImageFiles([
      file("dev-blog/a1/thumbnails/asset-1.webp", 1, 20),
      file("dev-blog/a1/asset-1.webp", 4, 400),
      file("dev-blog/a1/previews/asset-1.webp", 2, 100),
    ]);

    expect(groups).toHaveLength(1);
    expect(pathsOf(groups[0])).toEqual([
      "dev-blog/a1/asset-1.webp",
      "dev-blog/a1/previews/asset-1.webp",
      "dev-blog/a1/thumbnails/asset-1.webp",
    ]);
    expect(groups[0].estimated).toBe(false);
    expect(groupStartedAt(groups[0])).toBe(secondsLater(1).getTime());
  });

  it("업로드 시각이 겹쳐도 asset ID 가 다르면 섞지 않는다", () => {
    const groups = groupArticleImageFiles([
      file("dev-blog/a1/previews/asset-1.webp", 0),
      file("dev-blog/a1/previews/asset-2.webp", 0),
      file("dev-blog/a1/thumbnails/asset-2.webp", 0),
      file("dev-blog/a1/thumbnails/asset-1.webp", 0),
    ]);

    expect(groups.map(pathsOf)).toEqual([
      ["dev-blog/a1/previews/asset-1.webp", "dev-blog/a1/thumbnails/asset-1.webp"],
      ["dev-blog/a1/previews/asset-2.webp", "dev-blog/a1/thumbnails/asset-2.webp"],
    ]);
    expect(groups.every((group) => group.estimated)).toBe(false);
  });

  it("가장 작은 파생본을 마지막 원소로 둔다", () => {
    const [withThumbnail] = groupArticleImageFiles([
      file("dev-blog/a1/asset-1.webp", 0),
      file("dev-blog/a1/thumbnails/asset-1.webp", 0),
    ]);
    const [previewOnly] = groupArticleImageFiles([
      file("dev-blog/a2/asset-2.webp", 0),
      file("dev-blog/a2/previews/asset-2.webp", 0),
    ]);

    expect(withThumbnail.files.at(-1)?.path).toBe("dev-blog/a1/thumbnails/asset-1.webp");
    expect(previewOnly.files.at(-1)?.path).toBe("dev-blog/a2/previews/asset-2.webp");
  });

  it("asset ID 를 공유하지 않는 구형 파일은 업로드 시각으로 묶고 추정으로 표시한다", () => {
    const groups = groupArticleImageFiles([
      file("dev-blog/a1/thumbnails/old-t.webp", 0),
      file("dev-blog/a1/previews/old-p.webp", 1),
    ]);

    expect(groups).toHaveLength(1);
    expect(pathsOf(groups[0])).toEqual([
      "dev-blog/a1/previews/old-p.webp",
      "dev-blog/a1/thumbnails/old-t.webp",
    ]);
    expect(groups[0].estimated).toBe(true);
  });

  it("구형 파일에서 같은 변형이 또 오면 다음 이미지로 본다", () => {
    const groups = groupArticleImageFiles([
      file("dev-blog/a1/thumbnails/old-t1.webp", 0),
      file("dev-blog/a1/previews/old-p1.webp", 1),
      file("dev-blog/a1/thumbnails/old-t2.webp", 20),
      file("dev-blog/a1/previews/old-p2.webp", 21),
    ]);

    expect(groups.map(pathsOf)).toEqual([
      ["dev-blog/a1/previews/old-p1.webp", "dev-blog/a1/thumbnails/old-t1.webp"],
      ["dev-blog/a1/previews/old-p2.webp", "dev-blog/a1/thumbnails/old-t2.webp"],
    ]);
  });

  it("구형 파일이 1분을 넘겨 올라왔으면 묶지 않는다", () => {
    const groups = groupArticleImageFiles([
      file("dev-blog/a1/thumbnails/old-t.webp", 0),
      file("dev-blog/a1/old-m.webp", 61),
    ]);

    expect(groups.map(pathsOf)).toEqual([
      ["dev-blog/a1/thumbnails/old-t.webp"],
      ["dev-blog/a1/old-m.webp"],
    ]);
    expect(groups.every((group) => group.estimated)).toBe(false);
  });

  it("글 폴더가 다르면 파일명이 같아도 묶지 않는다", () => {
    const groups = groupArticleImageFiles([
      file("dev-blog/a1/thumbnails/asset-1.webp", 0),
      file("dev-blog/a2/asset-1.webp", 0),
    ]);

    expect(groups).toHaveLength(2);
  });
});
