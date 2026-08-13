import { describe, expect, it } from "vitest";

import { articleBodyStoragePaths } from "@/features/admin-maintenance/_lib/article-body-storage-paths";

const HOST = "https://firebasestorage.googleapis.com";

/**
 * 실 업로더가 만드는 형태의 다운로드 URL 을 만든다.
 *
 * @param {string} path 인코딩 전 객체 경로.
 * @param {string} [query] URL 쿼리. 기본은 토큰이 붙은 실 서비스 형태.
 * @returns {string} `…/o/{encoded}?{query}` 다운로드 URL.
 */
const downloadUrl = (path: string, query = "alt=media&token=abc123"): string =>
  `${HOST}/v0/b/demo.appspot.com/o/${encodeURIComponent(path)}?${query}`;

describe("articleBodyStoragePaths", () => {
  it("percent-encoding 된 경로를 디코딩해 돌려준다", () => {
    const body = `본문 ![대체](${downloadUrl("dev-blog/a1/cover.webp")})`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/cover.webp"]);
  });

  it("공백·한글 파일명을 디코딩한다", () => {
    const body = `![한글](${downloadUrl("dev-blog/a1/발표 자료.webp")})`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/발표 자료.webp"]);
  });

  it("잘못된 % 인코딩은 건너뛴다", () => {
    const body = `![broken](${HOST}/v0/b/demo.appspot.com/o/dev-blog%2Fa1%2Fbad%ZZname.webp?alt=media)`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("허용 Storage 호스트가 아닌 URL 은 무시한다", () => {
    const body = `![외부](https://example.com/v0/b/demo/o/dev-blog%2Fa1%2Fx.webp?alt=media)`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("허용 호스트라도 dev-blog/ 밖의 경로는 무시한다", () => {
    const body = `![사진](${downloadUrl("photos/p1/main.webp")})`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("같은 경로를 여러 번 참조해도 한 번만 센다", () => {
    const url = downloadUrl("dev-blog/a1/repeat.webp");
    const body = `![하나](${url})\n\n![둘](${url})`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/repeat.webp"]);
  });

  it("mock fixture 가 만드는 URL 형식도 읽는다", () => {
    // `mock-article-uploader` 의 주소 — 쿼리에 토큰이 없다.
    const body = `![mock](${HOST}/v0/b/mock.appspot.com/o/${encodeURIComponent(
      "dev-blog/draft-1/1-screenshot.webp",
    )}?alt=media)`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/draft-1/1-screenshot.webp"]);
  });

  it("이미지가 없는 본문은 빈 목록이다", () => {
    expect(articleBodyStoragePaths("이미지 없는 본문")).toEqual([]);
  });
});
