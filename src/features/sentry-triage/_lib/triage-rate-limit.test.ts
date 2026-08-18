import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DAILY_LIMIT,
  getTriageRateLimiter,
} from "@/features/sentry-triage/_lib/triage-rate-limit";

const UPSTASH = { UPSTASH_REDIS_REST_URL: "https://u", UPSTASH_REDIS_REST_TOKEN: "t" };
const KV = { KV_REST_API_URL: "https://kv", KV_REST_API_TOKEN: "t2" };

const counted = (count: number) => new Response(JSON.stringify({ result: count }), { status: 200 });

const NOW = Date.UTC(2026, 7, 19, 3, 0, 0);

const limiterWith = (
  fetcher: typeof fetch,
  env: Record<string, string | undefined> = UPSTASH,
  limit = 3,
) => getTriageRateLimiter(env, { fetcher, limit, now: () => NOW });

const calls = (mock: { mock: { calls: unknown[] } }) =>
  mock.mock.calls as unknown as [string, RequestInit][];

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getTriageRateLimiter", () => {
  it("상한 안이면 통과시키고 횟수를 돌려준다", async () => {
    const fetcher = vi.fn(async () => counted(2));

    await expect(limiterWith(fetcher as unknown as typeof fetch)()).resolves.toEqual({
      allowed: true,
      count: 2,
    });
  });

  it("상한과 같은 횟수까지 허용한다", async () => {
    const fetcher = vi.fn(async () => counted(3));

    await expect(limiterWith(fetcher as unknown as typeof fetch)()).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("상한을 넘으면 막는다", async () => {
    const fetcher = vi.fn(async () => counted(4));

    await expect(limiterWith(fetcher as unknown as typeof fetch)()).resolves.toEqual({
      allowed: false,
      count: 4,
    });
  });

  it("UTC 날짜를 키에 넣는다", async () => {
    const fetcher = vi.fn(async () => counted(1));
    await limiterWith(fetcher as unknown as typeof fetch)();

    const body = JSON.parse(calls(fetcher)[0][1].body as string);
    expect(body[3]).toBe("sentry-triage:daily:v1:2026-08-19");
  });

  it("INCR 과 만료를 한 스크립트로 보낸다", async () => {
    const fetcher = vi.fn(async () => counted(1));
    await limiterWith(fetcher as unknown as typeof fetch)();

    const body = JSON.parse(calls(fetcher)[0][1].body as string);
    expect(body[0]).toBe("EVAL");
    expect(body[1]).toContain("INCR");
    expect(body[1]).toContain("PEXPIRE");
  });

  it("토큰을 Authorization 헤더로 보낸다", async () => {
    const fetcher = vi.fn(async () => counted(1));
    await limiterWith(fetcher as unknown as typeof fetch)();

    const headers = calls(fetcher)[0][1].headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer t");
  });

  describe("실패 시 통과", () => {
    it("자격증명이 없으면 세지 않고 통과시킨다", async () => {
      const fetcher = vi.fn();
      const limiter = getTriageRateLimiter({}, { fetcher: fetcher as unknown as typeof fetch });

      await expect(limiter()).resolves.toEqual({ allowed: true, count: 0 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("네트워크 오류에도 통과시킨다", async () => {
      const fetcher = vi.fn(async () => {
        throw new Error("down");
      });

      await expect(limiterWith(fetcher as unknown as typeof fetch)()).resolves.toEqual({
        allowed: true,
        count: 0,
      });
    });

    it("HTTP 오류에도 통과시킨다", async () => {
      const fetcher = vi.fn(async () => new Response("nope", { status: 401 }));

      await expect(limiterWith(fetcher as unknown as typeof fetch)()).resolves.toMatchObject({
        allowed: true,
      });
    });

    it("응답 본문이 깨져도 통과시킨다", async () => {
      const fetcher = vi.fn(async () => new Response("not json", { status: 200 }));

      await expect(limiterWith(fetcher as unknown as typeof fetch)()).resolves.toMatchObject({
        allowed: true,
      });
    });

    it("Upstash 가 오류를 담아 보내도 통과시킨다", async () => {
      const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "ERR" })));

      await expect(limiterWith(fetcher as unknown as typeof fetch)()).resolves.toMatchObject({
        allowed: true,
      });
    });
  });

  describe("자격증명 해석", () => {
    it("Upstash 설정을 먼저 쓴다", async () => {
      const fetcher = vi.fn(async () => counted(1));
      await limiterWith(fetcher as unknown as typeof fetch, { ...UPSTASH, ...KV })();

      expect(calls(fetcher)[0][0]).toBe("https://u");
    });

    it("Upstash 가 없으면 Marketplace 값을 쓴다", async () => {
      const fetcher = vi.fn(async () => counted(1));
      await limiterWith(fetcher as unknown as typeof fetch, KV)();

      expect(calls(fetcher)[0][0]).toBe("https://kv");
    });

    it("토큰만 있고 URL 이 없으면 설정되지 않은 것으로 본다", async () => {
      const fetcher = vi.fn();
      const limiter = getTriageRateLimiter(
        { UPSTASH_REDIS_REST_TOKEN: "t" },
        { fetcher: fetcher as unknown as typeof fetch },
      );

      await expect(limiter()).resolves.toEqual({ allowed: true, count: 0 });
    });
  });

  describe("상한 설정", () => {
    it("env 로 상한을 바꾼다", async () => {
      vi.stubEnv("SENTRY_TRIAGE_DAILY_LIMIT", "1");
      const fetcher = vi.fn(async () => counted(2));
      const limiter = getTriageRateLimiter(UPSTASH, {
        fetcher: fetcher as unknown as typeof fetch,
        now: () => NOW,
      });

      await expect(limiter()).resolves.toMatchObject({ allowed: false });
    });

    it("잘못된 env 값은 기본값으로 되돌린다", async () => {
      vi.stubEnv("SENTRY_TRIAGE_DAILY_LIMIT", "많이");
      const fetcher = vi.fn(async () => counted(DEFAULT_DAILY_LIMIT));
      const limiter = getTriageRateLimiter(UPSTASH, {
        fetcher: fetcher as unknown as typeof fetch,
        now: () => NOW,
      });

      await expect(limiter()).resolves.toMatchObject({ allowed: true });
    });

    it("0 이하 값도 기본값으로 되돌린다", async () => {
      vi.stubEnv("SENTRY_TRIAGE_DAILY_LIMIT", "0");
      const fetcher = vi.fn(async () => counted(DEFAULT_DAILY_LIMIT));
      const limiter = getTriageRateLimiter(UPSTASH, {
        fetcher: fetcher as unknown as typeof fetch,
        now: () => NOW,
      });

      await expect(limiter()).resolves.toMatchObject({ allowed: true });
    });
  });
});
