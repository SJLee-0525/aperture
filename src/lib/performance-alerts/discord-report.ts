import type { DiscordEmbed } from "@/lib/discord/types";
import type { PerformanceTriageProviderResult } from "@/lib/performance-alerts/triage-provider";

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

/**
 * AI 설명은 기존 수치 field 뒤에 추가해 성공과 실패 카드의 측정 사실을 동일하게 유지한다.
 * provider 원본 응답은 받지 않고 schema 검증을 통과한 결과와 provider 식별자만 표시한다.
 */
const attachPerformanceTriage = (
  embed: DiscordEmbed,
  analysis: PerformanceTriageProviderResult,
): DiscordEmbed => {
  const result = analysis.result;
  const explanation = [
    { name: "AI 요약", value: result.summary },
    { name: "사용자 영향", value: result.userImpact },
    {
      name: "원인 후보",
      value: result.likelyCauses.length
        ? result.likelyCauses.map((item) => `- ${item}`).join("\n")
        : "근거 부족",
    },
    {
      name: "확인 순서",
      value: [...result.inspectFirst, ...result.recommendedChecks]
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n"),
    },
  ];
  return fitEmbed({
    ...embed,
    description: "측정값은 코드가 판정했고 AI는 원인 후보와 확인 순서만 작성했습니다.",
    fields: [...(embed.fields ?? []), ...explanation],
    footer: {
      text: `${analysis.provider}/${analysis.model} · confidence ${result.confidence}`,
    },
  });
};

/** 여러 대상의 분석 결과를 한 카드로 묶되, 측정 대상과 AI 요약의 대응 관계를 유지한다. */
const mergeAnalyzedPerformanceCards = (cards: DiscordEmbed[]): DiscordEmbed[] => {
  const analyzed = cards.filter((card) => card.footer?.text !== "AI 분석 없음");
  const untouched = cards.filter((card) => card.footer?.text === "AI 분석 없음");
  if (analyzed.length < 2) return cards;
  const sections = analyzed.map((card) => {
    const target = card.fields?.find((field) => field.name === "대상")?.value ?? "대상 미상";
    const summary = card.fields?.find((field) => field.name === "AI 요약")?.value ?? "요약 없음";
    const causes = card.fields?.find((field) => field.name === "원인 후보")?.value ?? "근거 부족";
    return { name: target, value: `요약: ${summary}\n원인 후보: ${causes}` };
  });
  const base = analyzed[0]!;
  return [
    fitEmbed({
      ...base,
      title: "Core Web Vitals 통합 AI 분석",
      description: "측정값은 코드가 판정했고 AI는 대상별 원인 후보와 확인 순서를 요약했습니다.",
      fields: sections,
      footer: { text: "여러 대상 통합 분석" },
    }),
    ...untouched,
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
  mergeAnalyzedPerformanceCards,
  createPerformanceDiscordCard,
  DISCORD_EMBED_LIMIT,
  DISCORD_FIELD_LIMIT,
  embedLength,
  fitEmbed,
};
export type { PerformanceReport };
