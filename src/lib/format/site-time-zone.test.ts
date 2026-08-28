import { describe, expect, it } from "vitest";

import { instantFromSiteWallClock, siteWallClock } from "@/lib/format/site-time-zone";

describe("site-time-zone", () => {
  it("인스턴트를 KST 벽시계로 읽는다", () => {
    expect(siteWallClock(new Date("2026-03-13T22:30:15.000Z"))).toEqual({
      year: 2026,
      month: 3,
      day: 14,
      hour: 7,
      minute: 30,
      second: 15,
    });
  });

  it("KST 자정을 24시가 아니라 0시로 읽는다", () => {
    expect(siteWallClock(new Date("2026-03-13T15:00:00.000Z")).hour).toBe(0);
  });

  // 같은 EXIF 원문이 업로드한 기기의 타임존에 따라 다른 인스턴트가 되면 안 된다.
  it("벽시계 값을 KST 인스턴트로 되돌린다", () => {
    const instant = instantFromSiteWallClock({
      year: 2026,
      month: 3,
      day: 14,
      hour: 7,
      minute: 30,
      second: 15,
    });

    expect(instant.toISOString()).toBe("2026-03-13T22:30:15.000Z");
  });

  it("두 변환이 서로의 역함수다", () => {
    const wall = { year: 2025, month: 12, day: 31, hour: 23, minute: 59, second: 59 };

    expect(siteWallClock(instantFromSiteWallClock(wall))).toEqual(wall);
  });
});
