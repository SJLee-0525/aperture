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

  it("Upstash에서 공유 카운터와 Retry-After를 계산하고 IP 원문은 전송하지 않는다", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ result: [1, 10_000] }))
      .mockResolvedValueOnce(Response.json({ result: [3, 8_000] }));
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
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://example.upstash.io");
    expect(init?.headers).toEqual(expect.objectContaining({ authorization: "Bearer secret" }));
    expect(init?.body).not.toContain("203.0.113.1");
    expect(JSON.parse(String(init?.body))).toEqual([
      "EVAL",
      expect.any(String),
      1,
      expect.stringMatching(/^chat:rate:v1:[a-f0-9]{64}$/),
      60_000,
    ]);
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
