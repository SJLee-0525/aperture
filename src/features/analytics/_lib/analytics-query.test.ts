import { describe, expect, it } from "vitest";

import { analyticsQuery } from "@/features/analytics/_lib/analytics-query";

describe("analyticsQuery", () => {
  it("딥링크 id 파라미터는 남긴다", () => {
    expect(analyticsQuery("photo=p01")).toBe("photo=p01");
    expect(analyticsQuery("project=aperture&work=w01")).toBe("project=aperture&work=w01");
  });

  it("검색어는 보내지 않는다", () => {
    expect(analyticsQuery("q=%EB%B0%94%EB%8B%A4")).toBe("");
    expect(analyticsQuery("q=sea&photo=p01")).toBe("photo=p01");
  });

  it("허용 목록 밖 파라미터는 기본적으로 버린다", () => {
    expect(analyticsQuery("tag=sea&camera=Leica+Q3&utm_source=x")).toBe("");
  });

  it("URLSearchParams 도 그대로 받는다", () => {
    expect(analyticsQuery(new URLSearchParams({ album: "city-night", q: "밤" }))).toBe(
      "album=city-night",
    );
  });

  it("남길 값이 없으면 빈 문자열이다", () => {
    expect(analyticsQuery("")).toBe("");
  });

  it("같은 화면은 항상 같은 문자열을 만든다", () => {
    expect(analyticsQuery("photo=p01&q=sea&album=a1")).toBe(analyticsQuery("photo=p01&album=a1"));
  });
});
