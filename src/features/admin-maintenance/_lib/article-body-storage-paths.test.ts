import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("articleBodyStoragePaths — Supabase 공개 URL (M2 재작성 이후 형태)", () => {
  const ORIGIN = "https://test.supabase.co";
  const PUBLIC = `${ORIGIN}/storage/v1/object/public/media`;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ORIGIN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("공개 객체 URL 의 dev-blog/ 경로를 채집한다 — 놓치면 본문 이미지 전체가 삭제 후보가 된다", () => {
    const body = `![그림](${PUBLIC}/dev-blog/a1/inline.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/inline.webp"]);
  });

  it("percent-encoding 된 파일명을 디코딩한다", () => {
    const body = `![한글](${PUBLIC}/dev-blog/a1/%EB%B0%9C%ED%91%9C%20%EC%9E%90%EB%A3%8C.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/발표 자료.webp"]);
  });

  it("query 가 붙어도 경로만 읽는다", () => {
    const body = `![q](${PUBLIC}/dev-blog/a1/x.webp?width=100)`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/x.webp"]);
  });

  it("다른 버킷·서명 URL·변환 엔드포인트는 무시한다", () => {
    const body = [
      `![다른버킷](${ORIGIN}/storage/v1/object/public/other/dev-blog/a1/x.webp)`,
      `![서명](${ORIGIN}/storage/v1/object/sign/media/dev-blog/a1/x.webp?token=t)`,
      `![변환](${ORIGIN}/storage/v1/render/image/public/media/dev-blog/a1/x.webp)`,
    ].join("\n");

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("다른 origin 의 프리픽스 유사 URL 을 무시한다", () => {
    const body = `![외부](https://evil.example.com/storage/v1/object/public/media/dev-blog/a1/x.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("dev-blog 프리픽스 유사 폴더(dev-blog-evil/)는 무시한다", () => {
    const body = `![유사](${PUBLIC}/dev-blog-evil/a1/x.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("Firebase 형식과 Supabase 형식이 섞인 본문에서 둘 다 읽는다", () => {
    const firebase = `${HOST}/v0/b/demo.appspot.com/o/${encodeURIComponent(
      "dev-blog/a1/old.webp",
    )}?alt=media`;
    const body = `![old](${firebase})\n![new](${PUBLIC}/dev-blog/a1/new.webp)`;

    expect(articleBodyStoragePaths(body).sort()) .toEqual([
      "dev-blog/a1/new.webp",
      "dev-blog/a1/old.webp",
    ]);
  });
});
