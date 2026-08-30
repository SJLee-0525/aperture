import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiPerformanceTriageProvider } from "@/lib/performance-alerts/gemini-triage-provider";
import { createOpenAIPerformanceTriageProvider } from "@/lib/performance-alerts/openai-triage-provider";
import {
  getPerformanceTriageProvider,
  withFallback,
} from "@/lib/performance-alerts/triage-provider";

import type { PerformanceTriageProvider } from "@/lib/performance-alerts/triage-provider";

const result = {
  summary: "요약",
  userImpact: "영향",
  likelyCauses: ["원인"],
  inspectFirst: ["진단"],
  recommendedChecks: ["npm run check"],
  confidence: "medium" as const,
};
const input = {
  target: "https://sungjoon.works/ko",
  scope: "url" as const,
  formFactor: "phone",
  collectionPeriod: "2026-08-30",
  release: null,
  metrics: [{ metric: "LCP", current: 4_500, previous: 3_000, status: "poor" }],
  diagnostics: [],
};

afterEach(() => vi.unstubAllEnvs());

describe("performance triage providers", () => {
  it("OpenAI와 Gemini가 같은 fixture를 같은 계약으로 반환한다", async () => {
    const openAIRequest = vi.fn(
      async (requestInput: RequestInfo | URL, requestInit?: RequestInit) => {
        void requestInput;
        void requestInit;
        return new Response(
          JSON.stringify({
            output: [{ content: [{ type: "output_text", text: JSON.stringify(result) }] }],
          }),
        );
      },
    );
    const geminiRequest = vi.fn(
      async (requestInput: RequestInfo | URL, requestInit?: RequestInit) => {
        void requestInput;
        void requestInit;
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }],
          }),
        );
      },
    );
    const signal = new AbortController().signal;
    const openAI = await createOpenAIPerformanceTriageProvider(
      "openai-key",
      "openai-model",
      openAIRequest as typeof fetch,
    )({ input, signal });
    const gemini = await createGeminiPerformanceTriageProvider(
      "gemini-key",
      "gemini-model",
      geminiRequest as typeof fetch,
    )({ input, signal });
    expect(openAI.result).toEqual(result);
    expect(gemini.result).toEqual(result);
    expect(JSON.parse(openAIRequest.mock.calls[0]![1]!.body as string)).toMatchObject({
      store: false,
    });
    expect(geminiRequest.mock.calls[0]![1]!.headers).toMatchObject({
      "x-goog-api-key": "gemini-key",
    });
  });

  it("primary 실패 후 fallback을 한 번 호출한다", async () => {
    const primary = vi.fn<PerformanceTriageProvider>(async () => {
      throw new Error("primary failed");
    });
    const fallback = vi.fn<PerformanceTriageProvider>(async () => ({
      result,
      provider: "gemini",
      model: "fallback",
    }));
    const response = await withFallback(
      primary,
      fallback,
    )({
      input,
      signal: new AbortController().signal,
    });
    expect(response.provider).toBe("gemini");
    expect(primary).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("설정되지 않으면 기본 카드 경로로 사용할 실패를 반환한다", async () => {
    vi.stubEnv("PERFORMANCE_TRIAGE_PROVIDER", "");
    await expect(
      getPerformanceTriageProvider()({ input, signal: new AbortController().signal }),
    ).rejects.toThrow("not configured");
  });

  it("mock provider는 외부 요청 없이 결과를 만든다", async () => {
    vi.stubEnv("PERFORMANCE_TRIAGE_PROVIDER", "mock");
    const response = await getPerformanceTriageProvider()({
      input,
      signal: new AbortController().signal,
    });
    expect(response).toMatchObject({ provider: "mock", model: "mock" });
  });
});
