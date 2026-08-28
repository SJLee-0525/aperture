import { describe, expect, it, vi } from "vitest";

import { createOpenAITriageProvider } from "@/lib/sentry-triage/openai-triage-provider";

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
  severity: "high",
  isNoise: false,
  userImpact: "화면이 비어 있다",
  probableCause: "빈 문서를 참조한다",
  suspectArea: "app.ts",
  recommendedActions: ["필터한다"],
  confidence: "medium",
};

const okResponse = (text: string = JSON.stringify(verdict)) =>
  new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text }] }] }), {
    status: 200,
  });

const callWith = async (response: Response | Promise<Response>) => {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  const provider = createOpenAITriageProvider("key", "gpt-5.6-luna");
  const promise = provider({ summary, signal: AbortSignal.timeout(5_000) });
  return { fetchMock, promise };
};

const calls = (mock: { mock: { calls: unknown[] } }) =>
  mock.mock.calls as unknown as [string, RequestInit][];

const requestBody = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(calls(fetchMock)[0][1].body as string);

describe("createOpenAITriageProvider", () => {
  it("판정 결과와 제공자 이름을 돌려준다", async () => {
    const { promise } = await callWith(okResponse());

    await expect(promise).resolves.toEqual({
      result: verdict,
      provider: "openai",
      model: "gpt-5.6-luna",
    });
  });

  describe("요청 본문 계약", () => {
    it("temperature 를 보내지 않는다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      expect(requestBody(fetchMock)).not.toHaveProperty("temperature");
    });

    it("추론 강도를 low 로 보낸다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      expect(requestBody(fetchMock).reasoning).toEqual({ effort: "low" });
    });

    it("출력 상한과 store 를 고정한다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      const body = requestBody(fetchMock);
      expect(body.max_output_tokens).toBe(1_500);
      expect(body.store).toBe(false);
      expect(body.model).toBe("gpt-5.6-luna");
    });

    it("strict json_schema 로 출력을 강제한다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      const format = requestBody(fetchMock).text.format;
      expect(format.type).toBe("json_schema");
      expect(format.strict).toBe(true);
      expect(format.schema.additionalProperties).toBe(false);
      expect(format.schema.required).toContain("severity");
    });

    it("Authorization 헤더에 키를 담는다", async () => {
      const { fetchMock, promise } = await callWith(okResponse());
      await promise;

      const init = calls(fetchMock)[0][1];
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer key");
    });
  });

  describe("실패", () => {
    it("HTTP 오류를 상태와 함께 던진다", async () => {
      const { promise } = await callWith(new Response("nope", { status: 429 }));

      await expect(promise).rejects.toThrow("OpenAI triage failed (429)");
    });

    it("계약을 어긴 본문을 던진다", async () => {
      const { promise } = await callWith(okResponse('{"severity":"urgent"}'));

      await expect(promise).rejects.toThrow(/unusable/);
    });

    it("빈 출력을 던진다", async () => {
      const { promise } = await callWith(new Response(JSON.stringify({ output: [] })));

      await expect(promise).rejects.toThrow(/unusable/);
    });
  });
});
