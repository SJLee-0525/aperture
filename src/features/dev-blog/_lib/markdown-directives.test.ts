import { describe, expect, it } from "vitest";

import {
  extractYouTubeVideoId,
  resolveArticleDirective,
} from "@/features/dev-blog/_lib/markdown-directives";

const VIDEO_ID = "kX3nB7dQ2Ls";

describe("extractYouTubeVideoId", () => {
  it("watch·단축·embed·shorts 주소에서 영상 ID 를 뽑는다", () => {
    [
      `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      `https://m.youtube.com/watch?v=${VIDEO_ID}&t=30s`,
      `https://youtu.be/${VIDEO_ID}`,
      `https://www.youtube.com/embed/${VIDEO_ID}`,
      `https://www.youtube.com/shorts/${VIDEO_ID}`,
    ].forEach((url) => expect(extractYouTubeVideoId(url)).toBe(VIDEO_ID));
  });

  it("다른 호스트와 길이가 맞지 않는 ID 를 거부한다", () => {
    [
      `https://vimeo.com/${VIDEO_ID}`,
      "https://www.youtube.com/watch?v=tooshort",
      "https://www.youtube.com/",
      "javascript:alert(1)",
      "그냥 문장",
      "",
    ].forEach((url) => expect(extractYouTubeVideoId(url)).toBeNull());
  });
});

describe("resolveArticleDirective", () => {
  it("caption 은 평문을 그대로 쓰고 빈 값은 거부한다", () => {
    expect(resolveArticleDirective("caption", " 압축 결과 비교 ", {})).toEqual({
      kind: "caption",
      text: "압축 결과 비교",
    });
    expect(resolveArticleDirective("caption", "   ", {})).toEqual({
      kind: "issue",
      code: "caption-empty",
    });
  });

  it("youtube 는 제목이 있어야 통과한다", () => {
    expect(
      resolveArticleDirective("youtube", `https://youtu.be/${VIDEO_ID}`, {
        title: "배포 흐름 데모",
        source: "직접 녹화",
      }),
    ).toEqual({ kind: "youtube", videoId: VIDEO_ID, title: "배포 흐름 데모", source: "직접 녹화" });

    expect(
      resolveArticleDirective("youtube", `https://youtu.be/${VIDEO_ID}`, { title: " " }),
    ).toEqual({ kind: "issue", code: "youtube-title-missing", detail: VIDEO_ID });
  });

  it("출처는 선택값이라 없으면 null 이다", () => {
    expect(
      resolveArticleDirective("youtube", `https://youtu.be/${VIDEO_ID}`, { title: "제목" }),
    ).toMatchObject({ source: null });
  });

  it("영상 ID 를 뽑을 수 없는 주소는 issue 가 된다", () => {
    expect(resolveArticleDirective("youtube", "https://vimeo.com/123", { title: "제목" })).toEqual({
      kind: "issue",
      code: "youtube-url-invalid",
      detail: "https://vimeo.com/123",
    });
  });

  it("모르는 이름은 지시자로 받아들이지 않는다", () => {
    expect(resolveArticleDirective("iframe", "https://example.com", {})).toEqual({
      kind: "issue",
      code: "unknown-directive",
      detail: "iframe",
    });
  });
});
