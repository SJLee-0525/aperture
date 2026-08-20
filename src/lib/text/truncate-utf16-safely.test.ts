import { describe, expect, it } from "vitest";

import { truncateUtf16Safely } from "@/lib/text/truncate-utf16-safely";

/** 서로게이트 페어 하나(😀)는 code unit 두 자리를 쓴다. */
const EMOJI = "😀";

describe("truncateUtf16Safely", () => {
  it("상한 이내면 그대로 돌려준다", () => {
    expect(truncateUtf16Safely("가나다", 5)).toBe("가나다");
    expect(truncateUtf16Safely("가나다", 3)).toBe("가나다");
  });

  it("상한을 넘으면 code unit 기준으로 자른다", () => {
    expect(truncateUtf16Safely("가나다라", 2)).toBe("가나");
  });

  it("서로게이트 페어 한가운데를 자르지 않는다", () => {
    // 경계가 이모지 중간에 놓이면 한 자리를 더 뺀다.
    expect(truncateUtf16Safely(`가${EMOJI}`, 2)).toBe("가");
    // 짝이 온전히 들어가면 그대로 남는다.
    expect(truncateUtf16Safely(`가${EMOJI}나`, 3)).toBe(`가${EMOJI}`);
  });

  it("상한이 0 이하면 빈 문자열이다", () => {
    expect(truncateUtf16Safely("가나다", 0)).toBe("");
    expect(truncateUtf16Safely("가나다", -1)).toBe("");
  });
});
