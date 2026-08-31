import { createGeminiAdapter } from "@/lib/triage/gemini";
import { createOpenAIAdapter } from "@/lib/triage/openai";

import type { TriageContract, TriageProvider } from "@/lib/triage/contract";

/**
 * 구간별 base 상한. 폴백까지 간 뒤 Discord 가 429 로 재시도하면 함수 실행 상한(60초)에
 * 닿는다 (docs/plan/10 §4 시간 예산). 실제 구간 상한은 계약의 `timeoutMs` 가 이 base 로
 * 정하며, performance 계열처럼 요청 크기에 비례해 늘어날 수 있다.
 */
const PRIMARY_BASE_TIMEOUT_MS = 20_000;
const FALLBACK_BASE_TIMEOUT_MS = 15_000;

class TriageProviderUnavailableError extends Error {
  constructor() {
    super("Triage provider is not configured");
    this.name = "TriageProviderUnavailableError";
  }
}

/** 같은 실행 로그에 세 계열이 함께 찍히므로 경고마다 계열 라벨을 붙인다. */
const logLabel = (contract: { envPrefix: string }): string =>
  `[${contract.envPrefix.toLowerCase().replace(/_/g, "-")}]`;

const configured = <In, Out>(
  contract: TriageContract<In, Out>,
  fetcher: typeof fetch,
  name: string | undefined,
  key: string | undefined,
  model: string | undefined,
): TriageProvider<In, Out> | undefined => {
  // env 값의 공백·대소문자 차이가 provider 매칭을 조용히 무산시키지 않도록 정규화한다.
  const normalizedName = name?.trim().toLowerCase();
  if (normalizedName === "mock" && contract.mockResult) {
    const mockResult = contract.mockResult.bind(contract);
    return async (request, signal) => {
      if (signal.aborted) throw signal.reason;
      return { result: mockResult(request), provider: "mock", model: "mock" };
    };
  }

  const normalizedKey = key?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedKey || !normalizedModel) return undefined;
  if (normalizedName === "openai") {
    return createOpenAIAdapter(contract, normalizedKey, normalizedModel, fetcher);
  }
  if (normalizedName === "gemini") {
    return createGeminiAdapter(contract, normalizedKey, normalizedModel, fetcher);
  }
  return undefined;
};

const withTimeout = <In, Out>(
  provider: TriageProvider<In, Out>,
  contract: TriageContract<In, Out>,
  request: In,
  signal: AbortSignal,
  baseMs: number,
): ReturnType<TriageProvider<In, Out>> =>
  provider(
    request,
    AbortSignal.any([signal, AbortSignal.timeout(contract.timeoutMs(request, baseMs))]),
  );

/**
 * primary 가 실패하면 폴백을 한 번 시도한다. 외부 signal 이 abort 된 경우에는 어댑터가
 * 무엇을 던졌든 `signal.reason` 을 올리고 폴백하지 않는다. 취소는 실패가 아니라서
 * 폴백 호출이 유료 요청 하나를 더 만드는 것으로 끝나기 때문이다.
 */
const withFallback =
  <In, Out>(
    contract: TriageContract<In, Out>,
    primary: TriageProvider<In, Out>,
    fallback?: TriageProvider<In, Out>,
  ): TriageProvider<In, Out> =>
  async (request, signal) => {
    if (signal.aborted) throw signal.reason;
    try {
      return await withTimeout(primary, contract, request, signal, PRIMARY_BASE_TIMEOUT_MS);
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      if (!fallback) throw error;
      console.warn(`${logLabel(contract)} primary provider failed; falling back:`, error);
      try {
        return await withTimeout(fallback, contract, request, signal, FALLBACK_BASE_TIMEOUT_MS);
      } catch (fallbackError) {
        if (signal.aborted) throw signal.reason;
        throw fallbackError;
      }
    }
  };

/**
 * env 로 제공자를 골라 계약에 묶는다. 이름 규약은 세 계열과 챗봇(`CHAT_PROVIDER` 계열)이
 * 같다. 설정 누락은 배포 실수일 수 있어 조용히 가리지 않고 경고를 남긴다.
 *
 * @returns 설정된 제공자. 아무것도 설정되지 않았으면 호출 시
 *   `TriageProviderUnavailableError` 를 던지는 제공자.
 */
const createTriageProvider = <In, Out>(
  contract: TriageContract<In, Out>,
  options: { fetcher?: typeof fetch } = {},
): TriageProvider<In, Out> => {
  // 어댑터 네 인스턴스(primary·fallback × OpenAI·Gemini)가 같은 fetcher 를 쓴다.
  const fetcher = options.fetcher ?? fetch;
  const label = logLabel(contract);
  const env = (suffix: string): string | undefined => process.env[`${contract.envPrefix}${suffix}`];

  const primary = configured(
    contract,
    fetcher,
    env("_PROVIDER"),
    env("_PROVIDER_API_KEY"),
    env("_PROVIDER_MODEL"),
  );
  const fallback = configured(
    contract,
    fetcher,
    env("_FALLBACK_PROVIDER"),
    env("_FALLBACK_PROVIDER_API_KEY"),
    env("_FALLBACK_PROVIDER_MODEL"),
  );

  if (!fallback && env("_FALLBACK_PROVIDER")?.trim()) {
    console.warn(
      `${label} ${contract.envPrefix}_FALLBACK_PROVIDER is set but the name is unknown or the key/model is missing; running without fallback`,
    );
  }

  if (!primary) {
    if (!fallback) {
      console.warn(
        `${label} no triage provider is configured; alerts will go out without a verdict`,
      );
      return async (_request, signal) => {
        if (signal.aborted) throw signal.reason;
        throw new TriageProviderUnavailableError();
      };
    }
    console.warn(`${label} primary provider is not configured; promoting fallback to primary`);
    return withFallback(contract, fallback);
  }

  return withFallback(contract, primary, fallback);
};

export { createTriageProvider, TriageProviderUnavailableError };
