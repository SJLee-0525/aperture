import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getTriageProvider,
  TriageProviderUnavailableError,
} from "@/lib/sentry-triage/triage-provider";

import type { SentryAlertSummary, TriageResult } from "@/types/sentry-alert";

const summary: SentryAlertSummary = {
  issueId: "1",
  eventId: "2",
  title: "EvalError: capture",
  tags: {},
  frames: [],
};

const verdict: TriageResult = {
  severity: "high",
  isNoise: false,
  userImpact: "화면이 비어 있다",
  probableCause: "빈 문서를 참조한다",
  suspectArea: "app.ts",
  recommendedActions: ["필터한다"],
  confidence: "medium",
};

const openaiOk = () =>
  new Response(
    JSON.stringify({
      output: [{ content: [{ type: "output_text", text: JSON.stringify(verdict) }] }],
    }),
  );

const geminiOk = () =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(verdict) }] } }] }),
  );

const calls = (mock: { mock: { calls: unknown[] } }) =>
  mock.mock.calls as unknown as [string, RequestInit][];

const run = () => getTriageProvider()({ summary, signal: AbortSignal.timeout(5_000) });

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getTriageProvider", () => {
  it("mock 이면 외부 호출 없이 고정 결과를 낸다", async () => {
    vi.stubEnv("TRIAGE_PROVIDER", "mock");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { provider, result } = await run();

    expect(provider).toBe("mock");
    expect(result.severity).toBe("medium");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("primary 로 openai 를 고른다", async () => {
    vi.stubEnv("TRIAGE_PROVIDER", "openai");
    vi.stubEnv("TRIAGE_PROVIDER_API_KEY", "key");
    vi.stubEnv("TRIAGE_PROVIDER_MODEL", "gpt-5.6-luna");
    const fetchMock = vi.fn(async () => openaiOk());
    vi.stubGlobal("fetch", fetchMock);

    await expect(run()).resolves.toMatchObject({ provider: "openai" });
    expect(calls(fetchMock)[0][0]).toContain("api.openai.com");
  });

  it("이름의 공백과 대소문자를 정규화한다", async () => {
    vi.stubEnv("TRIAGE_PROVIDER", "  OpenAI ");
    vi.stubEnv("TRIAGE_PROVIDER_API_KEY", " key ");
    vi.stubEnv("TRIAGE_PROVIDER_MODEL", " gpt-5.6-luna ");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => openaiOk()),
    );

    await expect(run()).resolves.toMatchObject({ provider: "openai", model: "gpt-5.6-luna" });
  });

  it("모르는 제공자 이름은 설정되지 않은 것으로 본다", async () => {
    vi.stubEnv("TRIAGE_PROVIDER", "anthropic");
    vi.stubEnv("TRIAGE_PROVIDER_API_KEY", "key");
    vi.stubEnv("TRIAGE_PROVIDER_MODEL", "model");

    await expect(run()).rejects.toBeInstanceOf(TriageProviderUnavailableError);
  });

  it("키가 없으면 설정되지 않은 것으로 본다", async () => {
    vi.stubEnv("TRIAGE_PROVIDER", "openai");
    vi.stubEnv("TRIAGE_PROVIDER_API_KEY", "");
    vi.stubEnv("TRIAGE_PROVIDER_MODEL", "gpt-5.6-luna");

    await expect(run()).rejects.toBeInstanceOf(TriageProviderUnavailableError);
  });

  it("아무것도 없으면 호출 시 예외를 던진다", async () => {
    vi.stubEnv("TRIAGE_PROVIDER", "");
    vi.stubEnv("TRIAGE_PROVIDER_API_KEY", "");
    vi.stubEnv("TRIAGE_PROVIDER_MODEL", "");
    vi.stubEnv("TRIAGE_FALLBACK_PROVIDER", "");

    await expect(run()).rejects.toBeInstanceOf(TriageProviderUnavailableError);
  });

  describe("폴백", () => {
    const configureBoth = () => {
      vi.stubEnv("TRIAGE_PROVIDER", "openai");
      vi.stubEnv("TRIAGE_PROVIDER_API_KEY", "key");
      vi.stubEnv("TRIAGE_PROVIDER_MODEL", "gpt-5.6-luna");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER", "gemini");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER_API_KEY", "key2");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER_MODEL", "gemini-3.5-flash-lite");
    };

    it("primary 가 성공하면 폴백을 부르지 않는다", async () => {
      configureBoth();
      const fetchMock = vi.fn(async () => openaiOk());
      vi.stubGlobal("fetch", fetchMock);

      await expect(run()).resolves.toMatchObject({ provider: "openai" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("primary 가 실패하면 폴백 결과를 쓴다", async () => {
      configureBoth();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("nope", { status: 500 }))
        .mockResolvedValueOnce(geminiOk());
      vi.stubGlobal("fetch", fetchMock);

      await expect(run()).resolves.toMatchObject({
        provider: "gemini",
        model: "gemini-3.5-flash-lite",
      });
    });

    it("양쪽 다 실패하면 폴백의 오류를 올린다", async () => {
      configureBoth();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("nope", { status: 500 })),
      );

      await expect(run()).rejects.toThrow("Gemini triage failed (500)");
    });

    it("요청이 취소되면 폴백하지 않는다", async () => {
      configureBoth();
      const fetchMock = vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      });
      vi.stubGlobal("fetch", fetchMock);
      const controller = new AbortController();
      controller.abort();

      await expect(getTriageProvider()({ summary, signal: controller.signal })).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("primary 설정이 없으면 폴백을 승격한다", async () => {
      vi.stubEnv("TRIAGE_PROVIDER", "");
      vi.stubEnv("TRIAGE_PROVIDER_API_KEY", "");
      vi.stubEnv("TRIAGE_PROVIDER_MODEL", "");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER", "gemini");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER_API_KEY", "key2");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER_MODEL", "gemini-3.5-flash-lite");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => geminiOk()),
      );

      await expect(run()).resolves.toMatchObject({ provider: "gemini" });
    });

    it("폴백 이름만 있고 키가 없으면 경고를 남긴다", async () => {
      vi.stubEnv("TRIAGE_PROVIDER", "openai");
      vi.stubEnv("TRIAGE_PROVIDER_API_KEY", "key");
      vi.stubEnv("TRIAGE_PROVIDER_MODEL", "gpt-5.6-luna");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER", "gemini");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER_API_KEY", "");
      vi.stubEnv("TRIAGE_FALLBACK_PROVIDER_MODEL", "");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => openaiOk()),
      );

      await run();

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("without fallback"));
    });
  });
});
