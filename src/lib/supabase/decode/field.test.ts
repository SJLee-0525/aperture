import { describe, expect, it } from "vitest";

import {
  isMissingDate,
  readBoolean,
  readDate,
  readImage,
  readImageArray,
  readImageOrNull,
  readNullableDate,
  readNumber,
  readString,
  readStringArray,
  readText,
} from "@/lib/supabase/decode/field";

describe("field readers", () => {
  // `?? ` 는 null·undefined 만 막고 "3" 이나 {} 를 통과시킨다. order 에 문자열이 들어오면
  // 정렬이 NaN 을 내고 순서가 무너지는데 어디서도 오류가 나지 않는다.
  it("형이 어긋난 값을 폴백으로 바꾼다", () => {
    expect(readString(3)).toBe("");
    expect(readNumber("3")).toBe(0);
    expect(readNumber(Number.NaN)).toBe(0);
    expect(readNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(readBoolean("true")).toBe(false);
    expect(readStringArray(["a", 1, null, "b"])).toEqual(["a", "b"]);
    expect(readStringArray("a")).toEqual([]);
  });

  it("이중언어 값의 누락 면을 빈 문자열로 채운다", () => {
    expect(readText({ ko: "가" })).toEqual({ ko: "가", en: "" });
    expect(readText(null)).toEqual({ ko: "", en: "" });
    expect(readText({ ko: 1, en: 2 })).toEqual({ ko: "", en: "" });
  });

  describe("readImage", () => {
    it("url 이 없는 값은 이미지로 보지 않는다", () => {
      expect(readImageOrNull({ path: "p", w: 1, h: 2 })).toBeNull();
      expect(readImageOrNull(null)).toBeNull();
      expect(readImage(undefined)).toEqual({ url: "", path: "", w: 0, h: 0 });
    });

    it("파생본이 있으면 함께 읽고 없으면 키를 만들지 않는다", () => {
      const image = readImage({
        url: "u",
        path: "p",
        w: 4,
        h: 3,
        thumbnail: { url: "t", path: "tp", w: 1, h: 1 },
        preview: { w: 2 },
      });

      expect(image.thumbnail).toEqual({ url: "t", path: "tp", w: 1, h: 1 });
      expect("preview" in image).toBe(false);
    });

    it("배열에서 이미지가 아닌 항목을 버린다", () => {
      expect(readImageArray([{ url: "a" }, null, "b"])).toEqual([
        { url: "a", path: "", w: 0, h: 0 },
      ]);
      expect(readImageArray("a")).toEqual([]);
    });
  });

  describe("readDate", () => {
    // 폴백이 "지금"이면 같은 행을 두 번 읽을 때 값이 달라지고, 전체 문서를 되쓰는
    // 경로가 그 시각을 공연일로 영속시킨다.
    it("결측·오형 값을 epoch 로 읽고 결과가 결정적이다", () => {
      expect(readDate(undefined).getTime()).toBe(0);
      expect(readDate({}).getTime()).toBe(0);
      expect(readDate("아무것도 아님").getTime()).toBe(0);
      expect(readDate(new Date(Number.NaN)).getTime()).toBe(0);
      expect(readDate(undefined)).toEqual(readDate(undefined));
    });

    it("ISO 문자열·숫자·Date 를 모두 받는다", () => {
      const iso = "2026-03-14T10:30:00.000Z";
      expect(readDate(iso).toISOString()).toBe(iso);
      expect(readDate(0).getTime()).toBe(0);
      expect(readDate(new Date(iso)).toISOString()).toBe(iso);
    });

    it("비어 있는 것이 정상인 필드는 null 을 보존한다", () => {
      expect(readNullableDate(undefined)).toBeNull();
      expect(readNullableDate("아무것도 아님")).toBeNull();
      expect(readNullableDate("2026-03-14T00:00:00.000Z")).not.toBeNull();
    });

    it("결측 표현인지 판별한다", () => {
      expect(isMissingDate(new Date(0))).toBe(true);
      expect(isMissingDate(new Date(1))).toBe(false);
      expect(isMissingDate(0)).toBe(false);
    });
  });
});
