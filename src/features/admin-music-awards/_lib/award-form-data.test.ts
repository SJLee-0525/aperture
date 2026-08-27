import { describe, expect, it } from "vitest";

import {
  awardToInput,
  emptyAwardInput,
  prepareAwardInput,
} from "@/features/admin-music-awards/_lib/award-form-data";

import type { MusicAward } from "@/types/music";

const award = (): MusicAward => ({
  id: "a1",
  year: 2024,
  name: { ko: "쇼팽 콩쿠르", en: "Chopin Competition" },
  place: "Warsaw, PL",
  description: { ko: "", en: "" },
  order: 3,
  published: true,
});

describe("awardToInput", () => {
  it("문서 id 를 빼고 연도를 문자열로 바꾼다", () => {
    const input = awardToInput(award());

    expect(input).not.toHaveProperty("id");
    expect(input.year).toBe("2024");
  });

  it("연도가 0 인 구형 행은 빈 칸으로 읽는다", () => {
    expect(awardToInput({ ...award(), year: 0 }).year).toBe("");
  });
});

describe("prepareAwardInput", () => {
  it("연도를 숫자로 되돌리고 장소의 공백을 턴다", () => {
    const prepared = prepareAwardInput({ ...emptyAwardInput(), year: "1999", place: "  Seoul  " });

    expect(prepared.year).toBe(1999);
    expect(prepared.place).toBe("Seoul");
  });
});

describe("emptyAwardInput", () => {
  it("연도 기본값이 문자열이라 입력란을 비울 수 있다", () => {
    expect(typeof emptyAwardInput().year).toBe("string");
  });
});
