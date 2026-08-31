import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTriageProvider, TriageProviderUnavailableError } from "@/lib/triage/provider";

import type { TriageContract } from "@/lib/triage/contract";

type TestRequest = { items: string[] };
type TestResult = { verdict: string };

const makeContract = (
  overrides: Partial<TriageContract<TestRequest, TestResult>> = {},
): TriageContract<TestRequest, TestResult> => ({
  envPrefix: "TEST_TRIAGE",
  schemaName: "test_triage",
  instructions: "판정 지시문",
  buildInput: (request) => request.items.join(", "),
  schema: () => ({ type: "object" }),
  parse: (text) => {
    try {
      const parsed = JSON.parse(text) as { verdict?: unknown };
      return typeof parsed.verdict === "string" ? { verdict: parsed.verdict } : null;
    } catch {
      return null;
    }
  },
  outputTokens: () => 100,
  timeoutMs: (_request, base) => base,
  mockResult: () => ({ verdict: "mock" }),
  ...overrides,
});

const request: TestRequest = { items: ["a"] };

const openaiBody = (verdict = "primary") =>
  JSON.stringify({
    output: [{ content: [{ type: "output_text", text: JSON.stringify({ verdict }) }] }],
  });

const geminiBody = (verdict = "fallback") =>
  JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ verdict }) }] } }],
  });

/** signal 이 abort 될 때까지 응답하지 않는 요청. 구간 timeout 과 외부 취소 경로에 쓴다. */
const hangingFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    const signal = init?.signal as AbortSignal;
    if (signal.aborted) return reject(signal.reason as Error);
    signal.addEventListener("abort", () => reject(signal.reason as Error), { once: true });
  });

const stubPrimary = (name = "openai") => {
  vi.stubEnv("TEST_TRIAGE_PROVIDER", name);
  vi.stubEnv("TEST_TRIAGE_PROVIDER_API_KEY", "key");
  vi.stubEnv("TEST_TRIAGE_PROVIDER_MODEL", "model-a");
};

const stubFallback = (name = "gemini") => {
  vi.stubEnv("TEST_TRIAGE_FALLBACK_PROVIDER", name);
  vi.stubEnv("TEST_TRIAGE_FALLBACK_PROVIDER_API_KEY", "key");
  vi.stubEnv("TEST_TRIAGE_FALLBACK_PROVIDER_MODEL", "model-b");
};

