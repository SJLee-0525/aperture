import type { DependencyTriageResult } from "@/lib/dependency-security/triage-schema";
import type { DependencySecurityFact, Severity } from "@/lib/dependency-security/types";
import type { DiscordEmbed } from "@/lib/discord/types";

const MAX = { fieldName: 256, fieldValue: 1024, fields: 25, total: 6000 } as const;
const ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_COLOR: Record<Severity, number> = {
  critical: 0xe5484d,
  high: 0xf5820d,
  medium: 0xd4a72c,
  low: 0x6e7681,
};
const EMPTY_COLOR = 0x8b8d98;
const BAND = {
  immediate: "즉시 확인",
  "this-week": "이번 주",
  planned: "계획",
  watch: "관찰",
} as const;
const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;
const embedLength = (embed: DiscordEmbed): number =>
  embed.title.length +
  (embed.description?.length ?? 0) +
  (embed.footer?.text.length ?? 0) +
  (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0);

const fieldFor = (fact: DependencySecurityFact, triage?: DependencyTriageResult) => {
  const installed = fact.vulnerableInstalledVersions.length
    ? fact.vulnerableInstalledVersions.join(", ")
    : fact.installedVersions.join(", ") || "unknown";
  const analysis = triage
    ? `\n\n영향\n${triage.impact}\n\n판단 근거\n${triage.priorityReason}\n\n확인 항목\n${triage.recommendedChecks.map((check, index) => `${index + 1}. ${check}`).join("\n")}\n\n확신도 ${triage.confidence}`
    : "";
  return {
    name: truncate(
      `${fact.isNew ? "NEW · " : ""}${fact.severity.toUpperCase()} · ${fact.packageName}`,
      MAX.fieldName,
    ),
    value: truncate(
      `${BAND[fact.priority]} · ${fact.scope}/${fact.relationship}\n${[fact.cveId, fact.ghsaId].filter(Boolean).join(" · ")}\ninstalled ${installed} · patched ${fact.firstPatchedVersion ?? "수정 버전 미공개"}${analysis}\n[Alert #${fact.alertNumber}](${fact.alertUrl})`,
      MAX.fieldValue,
    ),
  };
};

/**
 * Discord의 필드별 제한과 embed 전체 6,000자 제한을 전송 전에 적용한다.
 * 잘린 alert도 상단 합계에는 남는다.
 */
const buildDependencySecurityReport = (
  facts: DependencySecurityFact[],
  now = new Date(),
  triage: DependencyTriageResult[] = [],
  providerLabel?: string,
): DiscordEmbed => {
  const sorted = [...facts].sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity] || Number(b.isNew) - Number(a.isNew),
  );
  const count = (severity: Severity) => facts.filter((fact) => fact.severity === severity).length;
  const embed: DiscordEmbed = {
    title: "Weekly Dependency Security Report",
    description:
      facts.length === 0
        ? "현재 열린 Dependabot alert가 없습니다."
        : `Open ${facts.length} · New ${facts.filter((fact) => fact.isNew).length} · Continuing ${facts.filter((fact) => !fact.isNew).length}\nCritical ${count("critical")} · High ${count("high")} · Medium ${count("medium")} · Low ${count("low")}`,
    color: sorted[0] ? SEVERITY_COLOR[sorted[0].severity] : EMPTY_COLOR,
    fields: sorted.slice(0, MAX.fields).map((fact) =>
      fieldFor(
        fact,
        triage.find((item) => item.alertNumber === fact.alertNumber),
      ),
    ),
    footer: {
      text: `generated ${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(now)} KST${providerLabel ? ` · ${providerLabel}` : " · AI 없음"}`,
    },
  };
  while ((embed.fields?.length ?? 0) > 0 && embedLength(embed) > MAX.total) embed.fields?.pop();
  return embed;
};

export { buildDependencySecurityReport, embedLength };
