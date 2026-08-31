import { buildTriageInput, TRIAGE_INSTRUCTIONS } from "@/lib/sentry-triage/triage-prompt";
import { buildTriageSchema, parseTriageResult } from "@/lib/sentry-triage/triage-schema";
import { createTriageProvider } from "@/lib/triage/provider";

import type { TriageContract, TriageProvider } from "@/lib/triage/contract";
import type { SentryAlertSummary, TriageResult } from "@/types/sentry-alert";

const MOCK_RESULT: TriageResult = {
  severity: "medium",
  isNoise: false,
  userImpact: "목 판정입니다. 실제 제공자가 설정되지 않았습니다.",
  probableCause: "TRIAGE_PROVIDER 가 mock 으로 설정돼 있습니다.",
  suspectArea: "",
  recommendedActions: ["TRIAGE_PROVIDER 와 키를 설정한다"],
  confidence: "low",
};

/** 이 계열의 판정 계약. 전송(제공자 선택·폴백·타임아웃)은 `lib/triage` 가 소유한다. */
const SENTRY_TRIAGE_CONTRACT: TriageContract<SentryAlertSummary, TriageResult> = {
  envPrefix: "TRIAGE",
  schemaName: "sentry_triage",
  instructions: TRIAGE_INSTRUCTIONS,
  buildInput: buildTriageInput,
  schema: (strict) => buildTriageSchema({ strict }),
  parse: (text) => parseTriageResult(text),
  outputTokens: () => 1_500,
  timeoutMs: (_request, base) => base,
  mockResult: () => MOCK_RESULT,
};

type SentryTriageProvider = TriageProvider<SentryAlertSummary, TriageResult>;

const getTriageProvider = (): SentryTriageProvider => createTriageProvider(SENTRY_TRIAGE_CONTRACT);

export { getTriageProvider, SENTRY_TRIAGE_CONTRACT };
export type { SentryTriageProvider };
