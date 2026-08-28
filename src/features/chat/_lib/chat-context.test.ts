import { describe, expect, it } from "vitest";

import {
  buildChatContext,
  contextTargetForPath,
  parseChatContext,
} from "@/features/chat/_lib/chat-context";

describe("parseChatContext", () => {
  it.each([
    ["photo", "/ko/photo", "photo"],
    ["work", "/ko/music", "work"],
    ["award", "/ko/music/career", "award"],
    ["project", "/en/dev/projects", "project"],
    ["album photo", "/ko/photo/albums/city-night", "photo"],
    ["legacy album photo", "/ko/photo/albums/9rhrRuIfN0eREKKOId77", "photo"],
  ])("%s 대상의 정상 문맥을 해석한다", (_, pathname, type) => {
    expect(parseChatContext({ pathname, openTarget: { type, id: "abc123" } })).toEqual({
      pathname,
      openTarget: { type, id: "abc123" },
    });
  });

  it("경로와 맞지 않는 target은 openTarget만 버리고 pathname은 유지한다", () => {
    expect(
      parseChatContext({ pathname: "/ko/dev/projects", openTarget: { type: "photo", id: "p1" } }),
    ).toEqual({ pathname: "/ko/dev/projects" });
  });

  it("모달이 없는 공개 경로는 pathname만 수용한다", () => {
    expect(parseChatContext({ pathname: "/en/photo/about" })).toEqual({
      pathname: "/en/photo/about",
    });
    expect(parseChatContext({ pathname: "/ko" })).toEqual({ pathname: "/ko" });
  });

  it.each([["../../site/config"], ["a1?key=x"], ["a 1"], ["a/1"], ["a#1"]])(
    "문서 ID로 쓸 수 없는 id(%s)는 openTarget을 버린다",
    (id) => {
      // 서버가 이 값으로 DB 행을 직접 읽으므로 경로·query 문자를 허용하지 않는다.
      expect(
        parseChatContext({ pathname: "/ko/photo", openTarget: { type: "photo", id } }),
      ).toEqual({ pathname: "/ko/photo" });
    },
  );

  it("64자를 넘는 id는 openTarget을 버린다", () => {
    expect(
      parseChatContext({
        pathname: "/ko/photo",
        openTarget: { type: "photo", id: "a".repeat(65) },
      }),
    ).toEqual({ pathname: "/ko/photo" });
  });

  it("문자열이 아니거나 빈 id는 openTarget을 버린다", () => {
    expect(
      parseChatContext({ pathname: "/ko/photo", openTarget: { type: "photo", id: 42 } }),
    ).toEqual({ pathname: "/ko/photo" });
    expect(
      parseChatContext({ pathname: "/ko/photo", openTarget: { type: "photo", id: "   " } }),
    ).toEqual({ pathname: "/ko/photo" });
  });

  it.each([
    ["로케일 없음", "/photo"],
    ["미지원 로케일", "/ja/photo"],
    ["비허용 경로", "/ko/admin/photos"],
    ["앨범 상세 중첩 경로", "/ko/photo/albums/abc/nested"],
    ["이중 slash", "/ko//photo"],
    ["query 섞임", "/ko/photo?photo=x"],
    ["fragment 섞임", "/ko/photo#top"],
    ["percent 인코딩", "/ko/photo%2Falbums"],
    ["대문자", "/ko/Photo"],
    ["길이 초과", `/ko/${"a".repeat(130)}`],
  ])("%s pathname은 문맥 전체를 버린다", (_, pathname) => {
    expect(parseChatContext({ pathname })).toBeUndefined();
  });

  it("trailing slash 하나는 정규화해 수용한다", () => {
    expect(parseChatContext({ pathname: "/ko/photo/" })).toEqual({ pathname: "/ko/photo" });
    expect(parseChatContext({ pathname: "/ko/" })).toEqual({ pathname: "/ko" });
  });

  it("record가 아니거나 pathname이 없으면 undefined", () => {
    expect(parseChatContext(undefined)).toBeUndefined();
    expect(parseChatContext("string")).toBeUndefined();
    expect(parseChatContext({ openTarget: { type: "photo", id: "x" } })).toBeUndefined();
  });

  it("photoFilters 등 미지 키는 무시한다", () => {
    expect(
      parseChatContext({
        pathname: "/ko/photo",
        photoFilters: { tag: "sea" },
        title: "주입 시도",
      }),
    ).toEqual({ pathname: "/ko/photo" });
  });
});

