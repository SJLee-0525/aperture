import { createGeminiProvider } from "@/lib/dependency-security/gemini-triage-provider";
import { createOpenAIProvider } from "@/lib/dependency-security/openai-triage-provider";

import type { DependencyTriageResult } from "@/lib/dependency-security/triage-schema";
import type { DependencySecurityFact } from "@/lib/dependency-security/types";

type DependencyTriageProvider = (input: {
  facts: DependencySecurityFact[];
  signal: AbortSignal;
}) => Promise<{ results: DependencyTriageResult[]; provider: string; model: string }>;

const configured = (
  name?: string,
  key?: string,
  model?: string,
): DependencyTriageProvider | null => {
  const normalizedName = name?.trim().toLowerCase();
  const normalizedKey = key?.trim();
  const normalizedModel = model?.trim();
  if (!normalizedKey || !normalizedModel) return null;
  if (normalizedName === "openai") return createOpenAIProvider(normalizedKey, normalizedModel);
  if (normalizedName === "gemini") return createGeminiProvider(normalizedKey, normalizedModel);
  return null;
};

/** primary 실패 시 fallback을 한 번 시도하며 전체 호출을 35초 안에 끝낸다. */
const getDependencyTriageProvider = (): DependencyTriageProvider | null => {
  const primary = configured(
    process.env.DEPENDENCY_TRIAGE_PROVIDER,
    process.env.DEPENDENCY_TRIAGE_PROVIDER_API_KEY,
    process.env.DEPENDENCY_TRIAGE_PROVIDER_MODEL,
  );
  const fallback = configured(
    process.env.DEPENDENCY_TRIAGE_FALLBACK_PROVIDER,
    process.env.DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_API_KEY,
    process.env.DEPENDENCY_TRIAGE_FALLBACK_PROVIDER_MODEL,
  );
  if (!primary) return fallback;
  if (!fallback) return primary;
  return async (input) => {
    try {
      return await primary({
        ...input,
        signal: AbortSignal.any([input.signal, AbortSignal.timeout(20_000)]),
      });
    } catch (error) {
      if (input.signal.aborted) throw error;
      console.warn("[dependency-triage] primary failed; using fallback");
      return fallback({
        ...input,
        signal: AbortSignal.any([input.signal, AbortSignal.timeout(15_000)]),
      });
    }
  };
};

export { getDependencyTriageProvider };
export type { DependencyTriageProvider };
