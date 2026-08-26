import { afterEach, describe, expect, it } from "vitest";

import {
  formatEventYMD,
  formatLocalTimestamp,
  formatLocalYMD,
  formatShotAt,
} from "@/lib/format/format-date";

/**
 * 벽시계성 날짜는 보는 기기의 타임존에 흔들리면 안 된다. process.env.TZ 를 바꾸면
 * 이미 만들어진 Intl 포맷터는 그대로이므로, 여기서는 인스턴트를 직접 지정해
 * "이 인스턴트를 KST 로 읽는다"를 검증한다.
 */
describe("format-date", () => {
  afterEach(() => {
    delete process.env.TZ;
  });

  describe("벽시계성 날짜 — 사이트 타임존 고정", () => {
    // 07:30 KST 는 전날 22:30 UTC 다. 뷰어 타임존으로 읽으면 날짜까지 하루 어긋난다.
    it("EXIF 촬영일시를 KST 벽시계로 표시한다", () => {
      expect(formatShotAt(new Date("2026-03-13T22:30:00.000Z"))).toBe("2026·03·14 · 07:30");
    });

    it("자정 직후 인스턴트도 KST 날짜로 표시한다", () => {
      expect(formatShotAt(new Date("2026-03-13T15:00:00.000Z"))).toBe("2026·03·14 · 00:00");
    });

    // 09:00 KST 이전 공연은 UTC 로 읽으면 하루 전이 된다. SSR 과 hydration 이 갈리는 지점.
    it("09:00 KST 이전 인스턴트도 같은 날짜를 낸다", () => {
      expect(formatEventYMD(new Date("2026-03-13T20:00:00.000Z"))).toBe("2026.03.14");
    });

    it("연말 경계에서 연도가 밀리지 않는다", () => {
      expect(formatEventYMD(new Date("2025-12-31T15:00:00.000Z"))).toBe("2026.01.01");
    });
  });

  describe("관리자 시각 — 보는 기기의 로컬", () => {
    // "방금 저장했다"는 피드백은 관리자의 손목시계와 맞아야 한다.
    it("로컬 게터를 그대로 쓴다", () => {
      const local = new Date(2026, 2, 14, 7, 30);

      expect(formatLocalTimestamp(local)).toBe("2026·03·14 · 07:30");
      expect(formatLocalYMD(local)).toBe("2026.03.14");
    });
  });
});
