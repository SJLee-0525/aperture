import { describe, expect, it, vi } from "vitest";

import {
  checkAdminAuthThrottle,
  FAILURE_LIMIT,
  recordAdminAuthFailure,
  WINDOW_MS,
} from "@/lib/auth/admin-auth-throttle";

const CREDENTIALS = {
  UPSTASH_REDIS_REST_URL: "https://upstash.test",
  UPSTASH_REDIS_REST_TOKEN: "secret",
};

const evalResponse = (result: unknown) => Response.json({ result });

const body = (fetcher: ReturnType<typeof vi.fn>) =>
  JSON.parse(String((fetcher.mock.calls[0]?.[1] as RequestInit).body)) as unknown[];

describe("checkAdminAuthThrottle", () => {
  it("공유 카운터가 없으면 통과시키고 요청을 보내지 않는다", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(checkAdminAuthThrottle({ env: {}, fetcher, address: "203.0.113.1" })).resolves
      .toEqual({ blocked: false, retryAfterSeconds: 0 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("상한 미만이면 통과시킨다", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(evalResponse([FAILURE_LIMIT - 1, 60_000]));

    await expect(
      checkAdminAuthThrottle({ env: CREDENTIALS, fetcher, address: "203.0.113.1" }),
    ).resolves.toEqual({ blocked: false, retryAfterSeconds: 0 });
  });

  it("상한에 닿으면 남은 창 시간을 초로 돌려주며 막는다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(evalResponse([FAILURE_LIMIT, 90_400]));

    await expect(
      checkAdminAuthThrottle({ env: CREDENTIALS, fetcher, address: "203.0.113.1" }),
    ).resolves.toEqual({ blocked: true, retryAfterSeconds: 91 });
  });

  it("IP 마다 다른 키를 쓴다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(evalResponse([0, -2]));

    await checkAdminAuthThrottle({ env: CREDENTIALS, fetcher, address: "203.0.113.9" });

    expect(body(fetcher)[3]).toBe("admin-auth:fail:v1:203.0.113.9");
  });

  it("카운터가 죽으면 통과시킨다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network"));

    await expect(
      checkAdminAuthThrottle({ env: CREDENTIALS, fetcher, address: "203.0.113.1" }),
    ).resolves.toEqual({ blocked: false, retryAfterSeconds: 0 });
  });

  it("예상 밖 응답이면 통과시킨다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: "boom" }));

    await expect(
      checkAdminAuthThrottle({ env: CREDENTIALS, fetcher, address: "203.0.113.1" }),
    ).resolves.toEqual({ blocked: false, retryAfterSeconds: 0 });
  });
});

describe("recordAdminAuthFailure", () => {
  it("창 길이를 만료로 넘겨 카운터를 올린다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(evalResponse(1));

    await recordAdminAuthFailure({ env: CREDENTIALS, fetcher, address: "203.0.113.1" });

    const sent = body(fetcher);
    expect(sent[2]).toBe(1);
    expect(sent[3]).toBe("admin-auth:fail:v1:203.0.113.1");
    expect(sent[4]).toBe(WINDOW_MS);
  });

  it("공유 카운터가 없으면 아무것도 보내지 않는다", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await recordAdminAuthFailure({ env: {}, fetcher, address: "203.0.113.1" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("기록에 실패해도 예외를 던지지 않는다", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network"));

    await expect(
      recordAdminAuthFailure({ env: CREDENTIALS, fetcher, address: "203.0.113.1" }),
    ).resolves.toBeUndefined();
  });
});
