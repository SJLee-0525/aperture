import { describe, expect, it } from "vitest";

import { choseongOf } from "@/lib/text/choseong";

describe("choseongOf", () => {
  it("한글 초성만 남기고 공백을 지워 어절 경계 없는 나열을 만든다", () => {
    expect(choseongOf("부산의 새벽")).toBe("ㅂㅅㅇㅅㅂ");
  });

  it("라틴 문자와 숫자는 초성 나열에 포함하지 않는다", () => {
    expect(choseongOf("광교호수공원 Canon EOS R6")).toBe("ㄱㄱㅎㅅㄱㅇ");
  });

  it("한글이 없으면 빈 문자열을 반환한다", () => {
    expect(choseongOf("Dawn in Busan")).toBe("");
  });
});
