import { describe, expect, it } from "vitest";

import {
  DAILY_KEY_TTL_MS,
  INCREMENT_WITH_EXPIRY_SCRIPT,
  positiveIntOr,
  retryAfterSeconds,
  utcDayBucket,
} from "@/lib/rate-limit/counter";

describe("utcDayBucket", () => {
  it("서버 타임존과 무관하게 UTC 날짜를 쓴다", () => {
    // KST 로 보면 다음 날이지만 두 시각이 같은 UTC 버킷에 들어가야 한다.
    expect(utcDayBucket(Date.parse("2026-03-14T23:59:59.000Z"))).toBe("2026-03-14");
    expect(utcDayBucket(Date.parse("2026-03-15T00:00:00.000Z"))).toBe("2026-03-15");
  });
});

describe("retryAfterSeconds", () => {
  it("남은 시간을 올림한 초로 바꾼다", () => {
    expect(retryAfterSeconds(1_001)).toBe(2);
    expect(retryAfterSeconds(2_000)).toBe(2);
  });

  it("0 초를 돌려주지 않는다", () => {
    // 0 이면 클라이언트가 즉시 재시도해 상한이 없는 것과 같아진다.
    expect(retryAfterSeconds(0)).toBe(1);
    expect(retryAfterSeconds(-5_000)).toBe(1);
    expect(retryAfterSeconds(Number.NaN)).toBe(1);
  });
});

describe("positiveIntOr", () => {
  it("양의 정수만 받고 나머지는 기본값이다", () => {
    expect(positiveIntOr("25", 50)).toBe(25);
    expect(positiveIntOr("25.9", 50)).toBe(25);
    expect(positiveIntOr(undefined, 50)).toBe(50);
    expect(positiveIntOr("", 50)).toBe(50);
    expect(positiveIntOr("0", 50)).toBe(50);
    expect(positiveIntOr("-3", 50)).toBe(50);
    expect(positiveIntOr("숫자아님", 50)).toBe(50);
  });
});

describe("공유 상수", () => {
  it("증가 스크립트가 신규 키에만 만료를 건다", () => {
    expect(INCREMENT_WITH_EXPIRY_SCRIPT).toContain('redis.call("INCR", KEYS[1])');
    expect(INCREMENT_WITH_EXPIRY_SCRIPT).toContain("if count == 1 then");
    expect(INCREMENT_WITH_EXPIRY_SCRIPT).toContain('redis.call("PEXPIRE", KEYS[1], ARGV[1])');
  });

  it("하루 버킷 만료가 자정을 넘겨 남는다", () => {
    expect(DAILY_KEY_TTL_MS).toBeGreaterThan(86_400_000);
  });
});
