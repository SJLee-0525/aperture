import { createGeminiPerformanceTriageProvider } from "@/lib/performance-alerts/gemini-triage-provider";
import { createOpenAIPerformanceTriageProvider } from "@/lib/performance-alerts/openai-triage-provider";

import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type { PerformanceTriageResult } from "@/lib/performance-alerts/triage-schema";

type PerformanceTriageProviderResult = {
  result: PerformanceTriageResult;
  provider: "openai" | "gemini" | "mock";
  model: string;
};
type PerformanceTriageProvider = (request: {
  input: PerformanceTriageInput;
  signal: AbortSignal;
}) => Promise<PerformanceTriageProviderResult>;

const MOCK_RESULT: PerformanceTriageResult = {
  summary: "성능 경고가 감지됐습니다.",
  userImpact: "측정값을 직접 확인해야 합니다.",
  likelyCauses: [],
  inspectFirst: [],
  recommendedChecks: ["npm run test:lighthouse:production"],
  confidence: "low",
};

const unavailable: PerformanceTriageProvider = async () => {
  throw new Error("Performance triage provider is not configured");
};
const mock: PerformanceTriageProvider = async ({ signal }) => {
  if (signal.aborted) throw signal.reason;
  return { result: MOCK_RESULT, provider: "mock", model: "mock" };
};

const configured = (
  name: string | undefined,
  key: string | undefined,
  model: string | undefined,
): PerformanceTriageProvider | undefined => {
  const provider = name?.trim().toLowerCase();
  if (provider === "mock") return mock;
  if (!key?.trim() || !model?.trim()) return undefined;
  if (provider === "openai") return createOpenAIPerformanceTriageProvider(key.trim(), model.trim());
  if (provider === "gemini") return createGeminiPerformanceTriageProvider(key.trim(), model.trim());
  return undefined;
};

/** primary가 실패하면 한 번만 fallback을 호출하며 전체 요청 취소는 그대로 전파한다. */
const withFallback =
  (
    primary: PerformanceTriageProvider,
    fallback?: PerformanceTriageProvider,
  ): PerformanceTriageProvider =>
  async (request) => {
    try {
      return await primary({
        ...request,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
      });
    } catch (error) {
      if (request.signal.aborted || !fallback) throw error;
      return fallback({
        ...request,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
      });
    }
  };

/** 설정이 없거나 잘못된 경우 호출 시 실패하는 provider를 반환해 기본 카드 경로를 유지한다. */
const getPerformanceTriageProvider = (): PerformanceTriageProvider => {
  const primary = configured(
    process.env.PERFORMANCE_TRIAGE_PROVIDER,
    process.env.PERFORMANCE_TRIAGE_PROVIDER_API_KEY,
    process.env.PERFORMANCE_TRIAGE_PROVIDER_MODEL,
  );
  const fallback = configured(
    process.env.PERFORMANCE_TRIAGE_FALLBACK_PROVIDER,
    process.env.PERFORMANCE_TRIAGE_FALLBACK_PROVIDER_API_KEY,
    process.env.PERFORMANCE_TRIAGE_FALLBACK_PROVIDER_MODEL,
  );
  if (!primary) return fallback ?? unavailable;
  return withFallback(primary, fallback);
};

export { getPerformanceTriageProvider, withFallback };
export type { PerformanceTriageProvider, PerformanceTriageProviderResult };
