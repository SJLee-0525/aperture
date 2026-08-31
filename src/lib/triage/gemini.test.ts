import { describe, expect, it, vi } from "vitest";

import { createGeminiAdapter } from "@/lib/triage/gemini";

import type { TriageContract } from "@/lib/triage/contract";

type TestRequest = { items: string[] };
type TestResult = { verdict: string };

const contract: TriageContract<TestRequest, TestResult> = {
  envPrefix: "TEST_TRIAGE",
  schemaName: "test_triage",
  instructions: "판정 지시문",
  buildInput: (request) => `items: ${request.items.join(", ")}`,
  schema: (strict) =>
    strict
      ? { type: "object", additionalProperties: false, required: ["verdict"] }
      : { type: "object", required: ["verdict"] },
  parse: (text) => {
    try {
      const parsed = JSON.parse(text) as { verdict?: unknown };
      return typeof parsed.verdict === "string" ? { verdict: parsed.verdict } : null;
    } catch {
      return null;
    }
  },
  outputTokens: (request) => 100 * request.items.length,
  timeoutMs: (_request, base) => base,
};

const request: TestRequest = { items: ["a", "b"] };

const okResponse = (text: string = JSON.stringify({ verdict: "ok" })) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
  });

const callWith = (response: Response) => {
  const fetcher = vi.fn(async () => response);
  const provider = createGeminiAdapter(
    contract,
    "key",
    "gemini-3.5-flash-lite",
    fetcher as typeof fetch,
  );
  const promise = provider(request, new AbortController().signal);
  return { fetcher, promise };
};

const requestInit = (fetcher: ReturnType<typeof vi.fn>) => fetcher.mock.calls[0]![1] as RequestInit;

const requestBody = (fetcher: ReturnType<typeof vi.fn>) =>
  JSON.parse(requestInit(fetcher).body as string) as Record<string, never>;

describe("createGeminiAdapter", () => {
  it("판정 결과와 제공자 이름을 돌려준다", async () => {
    const { promise } = callWith(okResponse());

    await expect(promise).resolves.toEqual({
      result: { verdict: "ok" },
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
    });
  });

  it("모델 이름을 URL 에 넣어 비스트리밍으로 부른다", async () => {
    const { fetcher, promise } = callWith(okResponse());
    await promise;

    expect(String((fetcher.mock.calls as unknown as [string][])[0]![0])).toContain(
      "gemini-3.5-flash-lite:generateContent",
    );
  });

  describe("요청 본문 계약", () => {
    it("판정 일관성을 위해 temperature 를 낮춘다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      const config = requestBody(fetcher).generationConfig as Record<string, unknown>;
      expect(config.temperature).toBe(0.2);
    });

    it("thinkingConfig 를 보내지 않는다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      expect(requestBody(fetcher).generationConfig).not.toHaveProperty("thinkingConfig");
    });

    it("계약의 비 strict schema 와 출력 상한을 쓴다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      const config = requestBody(fetcher).generationConfig as Record<string, unknown>;
      expect(config.responseMimeType).toBe("application/json");
      expect(config.responseJsonSchema).toEqual(contract.schema(false));
      expect(config.responseJsonSchema).not.toHaveProperty("additionalProperties");
      expect(config.maxOutputTokens).toBe(contract.outputTokens(request));
    });

    it("키를 x-goog-api-key 헤더로 보낸다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      const headers = requestInit(fetcher).headers as Record<string, string>;
      expect(headers["x-goog-api-key"]).toBe("key");
    });
  });

  describe("실패", () => {
    it("HTTP 오류를 계열 이름·상태와 함께 던진다", async () => {
      const { promise } = callWith(new Response("nope", { status: 503 }));

      await expect(promise).rejects.toThrow("Gemini test_triage request failed (503)");
    });

    it("프롬프트 차단을 파싱 실패와 구분해서 던진다", async () => {
      const { promise } = callWith(
        new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })),
      );

      await expect(promise).rejects.toThrow("Gemini blocked the test_triage response");
    });

    it("SAFETY 종료도 차단으로 본다", async () => {
      const { promise } = callWith(
        new Response(JSON.stringify({ candidates: [{ finishReason: "SAFETY" }] })),
      );

      await expect(promise).rejects.toThrow("Gemini blocked the test_triage response");
    });

    it("계약을 어긴 본문을 던진다", async () => {
      const { promise } = callWith(okResponse('{"verdict":42}'));

      await expect(promise).rejects.toThrow(/unusable test_triage/);
    });
  });
});
