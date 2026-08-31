import { describe, expect, it, vi } from "vitest";

import { createOpenAIAdapter } from "@/lib/triage/openai";

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
  new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text }] }] }), {
    status: 200,
  });

const callWith = (response: Response) => {
  const fetcher = vi.fn(async () => response);
  const provider = createOpenAIAdapter(contract, "key", "gpt-5.6-luna", fetcher as typeof fetch);
  const promise = provider(request, new AbortController().signal);
  return { fetcher, promise };
};

const requestInit = (fetcher: ReturnType<typeof vi.fn>) => fetcher.mock.calls[0]![1] as RequestInit;

const requestBody = (fetcher: ReturnType<typeof vi.fn>) =>
  JSON.parse(requestInit(fetcher).body as string) as Record<string, never>;

describe("createOpenAIAdapter", () => {
  it("판정 결과와 제공자 이름을 돌려준다", async () => {
    const { promise } = callWith(okResponse());

    await expect(promise).resolves.toEqual({
      result: { verdict: "ok" },
      provider: "openai",
      model: "gpt-5.6-luna",
    });
  });

  describe("요청 본문 계약", () => {
    it("temperature 를 보내지 않는다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      expect(requestBody(fetcher)).not.toHaveProperty("temperature");
    });

    it("추론 강도를 low 로 보낸다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      expect(requestBody(fetcher).reasoning).toEqual({ effort: "low" });
    });

    it("계약의 출력 상한을 쓰고 store 를 끈다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      const body = requestBody(fetcher);
      expect(body.max_output_tokens).toBe(contract.outputTokens(request));
      expect(body.store).toBe(false);
      expect(body.model).toBe("gpt-5.6-luna");
    });

    it("계약 이름과 strict schema 로 출력을 강제한다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      const format = requestBody(fetcher).text as {
        format: { type: string; name: string; strict: boolean; schema: Record<string, unknown> };
      };
      expect(format.format.type).toBe("json_schema");
      expect(format.format.name).toBe("test_triage");
      expect(format.format.strict).toBe(true);
      expect(format.format.schema).toEqual(contract.schema(true));
    });

    it("Authorization 헤더에 키를 담는다", async () => {
      const { fetcher, promise } = callWith(okResponse());
      await promise;

      const headers = requestInit(fetcher).headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer key");
    });
  });

  describe("실패", () => {
    it("HTTP 오류를 계열 이름·상태와 함께 던진다", async () => {
      const { promise } = callWith(new Response("nope", { status: 429 }));

      await expect(promise).rejects.toThrow("OpenAI test_triage request failed (429)");
    });

    it("계약을 어긴 본문을 던진다", async () => {
      const { promise } = callWith(okResponse('{"verdict":42}'));

      await expect(promise).rejects.toThrow(/unusable test_triage/);
    });

    it("빈 출력을 던진다", async () => {
      const { promise } = callWith(new Response(JSON.stringify({ output: [] })));

      await expect(promise).rejects.toThrow(/unusable test_triage/);
    });

    it("응답의 error 메시지가 있으면 그 사유를 던진다", async () => {
      const { promise } = callWith(
        new Response(JSON.stringify({ output: [], error: { message: "quota exceeded" } })),
      );

      await expect(promise).rejects.toThrow("quota exceeded");
    });
  });
});
