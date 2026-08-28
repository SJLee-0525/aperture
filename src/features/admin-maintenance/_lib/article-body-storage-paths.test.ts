import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { articleBodyStoragePaths } from "@/features/admin-maintenance/_lib/article-body-storage-paths";

const ORIGIN = "https://test.supabase.co";
const PUBLIC = `${ORIGIN}/storage/v1/object/public/media`;

describe("articleBodyStoragePaths", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ORIGIN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("공개 객체 URL의 dev-blog 경로를 채집한다", () => {
    const body = `![그림](${PUBLIC}/dev-blog/a1/inline.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/inline.webp"]);
  });

  it("percent-encoding 된 파일명을 디코딩한다", () => {
    const body = `![한글](${PUBLIC}/dev-blog/a1/%EB%B0%9C%ED%91%9C%20%EC%9E%90%EB%A3%8C.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/발표 자료.webp"]);
  });

  it("query가 붙어도 경로만 읽는다", () => {
    const body = `![q](${PUBLIC}/dev-blog/a1/x.webp?width=100)`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/x.webp"]);
  });

  it("같은 경로를 여러 번 참조해도 한 번만 센다", () => {
    const url = `${PUBLIC}/dev-blog/a1/repeat.webp`;
    const body = `![하나](${url})\n\n![둘](${url})`;

    expect(articleBodyStoragePaths(body)).toEqual(["dev-blog/a1/repeat.webp"]);
  });

  it("다른 버킷·서명 URL·변환 엔드포인트는 무시한다", () => {
    const body = [
      `![다른버킷](${ORIGIN}/storage/v1/object/public/other/dev-blog/a1/x.webp)`,
      `![서명](${ORIGIN}/storage/v1/object/sign/media/dev-blog/a1/x.webp?token=t)`,
      `![변환](${ORIGIN}/storage/v1/render/image/public/media/dev-blog/a1/x.webp)`,
    ].join("\n");

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("다른 origin의 프리픽스 유사 URL을 무시한다", () => {
    const body = `![외부](https://evil.example.com/storage/v1/object/public/media/dev-blog/a1/x.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("dev-blog 프리픽스 유사 폴더를 무시한다", () => {
    const body = `![유사](${PUBLIC}/dev-blog-evil/a1/x.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("디코딩할 수 없는 URL은 무시한다", () => {
    const body = `![broken](${PUBLIC}/dev-blog/a1/bad%ZZname.webp)`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });

  it("dev-blog 밖의 경로와 이미지 없는 본문은 무시한다", () => {
    const body = `![사진](${PUBLIC}/photos/p1/main.webp)\n이미지 없는 문장`;

    expect(articleBodyStoragePaths(body)).toEqual([]);
  });
});
