import { describe, expect, it, vi } from "vitest";

import { createGeminiTriageProvider } from "@/features/sentry-triage/_lib/gemini-triage-provider";

import type { SentryAlertSummary, TriageResult } from "@/types/sentry-alert";

const summary: SentryAlertSummary = {
  issueId: "1",
  eventId: "2",
  title: "EvalError: capture",
  environment: "production",
  tags: { app_runtime: "browser" },
  frames: [{ filename: "app.ts", function: "handle", lineno: 12 }],
};

const verdict: TriageResult = {
  severity: "low",
  isNoise: true,
  userImpact: "영향 없음",
  probableCause: "확장 프로그램 스크립트",
  suspectArea: "",
  recommendedActions: ["무시한다"],
  confidence: "high",
};

const okResponse = (text: string = JSON.stringify(verdict)) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
  });

const callWith = async (response: Response) => {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  const provider = createGeminiTriageProvider("key", "gemini-3.5-flash-lite");
  const promise = provider({ summary, signal: AbortSignal.timeout(5_000) });
  return { fetchMock, promise };
};

const calls = (mock: { mock: { calls: unknown[] } }) =>
  mock.mock.calls as unknown as [string, RequestInit][];

const requestBody = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(calls(fetchMock)[0][1].body as string);

describe("createGeminiTriageProvider", () => {
  it("판정 결과와 제공자 이름을 돌려준다", async () => {
    const { promise } = await callWith(okResponse());

    await expect(promise).resolves.toEqual({
      result: verdict,
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
    });
  });

  it("모델 이름을 URL 에 넣어 비스트리밍으로 부른다", async () => {
    const { fetchMock, promise } = await callWith(okResponse());
    await promise;

    expect(calls(fetchMock)[0][0]).toContain("gemini-3.5-flash-lite:generateContent");
  });

  describe("요청 본문 계약", () => {
    it("판정 일관성을 위해 temperature 를 낮춘다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      expect(requestBody(fetchMock).generationConfig.temperature).toBe(0.2);
    });

    it("thinkingConfig 를 보내지 않는다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      expect(requestBody(fetchMock).generationConfig).not.toHaveProperty("thinkingConfig");
    });

    it("JSON 스키마로 출력을 강제하고 additionalProperties 는 넣지 않는다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      const config = requestBody(fetchMock).generationConfig;
      expect(config.responseMimeType).toBe("application/json");
      expect(config.responseJsonSchema).not.toHaveProperty("additionalProperties");
      expect(config.responseJsonSchema.required).toContain("severity");
    });

    it("키를 x-goog-api-key 헤더로 보낸다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      const init = calls(fetchMock)[0][1];
      expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("key");
    });
  });

  describe("실패", () => {
    it("HTTP 오류를 상태와 함께 던진다", async () => {
      const { promise } = await callWith(new Response("nope", { status: 503 }));

      await expect(promise).rejects.toThrow("Gemini triage failed (503)");
    });

    it("프롬프트 차단을 구분해서 던진다", async () => {
      const { promise } = await callWith(
        new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })),
      );

      await expect(promise).rejects.toThrow("Gemini blocked the triage response");
    });

    it("SAFETY 종료도 차단으로 본다", async () => {
      const { promise } = await callWith(
        new Response(JSON.stringify({ candidates: [{ finishReason: "SAFETY" }] })),
      );

      await expect(promise).rejects.toThrow("Gemini blocked the triage response");
    });

    it("계약을 어긴 본문을 던진다", async () => {
      const { promise } = await callWith(okResponse('{"severity":"urgent"}'));

      await expect(promise).rejects.toThrow(/unusable/);
    });
  });
});
