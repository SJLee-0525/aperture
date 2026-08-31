import { fitEmbed } from "@/lib/discord/embed-budget";

import type { DiscordEmbed } from "@/lib/discord/types";
import type { SentryAlertSummary, TriageOutcome, TriageSeverity } from "@/types/sentry-alert";

/**
 * Discord 전용 색상. 사이트 액센트 토큰과 무관하다.
 * 노이즈 판정은 심각도와 상관없이 회색으로 내려 목록에서 눈에 덜 걸리게 한다.
 */
const SEVERITY_COLOR: Record<TriageSeverity, number> = {
  critical: 0xe5484d,
  high: 0xf5820d,
  medium: 0xd4a72c,
  low: 0x6e7681,
};

const NOISE_COLOR = 0x4a4a4a;
const UNTRIAGED_COLOR = 0x8b8d98;

const SEVERITY_LABEL: Record<TriageSeverity, string> = {
  critical: "치명",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const footerText = (alert: SentryAlertSummary, suffix: string): string =>
  [alert.environment, alert.release, alert.triggeredRule, suffix].filter(Boolean).join(" · ");

/**
 * 판정 결과가 있는 카드. 심각도를 제목 앞에 붙여 목록에서 정렬 없이도 눈에 들어오게 한다.
 */
const triagedEmbed = (
  alert: SentryAlertSummary,
  outcome: Extract<TriageOutcome, { status: "ok" }>,
): DiscordEmbed => {
  const { result } = outcome;
  const prefix = result.isNoise ? "노이즈" : SEVERITY_LABEL[result.severity];
  const cause = [result.probableCause, result.suspectArea && `위치: ${result.suspectArea}`]
    .filter(Boolean)
    .join("\n");
  const actions = result.recommendedActions
    .map((action, index) => `${index + 1}. ${action}`)
    .join("\n");

  return fitEmbed({
    title: `[${prefix}] ${alert.title}`,
    url: alert.webUrl,
    description: result.userImpact,
    color: result.isNoise ? NOISE_COLOR : SEVERITY_COLOR[result.severity],
    fields: [
      { name: "추정 원인", value: cause || "판정 없음" },
      ...(actions ? [{ name: "권장 조치", value: actions }] : []),
    ],
    footer: {
      text: footerText(alert, `${outcome.provider}/${outcome.model} · 확신도 ${result.confidence}`),
    },
  });
};

/**
 * 판정 없이 나가는 카드. LLM 실패·상한 초과·스키마 파싱 실패에서 쓴다.
 * 알림 경로가 이 파이프라인 하나뿐이라 판정을 못 해도 카드는 반드시 나가야 한다.
 */
const untriagedEmbed = (alert: SentryAlertSummary, reason: string): DiscordEmbed => {
  const context = [alert.level && `level: ${alert.level}`, alert.culprit]
    .filter(Boolean)
    .join("\n");

  return fitEmbed({
    title: alert.title,
    url: alert.webUrl,
    description: `AI 트리아지 없음: ${reason}`,
    color: UNTRIAGED_COLOR,
    fields: context ? [{ name: "이벤트", value: context }] : [],
    footer: { text: footerText(alert, "판정 없음") },
  });
};

/**
 * 판정 성공 여부와 무관하게 카드 하나를 만든다.
 *
 * @param alert 화이트리스트로 추린 이벤트 요약.
 * @param outcome 판정 결과 또는 실패 사유.
 * @returns Discord webhook 본문에 실을 embed.
 */
const buildDiscordCard = (alert: SentryAlertSummary, outcome: TriageOutcome): DiscordEmbed =>
  outcome.status === "ok" ? triagedEmbed(alert, outcome) : untriagedEmbed(alert, outcome.reason);

export { buildDiscordCard, NOISE_COLOR, SEVERITY_COLOR, UNTRIAGED_COLOR };
