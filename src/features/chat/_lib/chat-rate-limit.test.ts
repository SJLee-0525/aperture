import { describe, expect, it, vi } from "vitest";

import {
  ChatRateLimitConfigurationError,
  createChatRateLimiter,
  createConfiguredChatRateLimiter,
  createUpstashChatRateLimiter,
} from "@/features/chat/_lib/chat-rate-limit";

const request = (ip: string) =>
  new Request("http://localhost/api/chat", { headers: { "x-forwarded-for": ip } });

describe("chat rate limiter", () => {
  it("기본 IP 제한은 분당 10회이며 11번째 요청부터 막는다", () => {
    const limit = createChatRateLimiter();
    const clientRequest = request("203.0.113.10");

    for (let count = 1; count <= 10; count += 1) {
      expect(limit(clientRequest, count * 1_000).allowed).toBe(true);
    }
    expect(limit(clientRequest, 11_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 50,
    });
  });

  it("IP별 고정 윈도우 제한과 Retry-After를 계산한다", () => {
    const limit = createChatRateLimiter({ limit: 2, windowMs: 10_000 });

    expect(limit(request("203.0.113.1"), 1_000).allowed).toBe(true);
    expect(limit(request("203.0.113.1"), 2_000).allowed).toBe(true);
    expect(limit(request("203.0.113.1"), 3_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 8,
    });
    expect(limit(request("203.0.113.2"), 3_000).allowed).toBe(true);
    expect(limit(request("203.0.113.1"), 11_000).allowed).toBe(true);
  });

  it("forwarded 체인의 첫 주소를 사용한다", () => {
    const limit = createChatRateLimiter({ limit: 1 });
    const first = new Request("http://localhost/api/chat", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });

    expect(limit(first, 1_000).allowed).toBe(true);
    expect(limit(request("203.0.113.1"), 1_001).allowed).toBe(false);
  });

  it("위조 가능한 x-forwarded-for 보다 플랫폼이 채우는 헤더를 우선한다", () => {
    const limit = createChatRateLimiter({ limit: 1 });
    const spoofed = (forged: string) =>
      new Request("http://localhost/api/chat", {
        headers: { "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": forged },
      });

    expect(limit(spoofed("198.51.100.1"), 1_000).allowed).toBe(true);
    // 공격자가 x-forwarded-for 를 매번 바꿔도 같은 버킷에 묶여야 한다.
    expect(limit(spoofed("198.51.100.2"), 1_001).allowed).toBe(false);
    expect(limit(spoofed("198.51.100.3"), 1_002).allowed).toBe(false);
  });

  it("Upstash에서 공유 카운터와 Retry-After를 계산하고 IP 원문은 전송하지 않는다", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ result: [1, 10_000, 1] }))
      .mockResolvedValueOnce(Response.json({ result: [3, 8_000, -1] }));
    const limit = createUpstashChatRateLimiter({
      url: "https://example.upstash.io",
      token: "secret",
      limit: 2,
      fetcher,
    });

    await expect(limit(request("203.0.113.1"))).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    await expect(limit(request("203.0.113.1"))).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 8,
      scope: "client",
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://example.upstash.io");
    expect(init?.headers).toEqual(expect.objectContaining({ authorization: "Bearer secret" }));
    expect(init?.body).not.toContain("203.0.113.1");
    expect(JSON.parse(String(init?.body))).toEqual([
      "EVAL",
      expect.any(String),
      2,
      expect.stringMatching(/^chat:rate:v1:[a-f0-9]{64}$/),
      expect.stringMatching(/^chat:daily:v1:\d{4}-\d{2}-\d{2}$/),
      60_000,
      172_800_000,
      2,
    ]);
  });

  it("전역 일일 상한을 넘기면 UTC 자정까지의 Retry-After로 막는다", async () => {
    const noon = Date.UTC(2026, 7, 5, 12, 0, 0);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ result: [1, 60_000, 1_001] }));
    const limit = createUpstashChatRateLimiter({
      url: "https://example.upstash.io",
      token: "secret",
      limit: 6,
      fetcher,
      now: () => noon,
    });

    // IP 윈도우에는 여유가 있어도(count=1) 전역 예산이 소진되면 막힌다.
    await expect(limit(request("203.0.113.1"))).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 12 * 60 * 60,
      scope: "daily",
    });
  });

  it("일일 상한 안에서는 IP가 달라도 통과시킨다", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ result: [1, 60_000, 499] }));
    const limit = createUpstashChatRateLimiter({
      url: "https://example.upstash.io",
      token: "secret",
      dailyLimit: 500,
      fetcher,
    });

    await expect(limit(request("203.0.113.7"))).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("같은 UTC 날짜의 요청은 IP가 달라도 같은 일일 키를 공유한다", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ result: [1, 60_000, 1] }));
    const limit = createUpstashChatRateLimiter({
      url: "https://example.upstash.io",
      token: "secret",
      fetcher,
      now: () => Date.UTC(2026, 7, 5, 3, 0, 0),
    });

    await limit(request("203.0.113.1"));
    await limit(request("198.51.100.2"));

    const dailyKeys = fetcher.mock.calls.map((call) => JSON.parse(String(call[1]?.body))[4]);
    expect(dailyKeys).toEqual(["chat:daily:v1:2026-08-05", "chat:daily:v1:2026-08-05"]);
  });

  it("Upstash 장애 시 인스턴스 limiter로 폴백한다", async () => {
    const fallback = vi.fn().mockReturnValue({ allowed: false, retryAfterSeconds: 5 });
    const limit = createUpstashChatRateLimiter({
      url: "https://example.upstash.io",
      token: "secret",
      fetcher: vi.fn().mockRejectedValue(new Error("unavailable")),
      fallback,
    });
    const clientRequest = request("203.0.113.1");

    await expect(limit(clientRequest)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 5,
    });
    expect(fallback).toHaveBeenCalledWith(clientRequest);
  });

  it("Upstash 인증 오류는 로컬 limiter로 숨기지 않는다", async () => {
    const fallback = vi.fn();
    const limit = createUpstashChatRateLimiter({
      url: "https://example.upstash.io",
      token: "invalid",
      fetcher: vi.fn().mockResolvedValue(Response.json({ error: "unauthorized" }, { status: 401 })),
      fallback,
    });

    await expect(limit(request("203.0.113.1"))).rejects.toBeInstanceOf(
      ChatRateLimitConfigurationError,
    );
    expect(fallback).not.toHaveBeenCalled();
  });

  it("Upstash 환경변수가 없으면 동기 인스턴스 limiter를 선택한다", () => {
    const local = createConfiguredChatRateLimiter({});

    expect(local(request("203.0.113.1"))).not.toBeInstanceOf(Promise);
  });

  it("배포 환경에서 공유 limiter 자격증명이 없으면 인스턴스 limiter로 강등하지 않는다", () => {
    // 서버리스 인스턴스별 카운터는 동시 요청만으로 우회되므로 조용히 통과시키면 안 된다.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");

    const limit = createConfiguredChatRateLimiter({});

    expect(() => limit(request("203.0.113.1"))).toThrow(ChatRateLimitConfigurationError);

    vi.unstubAllEnvs();
  });

  it("Vercel Marketplace의 KV 환경변수 이름도 공유 limiter에 사용한다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: [1, 60_000] }));
    const limit = createConfiguredChatRateLimiter(
      {
        KV_REST_API_URL: "https://marketplace.upstash.io",
        KV_REST_API_TOKEN: "marketplace-token",
      },
      { fetcher },
    );

    await expect(limit(request("203.0.113.1"))).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://marketplace.upstash.io",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer marketplace-token" }),
      }),
    );
  });

  it("서로 다른 제공자의 URL과 token을 섞지 않고 완전한 KV 쌍을 선택한다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: [1, 60_000] }));
    const limit = createConfiguredChatRateLimiter(
      {
        UPSTASH_REDIS_REST_URL: "https://incomplete.upstash.io",
        KV_REST_API_URL: "https://marketplace.upstash.io",
        KV_REST_API_TOKEN: "marketplace-token",
      },
      { fetcher },
    );

    await limit(request("203.0.113.1"));
    expect(fetcher).toHaveBeenCalledWith("https://marketplace.upstash.io", expect.any(Object));
  });
});