describe("createTriageProvider", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    warn.mockRestore();
  });

  describe("env 해석", () => {
    it("mock 이면 외부 호출 없이 계약의 mock 결과를 낸다", async () => {
      vi.stubEnv("TEST_TRIAGE_PROVIDER", "mock");
      const fetcher = vi.fn();

      const response = await createTriageProvider(makeContract(), {
        fetcher: fetcher as typeof fetch,
      })(request, new AbortController().signal);

      expect(response).toEqual({ result: { verdict: "mock" }, provider: "mock", model: "mock" });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("mockResult 가 없는 계약은 mock 이름을 미설정으로 본다", async () => {
      vi.stubEnv("TEST_TRIAGE_PROVIDER", "mock");
      const contract = makeContract();
      delete contract.mockResult;

      const run = createTriageProvider(contract)(request, new AbortController().signal);

      await expect(run).rejects.toBeInstanceOf(TriageProviderUnavailableError);
    });

    it("이름의 공백과 대소문자를 정규화한다", async () => {
      stubPrimary(" OpenAI ");
      const fetcher = vi.fn(async () => new Response(openaiBody()));

      const response = await createTriageProvider(makeContract(), {
        fetcher: fetcher as typeof fetch,
      })(request, new AbortController().signal);

      expect(response.provider).toBe("openai");
    });

    it.each([
      ["모르는 제공자 이름", () => stubPrimary("unknown")],
      [
        "키 누락",
        () => {
          vi.stubEnv("TEST_TRIAGE_PROVIDER", "openai");
          vi.stubEnv("TEST_TRIAGE_PROVIDER_MODEL", "model-a");
        },
      ],
      ["설정 없음", () => {}],
    ])("%s 은 호출 시 예외를 던지는 provider 를 돌려준다", async (_label, stub) => {
      stub();

      const run = createTriageProvider(makeContract())(request, new AbortController().signal);

      await expect(run).rejects.toBeInstanceOf(TriageProviderUnavailableError);
    });

    it("경고에 계열 라벨을 붙인다", () => {
      createTriageProvider(makeContract());

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("[test-triage]"));
    });

    it("폴백 이름만 있고 키가 없으면 경고를 남긴다", () => {
      stubPrimary();
      vi.stubEnv("TEST_TRIAGE_FALLBACK_PROVIDER", "gemini");

      createTriageProvider(makeContract());

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("TEST_TRIAGE_FALLBACK_PROVIDER is set"),
      );
    });

    it("primary 설정이 없으면 폴백을 승격하고 경고를 남긴다", async () => {
      stubFallback();
      const fetcher = vi.fn(async () => new Response(geminiBody()));

      const response = await createTriageProvider(makeContract(), {
        fetcher: fetcher as typeof fetch,
      })(request, new AbortController().signal);

      expect(response).toEqual({
        result: { verdict: "fallback" },
        provider: "gemini",
        model: "model-b",
      });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("promoting fallback to primary"));
    });
  });

  describe("폴백과 취소", () => {
    it("primary 가 성공하면 폴백을 부르지 않는다", async () => {
      stubPrimary();
      stubFallback();
      const fetcher = vi.fn(async () => new Response(openaiBody()));

      const response = await createTriageProvider(makeContract(), {
        fetcher: fetcher as typeof fetch,
      })(request, new AbortController().signal);

      expect(response.provider).toBe("openai");
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("primary 가 실패하면 같은 fetcher 로 폴백을 부른다", async () => {
      stubPrimary();
      stubFallback();
      const fetcher = vi.fn(async (url: string | URL | Request) =>
        String(url).includes("openai")
          ? new Response("nope", { status: 500 })
          : new Response(geminiBody()),
      );

      const response = await createTriageProvider(makeContract(), {
        fetcher: fetcher as typeof fetch,
      })(request, new AbortController().signal);

      expect(response).toEqual({
        result: { verdict: "fallback" },
        provider: "gemini",
        model: "model-b",
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(String(fetcher.mock.calls[1]![0])).toContain("generativelanguage");
    });

    it("폴백 요청도 합성 signal 을 받는다", async () => {
      stubPrimary();
      stubFallback();
      const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return String(url).includes("openai")
          ? new Response("nope", { status: 500 })
          : new Response(geminiBody());
      });

      await createTriageProvider(makeContract(), { fetcher: fetcher as typeof fetch })(
        request,
        new AbortController().signal,
      );

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("양쪽 다 실패하면 폴백의 오류를 올린다", async () => {
      stubPrimary();
      stubFallback();
      const fetcher = vi.fn(async () => new Response("nope", { status: 500 }));

      const run = createTriageProvider(makeContract(), { fetcher: fetcher as typeof fetch })(
        request,
        new AbortController().signal,
      );

      await expect(run).rejects.toThrow("Gemini test_triage request failed (500)");
    });

    it("primary 구간 timeout 이면 폴백을 호출한다", async () => {
      stubPrimary();
      stubFallback();
      // primary(OpenAI)는 abort 까지 응답하지 않고, 계약의 구간 상한 30ms 가 끊는다.
      const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) =>
        String(url).includes("openai") ? hangingFetch(url, init) : new Response(geminiBody()),
      );
      const contract = makeContract({ timeoutMs: () => 30 });

      const response = await createTriageProvider(contract, { fetcher: fetcher as typeof fetch })(
        request,
        new AbortController().signal,
      );

      expect(response.provider).toBe("gemini");
    });

    it("호출 전에 이미 abort 된 signal 은 fetch 없이 그 사유를 던진다", async () => {
      stubPrimary();
      const fetcher = vi.fn();
      const controller = new AbortController();
      const reason = new Error("caller cancelled");
      controller.abort(reason);

      const run = createTriageProvider(makeContract(), { fetcher: fetcher as typeof fetch })(
        request,
        controller.signal,
      );

      await expect(run).rejects.toBe(reason);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("primary 도중 외부 abort 면 폴백 없이 그 사유를 던진다", async () => {
      stubPrimary();
      stubFallback();
      const fetcher = vi.fn(hangingFetch);
      const controller = new AbortController();
      const reason = new Error("caller cancelled");

      const run = createTriageProvider(makeContract(), { fetcher: fetcher as typeof fetch })(
        request,
        controller.signal,
      );
      controller.abort(reason);

      await expect(run).rejects.toBe(reason);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("폴백 도중 외부 abort 도 그 사유를 던진다", async () => {
      stubPrimary();
      stubFallback();
      const controller = new AbortController();
      const reason = new Error("caller cancelled");
      const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).includes("openai")) return new Response("nope", { status: 500 });
        controller.abort(reason);
        return hangingFetch(url, init);
      });

      const run = createTriageProvider(makeContract(), { fetcher: fetcher as typeof fetch })(
        request,
        controller.signal,
      );

      await expect(run).rejects.toBe(reason);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("mock 도 이미 abort 된 signal 을 존중한다", async () => {
      vi.stubEnv("TEST_TRIAGE_PROVIDER", "mock");
      const controller = new AbortController();
      const reason = new Error("caller cancelled");
      controller.abort(reason);

      const run = createTriageProvider(makeContract())(request, controller.signal);

      await expect(run).rejects.toBe(reason);
    });
  });
});
