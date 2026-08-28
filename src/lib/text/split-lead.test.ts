import { describe, expect, it } from "vitest";

import { splitLead } from "@/lib/text/split-lead";

describe("splitLead", () => {
  it("첫 마침표까지를 헤드라인으로 뗀다", () => {
    expect(splitLead("사진을 찍습니다. 서울에서 지냅니다.")).toEqual({
      lead: "사진을 찍습니다",
      body: "서울에서 지냅니다.",
    });
  });

  it("마침표가 없으면 전체가 헤드라인이다", () => {
    expect(splitLead("사진을 찍습니다")).toEqual({ lead: "사진을 찍습니다", body: "" });
  });

  it("마침표 뒤에 공백이 없으면 경계로 보지 않는다", () => {
    expect(splitLead("v1.2 를 씁니다")).toEqual({ lead: "v1.2 를 씁니다", body: "" });
  });

  it("첫 경계만 쓴다", () => {
    expect(splitLead("하나. 둘. 셋.").body).toBe("둘. 셋.");
  });

  it("빈 문자열도 받는다", () => {
    expect(splitLead("")).toEqual({ lead: "", body: "" });
  });
});
