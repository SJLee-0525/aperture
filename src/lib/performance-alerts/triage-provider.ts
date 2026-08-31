import {
  buildPerformanceTriageInput,
  PERFORMANCE_TRIAGE_INSTRUCTIONS,
  performanceTriageOutputTokens,
  performanceTriageTimeout,
} from "@/lib/performance-alerts/triage-prompt";
import {
  buildPerformanceTriageSchema,
  parsePerformanceTriageResult,
} from "@/lib/performance-alerts/triage-schema";
import { createTriageProvider } from "@/lib/triage/provider";

import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type { PerformanceTriageResult } from "@/lib/performance-alerts/triage-schema";
import type { TriageContract, TriageProvider, TriageResponse } from "@/lib/triage/contract";

const mockResult = (targets: number): PerformanceTriageResult => ({
  commonSummary: "성능 경고가 감지됐습니다.",
  commonCauses: [],
  targets: Array.from({ length: targets }, (_, targetIndex) => ({
    targetIndex,
    summary: "성능 경고가 감지됐습니다.",
    userImpact: "측정값을 직접 확인해야 합니다.",
    likelyCauses: [],
    inspectFirst: [],
    recommendedChecks: ["npm run test:lighthouse:production"],
    confidence: "low" as const,
  })),
});

/**
 * 이 계열의 판정 계약. 전송(제공자 선택·폴백·타임아웃)은 `lib/triage` 가 소유한다.
 * 출력 예산·구간 상한·파서가 모두 대상 수의 함수라 상수로 둘 수 없다.
 */
const PERFORMANCE_TRIAGE_CONTRACT: TriageContract<
  PerformanceTriageInput[],
  PerformanceTriageResult
> = {
  envPrefix: "PERFORMANCE_TRIAGE",
  schemaName: "performance_triage",
  instructions: PERFORMANCE_TRIAGE_INSTRUCTIONS,
  buildInput: buildPerformanceTriageInput,
  schema: (strict) => buildPerformanceTriageSchema({ strict }),
  parse: (text, inputs) => parsePerformanceTriageResult(text, inputs.length),
  outputTokens: (inputs) => performanceTriageOutputTokens(inputs.length),
  timeoutMs: (inputs, base) => performanceTriageTimeout(inputs.length, base),
  mockResult: (inputs) => mockResult(inputs.length),
};

type PerformanceTriageProvider = TriageProvider<PerformanceTriageInput[], PerformanceTriageResult>;
type PerformanceTriageProviderResult = TriageResponse<PerformanceTriageResult>;

const getPerformanceTriageProvider = (): PerformanceTriageProvider =>
  createTriageProvider(PERFORMANCE_TRIAGE_CONTRACT);

export { getPerformanceTriageProvider, PERFORMANCE_TRIAGE_CONTRACT };
export type { PerformanceTriageProvider, PerformanceTriageProviderResult };
