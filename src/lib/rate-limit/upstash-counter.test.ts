import { describe, expect, it, vi } from "vitest";

import { evalUpstashScript, resolveUpstashCredentials } from "@/lib/rate-limit/upstash-counter";

const run = (fetcher: typeof fetch) =>
  evalUpstashScript({
    credentials: { url: "https://example.upstash.io", token: "secret" },
    script: "return 1",
    keys: ["k"],
    args: [1],
    timeoutMs: 1_000,
    fetcher,
  });

const responding = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue(Response.json(body, { status })) as unknown as typeof fetch;

describe("resolveUpstashCredentials", () => {
  it("직접 설정을 Marketplace 주입값보다 먼저 본다", () => {
    expect(
      resolveUpstashCredentials({
        UPSTASH_REDIS_REST_URL: " https://direct.test ",
        UPSTASH_REDIS_REST_TOKEN: " direct ",
        KV_REST_API_URL: "https://market.test",
        KV_REST_API_TOKEN: "market",
      }),
    ).toEqual({ url: "https://direct.test", token: "direct" });
  });

  it("한쪽만 있으면 자격증명이 없는 것으로 본다", () => {
    expect(resolveUpstashCredentials({ UPSTASH_REDIS_REST_URL: "https://direct.test" })).toBeNull();
  });
});

describe("evalUpstashScript — 실패 분류", () => {
  // 호출부는 client 를 배포 설정 오류로 보고 챗을 전역 차단한다. 재시도로 풀리는 상태가
  // 여기 섞이면 자격증명이 멀쩡한데도 챗이 꺼진다.
  it.each([401, 403, 404])("%i 는 재시도해도 같은 결과라 client 다", async (status) => {
    await expect(run(responding(status))).resolves.toEqual({ ok: false, reason: "client", status });
  });

  // Upstash 무료 티어의 일일 명령 상한을 넘기면 REST 가 429 를 준다. 시간이 지나면 풀린다.
  it.each([429, 400, 409, 500, 503])("%i 는 일시적 장애라 server 다", async (status) => {
    await expect(run(responding(status))).resolves.toEqual({ ok: false, reason: "server", status });
  });

  it("네트워크 오류는 network 다", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("unavailable")) as unknown as typeof fetch;

    await expect(run(fetcher)).resolves.toEqual({ ok: false, reason: "network" });
  });

  it("응답의 error 필드와 파싱 실패를 payload 로 묶는다", async () => {
    await expect(run(responding(200, { error: "ERR wrong number of args" }))).resolves.toEqual({
      ok: false,
      reason: "payload",
    });

    const broken = vi
      .fn()
      .mockResolvedValue(new Response("not json", { status: 200 })) as unknown as typeof fetch;
    await expect(run(broken)).resolves.toEqual({ ok: false, reason: "payload" });
  });

  it("성공하면 result 를 그대로 넘긴다", async () => {
    await expect(run(responding(200, { result: [1, 2] }))).resolves.toEqual({
      ok: true,
      value: [1, 2],
    });
  });
});
