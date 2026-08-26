import { describe, expect, it, vi } from "vitest";

import { sendDiscordCard } from "@/features/sentry-triage/_lib/send-discord-card";

import type { DiscordEmbed } from "@/features/sentry-triage/_lib/discord-card";

const embed: DiscordEmbed = { title: "Error: boom", color: 0xe5484d };

const WEBHOOK = "https://discord.com/api/webhooks/1/token";

const response = (status: number, body?: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

const collectSleeps = () => {
  const slept: number[] = [];
  return { slept, sleep: async (ms: number) => void slept.push(ms) };
};

describe("sendDiscordCard", () => {
  it("웹훅 주소가 없으면 설정 오류로 끝낸다", async () => {
    const fetcher = vi.fn();

    const result = await sendDiscordCard(undefined, embed, { fetcher: fetcher as typeof fetch });

    expect(result).toEqual({ ok: false, error: "DISCORD_ALERT_WEBHOOK_URL is not configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("공백만 있는 주소도 설정 오류로 본다", async () => {
    const fetcher = vi.fn();

    const result = await sendDiscordCard("   ", embed, { fetcher: fetcher as typeof fetch });

    expect(result.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("요청에 남은 예산만큼의 signal 을 붙인다", async () => {
    const fetcher = vi.fn(async () => response(204));

    await sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch });

    const init = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("재시도 요청에도 signal 을 붙인다", async () => {
    const { sleep } = collectSleeps();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(204));

    await sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch, sleep });

    const init = (fetcher.mock.calls[1] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("첫 요청이 예산을 다 쓰면 429 대기를 하지 않는다", async () => {
    const { slept, sleep } = collectSleeps();
    let clock = 0;
    const fetcher = vi.fn(async () => {
      // 첫 요청이 예산 전부를 소모한 상황.
      clock = 9_500;
      return response(429, { retry_after: 1 });
    });

    const result = await sendDiscordCard(WEBHOOK, embed, {
      fetcher: fetcher as typeof fetch,
      sleep,
      now: () => clock,
      budgetMs: 9_000,
    });

    expect(result.ok).toBe(false);
    expect(slept).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("5xx 재시도 대기가 예산을 넘으면 재시도하지 않는다", async () => {
    const { slept, sleep } = collectSleeps();
    let clock = 0;
    const fetcher = vi.fn(async () => {
      clock = 9_800;
      return response(503);
    });

    const result = await sendDiscordCard(WEBHOOK, embed, {
      fetcher: fetcher as typeof fetch,
      sleep,
      now: () => clock,
      budgetMs: 10_000,
    });

    expect(result.ok).toBe(false);
    expect(slept).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("embeds 배열로 감싸고 멘션을 닫아 POST 한다", async () => {
    const fetcher = vi.fn(async () => response(204));

    const result = await sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(WEBHOOK);
    expect(init.method).toBe("POST");
    // allowed_mentions 가 빠지면 트리아지 입력에 심긴 @everyone 이 실제 핑이 될 수 있다.
    expect(JSON.parse(init.body as string)).toEqual({
      embeds: [embed],
      allowed_mentions: { parse: [] },
    });
  });

  describe("429", () => {
    it("retry_after 만큼 기다린 뒤 한 번 재시도한다", async () => {
      const { slept, sleep } = collectSleeps();
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(response(429, { retry_after: 1.5 }))
        .mockResolvedValueOnce(response(204));

      const result = await sendDiscordCard(WEBHOOK, embed, {
        fetcher: fetcher as typeof fetch,
        sleep,
      });

      expect(result).toEqual({ ok: true });
      expect(slept).toEqual([1500]);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("대기가 예산을 넘으면 재시도하지 않는다", async () => {
      const { slept, sleep } = collectSleeps();
      const fetcher = vi.fn(async () => response(429, { retry_after: 30 }));

      const result = await sendDiscordCard(WEBHOOK, embed, {
        fetcher: fetcher as typeof fetch,
        sleep,
        budgetMs: 10_000,
      });

      expect(result.ok).toBe(false);
      expect(slept).toEqual([]);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("retry_after 를 읽을 수 없으면 포기한다", async () => {
      const fetcher = vi.fn(async () => response(429, { retry_after: "곧" }));

      const result = await sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch });

      expect(result).toEqual({ ok: false, error: "429 without a usable retry_after" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("재시도까지 실패하면 상태를 사유로 남긴다", async () => {
      const { sleep } = collectSleeps();
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(response(429, { retry_after: 0.5 }))
        .mockResolvedValueOnce(response(429, { retry_after: 0.5 }));

      const result = await sendDiscordCard(WEBHOOK, embed, {
        fetcher: fetcher as typeof fetch,
        sleep,
      });

      expect(result).toEqual({ ok: false, error: "Discord retry failed (429)" });
    });
  });

  describe("그 밖의 상태", () => {
    it("5xx 는 1초 뒤 한 번 재시도한다", async () => {
      const { slept, sleep } = collectSleeps();
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(response(503))
        .mockResolvedValueOnce(response(204));

      const result = await sendDiscordCard(WEBHOOK, embed, {
        fetcher: fetcher as typeof fetch,
        sleep,
      });

      expect(result).toEqual({ ok: true });
      expect(slept).toEqual([1000]);
    });

    it("sleep 을 주지 않으면 기본 대기로 재시도한다", async () => {
      vi.useFakeTimers();
      try {
        const fetcher = vi
          .fn()
          .mockResolvedValueOnce(response(500))
          .mockResolvedValueOnce(response(204));

        const pending = sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch });
        await vi.advanceTimersByTimeAsync(1_000);

        expect(await pending).toEqual({ ok: true });
        expect(fetcher).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it("400 은 재시도하지 않는다", async () => {
      const fetcher = vi.fn(async () => response(400));

      const result = await sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch });

      expect(result).toEqual({ ok: false, error: "Discord rejected the card (400)" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("404 도 재시도하지 않는다", async () => {
      const fetcher = vi.fn(async () => response(404));

      const result = await sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch });

      expect(result.ok).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("네트워크 오류", () => {
    it("첫 요청이 던지면 사유를 담아 끝낸다", async () => {
      const fetcher = vi.fn(async () => {
        throw new Error("network down");
      });

      const result = await sendDiscordCard(WEBHOOK, embed, { fetcher: fetcher as typeof fetch });

      expect(result).toEqual({ ok: false, error: "network down" });
    });

    it("재시도가 던져도 예외를 올리지 않는다", async () => {
      const { sleep } = collectSleeps();
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(response(500))
        .mockRejectedValueOnce(new Error("socket closed"));

      const result = await sendDiscordCard(WEBHOOK, embed, {
        fetcher: fetcher as typeof fetch,
        sleep,
      });

      expect(result).toEqual({ ok: false, error: "socket closed" });
    });
  });
});
