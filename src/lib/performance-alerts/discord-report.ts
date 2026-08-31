import { fitEmbed } from "@/lib/discord/embed-budget";
import { formatDelta, severityRatio } from "@/lib/performance-alerts/metric-descriptor";

import type { BudgetPolicy } from "@/lib/discord/embed-budget";
import type { DiscordEmbed } from "@/lib/discord/types";
import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type { PerformanceTriageProviderResult } from "@/lib/performance-alerts/triage-provider";
import type { PerformanceTriageTarget } from "@/lib/performance-alerts/triage-schema";

type ReportKind = "field" | "lab" | "combined" | "insufficient_data" | "baseline";
type PerformanceReport = {
  kind: ReportKind;
  targetUrl: string;
  formFactor: string;
  measuredAt: string;
  collectionPeriod?: string;
  fieldSummary?: string;
  labSummary?: string;
  actionsRunUrl: string;
  artifactName: string;
};

const colorByKind: Record<ReportKind, number> = {
  field: 0xe5484d,
  lab: 0xf59e0b,
  combined: 0xb4232d,
  insufficient_data: 0x64748b,
  baseline: 0x2e7d32,
};

const titleByKind: Record<ReportKind, string> = {
  field: "Core Web Vitals field 회귀",
  lab: "Lighthouse lab 회귀",
  combined: "Core Web Vitals field 및 lab 회귀",
  insufficient_data: "Core Web Vitals 데이터 부족",
  baseline: "Core Web Vitals 기준선",
};

/**
 * 통합 카드가 field 다섯 개로 요약을 유지하도록 Discord 상한보다 좁게 쓴다.
 * 상한 자체는 `fitEmbed` 기본값이 강제하므로 여기서는 표시 밀도만 정한다.
 */
const PERFORMANCE_EMBED_POLICY: BudgetPolicy = { description: 1_000, footer: 500, fields: 10 };

const fitPerformanceEmbed = (embed: DiscordEmbed): DiscordEmbed =>
  fitEmbed(embed, PERFORMANCE_EMBED_POLICY);

const triageFooter = (analysis: PerformanceTriageProviderResult, targets: number): string =>
  targets < 2
    ? `${analysis.provider}/${analysis.model} · confidence ${analysis.result.targets[0]?.confidence ?? "unknown"}`
    : `${analysis.provider}/${analysis.model} · ${targets}개 대상 통합 분석`;

type TriageEntry = { card: DiscordEmbed; label: string; input?: PerformanceTriageInput };

const targetMetrics = (
  entries: TriageEntry[],
  predicate: (metric: PerformanceTriageInput["metrics"][number]) => boolean,
): number => entries.filter((entry) => entry.input?.metrics.some(predicate)).length;

const mergedStatus = (entries: TriageEntry[]): string => {
  const lcpPoor = targetMetrics(
    entries,
    (metric) => metric.metric.toUpperCase() === "LCP" && metric.status === "poor",
  );
  const worsened = targetMetrics(
    entries,
    (metric) =>
      metric.metric.toUpperCase() === "LCP" &&
      metric.previous !== null &&
      metric.current > metric.previous,
  );
  const improved = targetMetrics(
    entries,
    (metric) =>
      metric.metric.toUpperCase() === "LCP" &&
      metric.previous !== null &&
      metric.current < metric.previous,
  );
  const tbtIncreased = targetMetrics(
    entries,
    (metric) =>
      metric.metric.toUpperCase() === "TBT" &&
      metric.previous !== null &&
      metric.current > metric.previous,
  );
  const clsPoor = targetMetrics(
    entries,
    (metric) => metric.metric.toUpperCase() === "CLS" && metric.status === "poor",
  );
  return `LCP 불량 ${lcpPoor} · 이전보다 악화 ${worsened} · 개선 ${improved}\nTBT 증가 ${tbtIncreased} · CLS 문제 ${clsPoor}`;
};

const mergedChecks = (targets: PerformanceTriageTarget[]): string => {
  const checks = [
    ...new Set(targets.flatMap((target) => [...target.inspectFirst, ...target.recommendedChecks])),
  ].slice(0, 3);
  return checks.length
    ? checks.map((check, index) => `${index + 1}. ${check}`).join("\n")
    : "제안 없음";
};

/**
 * 악화 판정과 정렬은 metric의 방향과 단위를 아는 metric-descriptor에 맡긴다.
 * 원시 delta로 비교하면 ms metric이 항상 CLS를 이기고 performanceScore 상승이 악화가 된다.
 */
const worstTargets = (entries: TriageEntry[]): string => {
  const ranked = entries
    .flatMap((entry) => {
      const changes =
        entry.input?.metrics.flatMap((metric) => {
          if (metric.previous === null) return [];
          const severity = severityRatio(metric.metric, metric.current, metric.previous);
          return severity === null
            ? []
            : [
                {
                  metric: metric.metric,
                  current: metric.current,
                  previous: metric.previous,
                  severity,
                },
              ];
        }) ?? [];
      const worst = changes.sort((a, b) => b.severity - a.severity)[0];
      return worst ? [{ label: entry.label.split("\n")[0]!, ...worst }] : [];
    })
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3);
  return ranked.length
    ? ranked
        .map(
          (item) =>
            `• ${item.label} — ${item.metric} ${formatDelta(item.metric, item.current, item.previous)}`,
        )
        .join("\n")
    : "이전 측정 대비 악화 대상 없음";
};

