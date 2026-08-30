import type { DiscordEmbed } from "@/lib/discord/types";

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
    fields: embed.fields?.slice(0, 5).map((field) => ({
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
  createPerformanceDiscordCard,
  DISCORD_EMBED_LIMIT,
  DISCORD_FIELD_LIMIT,
  embedLength,
  fitEmbed,
};
export type { PerformanceReport };
