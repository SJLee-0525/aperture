import { buildTriageInput, INSTRUCTIONS } from "@/lib/dependency-security/triage-prompt";
import { parseTriageResults, schemaFor } from "@/lib/dependency-security/triage-schema";
import { createTriageProvider } from "@/lib/triage/provider";

import type { DependencyTriageResult } from "@/lib/dependency-security/triage-schema";
import type { DependencySecurityFact } from "@/lib/dependency-security/types";
import type { TriageContract, TriageProvider } from "@/lib/triage/contract";

const mockResults = (facts: DependencySecurityFact[]): DependencyTriageResult[] =>
  facts.map((fact) => ({
    alertNumber: fact.alertNumber,
    impact: "목 판정입니다. 실제 제공자가 설정되지 않았습니다.",
    priorityReason: "DEPENDENCY_TRIAGE_PROVIDER 가 mock 으로 설정돼 있습니다.",
    recommendedChecks: ["DEPENDENCY_TRIAGE_PROVIDER 와 키를 설정한다"],
    confidence: "low",
  }));

/** 이 계열의 판정 계약. 전송(제공자 선택·폴백·타임아웃)은 `lib/triage` 가 소유한다. */
const DEPENDENCY_TRIAGE_CONTRACT: TriageContract<
  DependencySecurityFact[],
  DependencyTriageResult[]
> = {
  envPrefix: "DEPENDENCY_TRIAGE",
  schemaName: "dependency_triage",
  instructions: INSTRUCTIONS,
  buildInput: buildTriageInput,
  schema: schemaFor,
  parse: (text) => parseTriageResults(text),
  outputTokens: () => 3_000,
  timeoutMs: (_request, base) => base,
  mockResult: mockResults,
};

type DependencyTriageProvider = TriageProvider<DependencySecurityFact[], DependencyTriageResult[]>;

const getDependencyTriageProvider = (): DependencyTriageProvider =>
  createTriageProvider(DEPENDENCY_TRIAGE_CONTRACT);

export { DEPENDENCY_TRIAGE_CONTRACT, getDependencyTriageProvider };
export type { DependencyTriageProvider };
