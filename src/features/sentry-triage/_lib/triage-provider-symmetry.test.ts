import { describe, expect, it, vi } from "vitest";

import { createGeminiTriageProvider } from "@/features/sentry-triage/_lib/gemini-triage-provider";
import { createOpenAITriageProvider } from "@/features/sentry-triage/_lib/openai-triage-provider";
import { buildTriageSchema } from "@/features/sentry-triage/_lib/triage-schema";

import type { SentryAlertSummary, TriageResult } from "@/types/sentry-alert";

/**
 * 두 제공자가 같은 입력에 같은 형태를 돌려주는지 고정한다.
 * 메인과 폴백을 맞바꿔도 카드와 기록이 달라지지 않아야 한다.
 */
const summary: SentryAlertSummary = {
  issueId: "1",
  eventId: "2",
  title: "EvalError: capture",
  environment: "production",
  release: "aperture@abc1234",
  tags: { app_runtime: "browser", area: "public" },
  exceptionType: "EvalError",
  exceptionValue: "capture",
  frames: [{ filename: "app.ts", function: "handle", lineno: 12 }],
};

const verdict: TriageResult = {
  severity: "high",
  isNoise: false,
  userImpact: "화면이 비어 있다",
  probableCause: "빈 문서를 참조한다",
  suspectArea: "app.ts",
  recommendedActions: ["필터한다", "기본값을 채운다"],
  confidence: "medium",
};

const callProvider = async (kind: "openai" | "gemini") => {
  const body =
    kind === "openai"
      ? { output: [{ content: [{ type: "output_text", text: JSON.stringify(verdict) }] }] }
      : { candidates: [{ content: { parts: [{ text: JSON.stringify(verdict) }] } }] };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body)));
  vi.stubGlobal("fetch", fetchMock);

  const provider =
    kind === "openai"
      ? createOpenAITriageProvider("key", "model")
      : createGeminiTriageProvider("key", "model");
  const result = await provider({ summary, signal: AbortSignal.timeout(5_000) });
  vi.unstubAllGlobals();
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return { result, request: JSON.parse(init.body as string) };
};

describe("트리아지 제공자 대칭", () => {
  it("같은 입력에 같은 판정 결과를 돌려준다", async () => {
    const openai = await callProvider("openai");
    const gemini = await callProvider("gemini");

    expect(openai.result.result).toEqual(gemini.result.result);
  });

  it("제공자 이름만 다르고 나머지 반환 키는 같다", async () => {
    const openai = await callProvider("openai");
    const gemini = await callProvider("gemini");

    expect(Object.keys(openai.result).sort()).toEqual(Object.keys(gemini.result).sort());
    expect(openai.result.provider).toBe("openai");
    expect(gemini.result.provider).toBe("gemini");
  });

  it("두 요청이 같은 출력 스키마 속성을 요구한다", async () => {
    const openai = await callProvider("openai");
    const gemini = await callProvider("gemini");

    const openaiSchema = openai.request.text.format.schema;
    const geminiSchema = gemini.request.generationConfig.responseJsonSchema;

    expect(Object.keys(openaiSchema.properties)).toEqual(Object.keys(geminiSchema.properties));
    expect(openaiSchema.required).toEqual(geminiSchema.required);
  });

  it("strict 차이만 스키마에 반영한다", async () => {
    const openai = await callProvider("openai");
    const gemini = await callProvider("gemini");

    expect(openai.request.text.format.schema).toEqual(buildTriageSchema({ strict: true }));
    expect(gemini.request.generationConfig.responseJsonSchema).toEqual(
      buildTriageSchema({ strict: false }),
    );
  });

  it("두 요청이 같은 지시문과 같은 이벤트 요약을 보낸다", async () => {
    const openai = await callProvider("openai");
    const gemini = await callProvider("gemini");

    expect(openai.request.instructions).toBe(gemini.request.systemInstruction.parts[0].text);
    expect(openai.request.input[0].content).toBe(gemini.request.contents[0].parts[0].text);
  });

  it("두 요청 모두 출력 상한을 같은 값으로 둔다", async () => {
    const openai = await callProvider("openai");
    const gemini = await callProvider("gemini");

    expect(openai.request.max_output_tokens).toBe(gemini.request.generationConfig.maxOutputTokens);
  });
});
