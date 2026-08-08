import { describe, expect, it } from "vitest";

import {
  emptyWorkInput,
  fromDateValue,
  prepareWorkInput,
  toDateValue,
  workToInput,
} from "@/features/admin-music-works/_lib/work-form-data";
import { MOCK_MUSIC_WORKS } from "@/mocks/music";

describe("연주일 폼 변환", () => {
  it("로컬 Date를 YYYY-MM-DD 값으로 변환한다", () => {
    expect(toDateValue(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("YYYY-MM-DD 값을 로컬 자정 Date로 변환한다", () => {
    const date = fromDateValue("2026-12-09");

    expect([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ]).toEqual([2026, 11, 9, 0, 0]);
  });

  it("유효한 날짜는 폼 값 왕복 후 같은 연월일을 유지한다", () => {
    const source = new Date(2028, 1, 29, 18, 30);

    expect(toDateValue(fromDateValue(toDateValue(source)))).toBe("2028-02-29");
  });
});

describe("prepareWorkInput", () => {
  it("프로그램 곡명의 앞뒤 공백과 빈 항목을 정리한다", () => {
    const form = {
      ...emptyWorkInput(),
      program: ["  Gute Nacht ", "", " \t ", "Der Lindenbaum"],
    };

    expect(prepareWorkInput(form).program).toEqual(["Gute Nacht", "Der Lindenbaum"]);
  });

  it("원본 연주 폼과 프로그램 배열을 변경하지 않는다", () => {
    const form = { ...emptyWorkInput(), program: ["  Piece  "] };

    const prepared = prepareWorkInput(form);

    expect(form.program).toEqual(["  Piece  "]);
    expect(prepared).not.toBe(form);
    expect(prepared.program).not.toBe(form.program);
  });

  it("예매 링크는 HTTPS 또는 내부 경로만 허용한다", () => {
    expect(
      prepareWorkInput({ ...emptyWorkInput(), ticketUrl: " https://tickets.example.com " })
        .ticketUrl,
    ).toBe("https://tickets.example.com");
    expect(() =>
      prepareWorkInput({ ...emptyWorkInput(), ticketUrl: "javascript:alert(1)" }),
    ).toThrow("예매 링크");
  });
});

describe("연주 폼 초안", () => {
  it("신규 연주에 빈 비공개 초안을 만든다", () => {
    expect(emptyWorkInput()).toMatchObject({
      title: { ko: "", en: "" },
      program: [],
      poster: { url: "", path: "", w: 0, h: 0 },
      order: 0,
      published: false,
    });
  });

  it("기존 연주에서 문서 id만 제외한다", () => {
    const work = MOCK_MUSIC_WORKS[0];

    expect(workToInput(work)).toEqual(
      Object.fromEntries(Object.entries(work).filter(([key]) => key !== "id")),
    );
  });
});
