import type { DiscordEmbed } from "@/lib/discord/types";
import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type { PerformanceTriageProviderResult } from "@/lib/performance-alerts/triage-provider";
import type { PerformanceTriageTarget } from "@/lib/performance-alerts/triage-schema";

const DISCORD_FIELD_LIMIT = 1_024;
const DISCORD_EMBED_LIMIT = 6_000;

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

const truncate = (value: string, limit: number): string =>
  value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;

const embedLength = (embed: DiscordEmbed): number =>
  embed.title.length +
  (embed.description?.length ?? 0) +
  (embed.footer?.text.length ?? 0) +
  (embed.fields ?? []).reduce((total, field) => total + field.name.length + field.value.length, 0);

/** Discord가 카드 전체를 거부하지 않도록 field와 embed 상한을 전송 전에 함께 적용한다. */
const fitEmbed = (embed: DiscordEmbed): DiscordEmbed => {
  const result: DiscordEmbed = {
    ...embed,
    title: truncate(embed.title, 256),
    description: embed.description ? truncate(embed.description, 1_000) : undefined,
    footer: embed.footer ? { text: truncate(embed.footer.text, 500) } : undefined,
    fields: embed.fields?.slice(0, 10).map((field) => ({
      ...field,
      name: truncate(field.name, 256),
      value: truncate(field.value, DISCORD_FIELD_LIMIT),
    })),
  };

  while (embedLength(result) > DISCORD_EMBED_LIMIT && result.fields?.length) {
    result.fields.pop();
  }
  return result;
};

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

const worstTargets = (entries: TriageEntry[]): string => {
  const ranked = entries
    .flatMap((entry) => {
      const changes =
        entry.input?.metrics.flatMap((metric) =>
          metric.previous === null || metric.current <= metric.previous
            ? []
            : [{ metric: metric.metric, delta: metric.current - metric.previous }],
        ) ?? [];
      const worst = changes.sort((a, b) => b.delta - a.delta)[0];
      return worst ? [{ label: entry.label.split("\n")[0]!, ...worst }] : [];
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  return ranked.length
    ? ranked
        .map(
          (item) =>
            `• ${item.label} — ${item.metric} +${Math.round(item.delta)}${item.metric.toUpperCase() === "CLS" ? "" : "ms"}`,
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
  return fitEmbed({
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

  const actionsRun = entries[0]!.card.url
    ? `[Actions run](${entries[0]!.card.url})`
    : "Actions run에서 확인";
  return [
    fitEmbed({
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
          value: `${actionsRun} · [Lighthouse 결과](${entries[0]!.card.url}#artifacts)\n${entries.length}개 대상의 전체 분석은 Actions summary와 core-web-vitals-ai-report artifact에 있습니다.`,
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

  return fitEmbed({
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

export {
  attachPerformanceTriage,
  buildPerformanceTriageCards,
  createPerformanceDiscordCard,
  DISCORD_EMBED_LIMIT,
  DISCORD_FIELD_LIMIT,
  embedLength,
  fitEmbed,
};
export type { PerformanceReport };