describe("buildChatContext", () => {
  it("현재 경로에 매핑된 modal key 하나만 읽는다", () => {
    const params = new URLSearchParams("photo=p1&work=w1&project=d1");
    expect(buildChatContext("/ko/photo", params)).toEqual({
      pathname: "/ko/photo",
      openTarget: { type: "photo", id: "p1" },
    });
    expect(buildChatContext("/ko/music", params)).toEqual({
      pathname: "/ko/music",
      openTarget: { type: "work", id: "w1" },
    });
    expect(buildChatContext("/ko/photo/albums/city-night", params)).toEqual({
      pathname: "/ko/photo/albums/city-night",
      openTarget: { type: "photo", id: "p1" },
    });
    expect(buildChatContext("/ko/photo/albums/9rhrRuIfN0eREKKOId77", params)).toEqual({
      pathname: "/ko/photo/albums/9rhrRuIfN0eREKKOId77",
      openTarget: { type: "photo", id: "p1" },
    });
  });

  it("사진 상세를 여는 네 경로가 모두 같은 target 을 만든다", () => {
    // 갤러리·앨범 상세·지도가 같은 모달을 쓴다. 경로 하나가 표에서 빠지면 그
    // 화면에서만 챗봇이 열린 사진을 모른다.
    const params = new URLSearchParams("photo=p05");

    for (const pathname of ["/ko/photo", "/ko/photo/map", "/ko/photo/albums/city-night"]) {
      expect(buildChatContext(pathname, params)).toEqual({
        pathname,
        openTarget: { type: "photo", id: "p05" },
      });
    }
  });

  it("modal 값이 없으면 openTarget을 생략한다", () => {
    expect(buildChatContext("/en/music/career", new URLSearchParams("q=test"))).toEqual({
      pathname: "/en/music/career",
    });
  });

  it("비허용 경로에서는 undefined를 반환한다", () => {
    expect(buildChatContext("/admin/photos", new URLSearchParams())).toBeUndefined();
    expect(buildChatContext("/photo", new URLSearchParams())).toBeUndefined();
  });

  it("서버 파서와 같은 정규화를 사용한다 (왕복 일치)", () => {
    const built = buildChatContext("/ko/dev/projects/", new URLSearchParams("project=d9"));
    expect(built).toEqual({
      pathname: "/ko/dev/projects",
      openTarget: { type: "project", id: "d9" },
    });
    expect(parseChatContext(built)).toEqual(built);
  });
});

describe("contextTargetForPath", () => {
  it("모달 없는 경로는 null", () => {
    expect(contextTargetForPath("/ko/photo/about")).toBeNull();
    expect(contextTargetForPath("/ko/music/media")).toBeNull();
  });

  it("지도도 사진 상세를 연다", () => {
    expect(contextTargetForPath("/ko/photo/map")).toEqual({ type: "photo", queryKey: "photo" });
  });

  it("로케일을 제거하고 매핑을 찾는다", () => {
    expect(contextTargetForPath("/en/music/career")).toEqual({
      type: "award",
      queryKey: "award",
    });
    expect(contextTargetForPath("/ko/photo/albums/city-night")).toEqual({
      type: "photo",
      queryKey: "photo",
    });
  });
});

describe("블로그 상세 화면 문맥", () => {
  const ARTICLE_PATH = "/ko/dev/articles/serverless-portfolio";

  it("등록한 화면 target 에서 문서 ID 를 읽는다", () => {
    expect(
      buildChatContext(ARTICLE_PATH, new URLSearchParams(), { type: "article", id: "a1" }),
    ).toEqual({
      pathname: ARTICLE_PATH,
      openTarget: { type: "article", id: "a1" },
    });
  });

  it("등록한 target 이 없으면 경로만 보낸다", () => {
    expect(buildChatContext(ARTICLE_PATH, new URLSearchParams())).toEqual({
      pathname: ARTICLE_PATH,
    });
  });

  it("다른 종류의 target 은 글 경로에서 쓰지 않는다", () => {
    expect(
      buildChatContext(ARTICLE_PATH, new URLSearchParams(), { type: "project", id: "p1" }),
    ).toEqual({ pathname: ARTICLE_PATH });
  });

  it("목록 경로도 화면 문맥을 허용한다", () => {
    expect(buildChatContext("/ko/dev/articles", new URLSearchParams())).toEqual({
      pathname: "/ko/dev/articles",
    });
  });

  it.each([
    ["세그먼트가 더 깊은 경로", "/ko/dev/articles/a/b"],
    ["대문자 slug", "/ko/dev/articles/Serverless"],
    ["밑줄 slug", "/ko/dev/articles/server_less"],
  ])("%s 는 화면 문맥을 만들지 않는다", (_label, pathname) => {
    expect(buildChatContext(pathname, new URLSearchParams())).toBeUndefined();
  });

  it("서버는 경로가 함의하는 종류와 다른 target 을 버린다", () => {
    expect(
      parseChatContext({ pathname: ARTICLE_PATH, openTarget: { type: "project", id: "a1" } }),
    ).toEqual({ pathname: ARTICLE_PATH });
  });
});
