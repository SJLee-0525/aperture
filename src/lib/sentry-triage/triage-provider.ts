import { createGeminiTriageProvider } from "@/lib/sentry-triage/gemini-triage-provider";
import { createOpenAITriageProvider } from "@/lib/sentry-triage/openai-triage-provider";

import type { SentryAlertSummary, TriageResult } from "@/types/sentry-alert";

type TriageProviderInput = {
  summary: SentryAlertSummary;
  signal: AbortSignal;
};

/** 어느 제공자가 답했는지 함께 돌려준다. 폴백으로 넘어간 사실이 카드와 기록에 남아야 한다. */
type TriageProviderResult = {
  result: TriageResult;
  provider: string;
  model: string;
};

type TriageProvider = (input: TriageProviderInput) => Promise<TriageProviderResult>;

/**
 * 구간별 상한. 폴백까지 간 뒤 Discord 가 429 로 재시도하면 함수 실행 상한(60초)에 닿는다.
 * LLM 전체를 35초로 묶어 카드 전송과 기록 몫을 남긴다 (docs/plan/10 §4 시간 예산).
 */
const PRIMARY_TIMEOUT_MS = 20_000;
const FALLBACK_TIMEOUT_MS = 15_000;

const MOCK_RESULT: TriageResult = {
  severity: "medium",
  isNoise: false,
  userImpact: "목 판정입니다. 실제 제공자가 설정되지 않았습니다.",
  probableCause: "TRIAGE_PROVIDER 가 mock 으로 설정돼 있습니다.",
  suspectArea: "",
  recommendedActions: ["TRIAGE_PROVIDER 와 키를 설정한다"],
  confidence: "low",
};

class TriageProviderUnavailableError extends Error {
  constructor() {
    super("Triage provider is not configured");
    this.name = "TriageProviderUnavailableError";
  }
}

const unavailableTriageProvider: TriageProvider = async () => {
  throw new TriageProviderUnavailableError();
};

const mockTriageProvider: TriageProvider = async ({ signal }) => {
  if (signal.aborted) throw signal.reason;
  return { result: MOCK_RESULT, provider: "mock", model: "mock" };
};

const withTimeout = (
  provider: TriageProvider,
  input: TriageProviderInput,
  timeoutMs: number,
): Promise<TriageProviderResult> =>
  provider({
    ...input,
    signal: AbortSignal.any([input.signal, AbortSignal.timeout(timeoutMs)]),
  });

/**
 * primary 가 실패하면 폴백을 시도한다. 요청 전체가 취소된 경우에는 폴백하지 않는다.
 * 스트리밍이 없어 챗봇의 "첫 출력 전까지만" 판단이 필요 없고 상한이 단순하다.
 */
const withFallback =
  (primary: TriageProvider, fallback: TriageProvider): TriageProvider =>
  async (input) => {
    try {
      return await withTimeout(primary, input, PRIMARY_TIMEOUT_MS);
    } catch (error) {
      if (input.signal.aborted) throw error;
      console.warn("[triage-provider] primary provider failed; falling back:", error);
      return withTimeout(fallback, input, FALLBACK_TIMEOUT_MS);
    }
  };

const configuredProvider = (
  provider: string | undefined,
  apiKey: string | undefined,
  model: string | undefined,
): TriageProvider | undefined => {
  // env 값의 공백·대소문자 차이가 provider 매칭을 조용히 무산시키지 않도록 정규화한다.
  const normalizedProvider = provider?.trim().toLowerCase();
  const normalizedKey = apiKey?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedKey || !normalizedModel) return undefined;
  if (normalizedProvider === "openai") {
    return createOpenAITriageProvider(normalizedKey, normalizedModel);
  }
  if (normalizedProvider === "gemini") {
    return createGeminiTriageProvider(normalizedKey, normalizedModel);
  }
  return undefined;
};

/**
 * env 로 제공자를 고른다. 이름 규약은 챗봇(`CHAT_PROVIDER` 계열)과 같다.
 *
 * @returns 설정된 제공자. 아무것도 설정되지 않았으면 호출 시 예외를 던지는 제공자.
 */
const getTriageProvider = (): TriageProvider => {
  if (process.env.TRIAGE_PROVIDER?.trim().toLowerCase() === "mock") return mockTriageProvider;

  const primary = configuredProvider(
    process.env.TRIAGE_PROVIDER,
    process.env.TRIAGE_PROVIDER_API_KEY,
    process.env.TRIAGE_PROVIDER_MODEL,
  );
  const fallback = configuredProvider(
    process.env.TRIAGE_FALLBACK_PROVIDER,
    process.env.TRIAGE_FALLBACK_PROVIDER_API_KEY,
    process.env.TRIAGE_FALLBACK_PROVIDER_MODEL,
  );

  if (!fallback && process.env.TRIAGE_FALLBACK_PROVIDER?.trim()) {
    console.warn(
      "[triage-provider] TRIAGE_FALLBACK_PROVIDER is set but the name is unknown or the key/model is missing; running without fallback",
    );
  }

  if (!primary) {
    if (!fallback) {
      console.warn(
        "[triage-provider] no triage provider is configured; alerts will go out without a verdict",
      );
      return unavailableTriageProvider;
    }
    // 설정 누락은 배포 실수일 수 있어 조용히 가리지 않고 경고를 남긴 뒤 승격한다.
    console.warn(
      "[triage-provider] primary provider is not configured; promoting fallback to primary",
    );
    return fallback;
  }

  return fallback ? withFallback(primary, fallback) : primary;
};

export { getTriageProvider, TriageProviderUnavailableError };
export type { TriageProvider };