/**
 * AI 설명은 기존 수치 field 뒤에 추가해 성공과 실패 카드의 측정 사실을 동일하게 유지한다.
 * provider 원본 응답은 받지 않고 schema 검증을 통과한 결과와 provider 식별자만 표시한다.
 */
const attachPerformanceTriage = (
  embed: DiscordEmbed,
  target: PerformanceTriageTarget,
  footer: string,
): DiscordEmbed => {
  const steps = [...target.inspectFirst, ...target.recommendedChecks];
  const explanation = [
    { name: "AI 요약", value: target.summary },
    { name: "사용자 영향", value: target.userImpact },
    {
      name: "원인 후보",
      value: target.likelyCauses.length
        ? target.likelyCauses.map((item) => `- ${item}`).join("\n")
        : "근거 부족",
    },
    {
      name: "확인 순서",
      // Discord 는 값이 빈 field 를 400 으로 거부하므로 목록이 비면 카드 자체가 나가지 못한다.
      value: steps.length
        ? steps.map((item, index) => `${index + 1}. ${item}`).join("\n")
        : "제안 없음",
    },
  ];
  return fitPerformanceEmbed({
    ...embed,
    description: "측정값은 코드가 판정했고 AI는 원인 후보와 확인 순서만 작성했습니다.",
    fields: [...(embed.fields ?? []), ...explanation],
    footer: { text: footer },
  });
};

/**
 * batch 분석 한 번의 결과를 카드로 만든다. entries[i]는 analysis.result.targets[i]와 짝이며
 * 수가 어긋나면 분석을 붙이지 않고 측정값 카드를 그대로 돌려준다.
 */
const buildPerformanceTriageCards = (
  entries: TriageEntry[],
  analysis: PerformanceTriageProviderResult,
): DiscordEmbed[] => {
  const targets = analysis.result.targets;
  if (!entries.length || entries.length !== targets.length) {
    return entries.map((entry) => entry.card);
  }
  const footer = triageFooter(analysis, entries.length);
  if (entries.length === 1) return [attachPerformanceTriage(entries[0]!.card, targets[0]!, footer)];

  // 같은 url을 두 문구가 쓰므로 한 번만 읽어 링크와 평문 폴백을 같은 조건에서 만든다.
  const runUrl = entries[0]!.card.url;
  const actionsRun = runUrl ? `[Actions run](${runUrl})` : "Actions run에서 확인";
  const lighthouseLink = runUrl
    ? `[Lighthouse 결과](${runUrl}#artifacts)`
    : "실행 artifact에서 Lighthouse 결과 확인";
  return [
    fitPerformanceEmbed({
      ...entries[0]!.card,
      title: `Core Web Vitals — ${entries.length}개 경고`,
      description: analysis.result.commonSummary,
      fields: [
        { name: "현황", value: mergedStatus(entries) },
        ...(analysis.result.commonCauses.length
          ? [
              {
                name: "공통 원인",
                value: analysis.result.commonCauses
                  .slice(0, 3)
                  .map((item) => `- ${item}`)
                  .join("\n"),
              },
            ]
          : []),
        { name: "우선 확인", value: mergedChecks(targets) },
        { name: "가장 크게 악화", value: worstTargets(entries) },
        {
          name: "상세",
          value: `${actionsRun} · ${lighthouseLink}\n${entries.length}개 대상의 전체 분석은 Actions summary와 core-web-vitals-ai-report artifact에 있습니다.`,
        },
      ],
      footer: { text: footer },
    }),
  ];
};

/**
 * 정상 측정은 기본적으로 카드를 만들지 않으며 수동 baseline 요청만 예외로 허용한다.
 * AI 분석이 없어도 확인 가능한 수치와 실행 링크는 항상 포함한다.
 */
const createPerformanceDiscordCard = (
  report: PerformanceReport | null,
  sendBaseline = false,
): DiscordEmbed | null => {
  if (!report) return null;
  if (report.kind === "baseline" && !sendBaseline) return null;

  const fields = [
    { name: "대상", value: `${report.targetUrl}\n${report.formFactor}` },
    ...(report.fieldSummary ? [{ name: "Field", value: report.fieldSummary }] : []),
    ...(report.labSummary ? [{ name: "Lab", value: report.labSummary }] : []),
    {
      name: "측정",
      value: [
        `측정 시각: ${report.measuredAt}`,
        report.collectionPeriod ? `CrUX 기간: ${report.collectionPeriod}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      name: "결과",
      value: `[Actions run](${report.actionsRunUrl})\nArtifact: ${report.artifactName}`,
    },
  ];

  return fitPerformanceEmbed({
    title: titleByKind[report.kind],
    url: report.actionsRunUrl,
    description:
      report.kind === "insufficient_data"
        ? "CrUX 공개 표본이 부족합니다. Lighthouse 결과는 별도로 확인하세요."
        : "AI 분석 없이 측정값과 고정 규칙으로 만든 알림입니다.",
    color: colorByKind[report.kind],
    fields,
    footer: { text: "AI 분석 없음" },
  });
};

export { attachPerformanceTriage, buildPerformanceTriageCards, createPerformanceDiscordCard };
export type { PerformanceReport };
