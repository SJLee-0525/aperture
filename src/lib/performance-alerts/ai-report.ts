import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type { PerformanceTriageProviderResult } from "@/lib/performance-alerts/triage-provider";
import type { PerformanceTriageTarget } from "@/lib/performance-alerts/triage-schema";

const HEADING = "# Performance AI report";

/** 제공자가 넣은 줄바꿈이 Markdown 목록과 표를 깨뜨리지 않게 한 줄로 만든다. */
const inline = (value: string): string => value.replace(/\s+/g, " ").trim();

const metricsTable = (metrics: PerformanceTriageInput["metrics"]): string => {
  if (!metrics.length) return "측정값 없음";
  return [
    "| source | metric | current | previous | status |",
    "| --- | --- | --- | --- | --- |",
    ...metrics.map(
      (metric) =>
        `| ${metric.source} | ${metric.metric} | ${metric.current} | ${metric.previous ?? "-"} | ${metric.status} |`,
    ),
  ].join("\n");
};

const bulletList = (items: string[], empty: string): string =>
  items.length ? items.map((item) => `- ${inline(item)}`).join("\n") : empty;

const orderedList = (items: string[], empty: string): string =>
  items.length ? items.map((item, index) => `${index + 1}. ${inline(item)}`).join("\n") : empty;

const targetSection = (
  input: PerformanceTriageInput,
  target: PerformanceTriageTarget,
  model: string,
): string =>
  [
    `## ${input.target} (${input.formFactor})`,
    "",
    `- scope: ${input.scope}`,
    `- 모델: ${model}`,
    `- confidence: ${target.confidence}`,
    ...(input.collectionPeriod ? [`- CrUX 기간: ${input.collectionPeriod}`] : []),
    ...(input.release ? [`- release: ${input.release}`] : []),
    "",
    "### AI 요약",
    "",
    inline(target.summary),
    "",
    "### 사용자 영향",
    "",
    inline(target.userImpact),
    "",
    "### 원인 후보",
    "",
    bulletList(target.likelyCauses, "근거 부족"),
    "",
    "### 확인 순서",
    "",
    orderedList([...target.inspectFirst, ...target.recommendedChecks], "제안 없음"),
    "",
    "### 측정값",
    "",
    metricsTable(input.metrics),
  ].join("\n");

/**
 * Discord 카드와 달리 길이 제한이 없으므로 schema 검증을 통과한 분석 결과를 그대로 남긴다.
 * Lighthouse 진단 문자열은 신뢰할 수 없어 포함하지 않는다.
 *
 * @param inputs 분석을 요청한 대상. analysis.result.targets와 같은 순서로 짝을 맞춘다.
 */
const renderPerformanceAiReport = (
  inputs: PerformanceTriageInput[],
  analysis: PerformanceTriageProviderResult | null,
): string => {
  const targets = analysis?.result.targets ?? [];
  if (!analysis || !inputs.length || inputs.length !== targets.length) {
    return `${HEADING}\n\n이번 실행에서 AI 분석이 생성되지 않았습니다.\n`;
  }
  const model = `${analysis.provider}/${analysis.model}`;
  const common = [
    "## 공통 분석",
    "",
    `- 모델: ${model}`,
    `- 대상 ${inputs.length}개를 한 번에 분석했습니다.`,
    "",
    inline(analysis.result.commonSummary),
    "",
    "### 공통 원인",
    "",
    bulletList(analysis.result.commonCauses, "공통 원인 없음"),
  ].join("\n");
  const sections = inputs.map((input, index) => targetSection(input, targets[index]!, model));
  return `${HEADING}\n\n${[common, ...sections].join("\n\n---\n\n")}\n`;
};

export { renderPerformanceAiReport };
