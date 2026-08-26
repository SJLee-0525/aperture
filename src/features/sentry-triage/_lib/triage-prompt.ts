import type { SentryAlertSummary } from "@/types/sentry-alert";

/**
 * 심각도 기준을 프롬프트에 못박아 모델마다 판정이 흔들리는 폭을 줄인다.
 * 같은 기준이 스키마 description 에도 있다. 제공자마다 어느 쪽을 더 따르는지 달라서
 * 양쪽에 둔다.
 */
const TRIAGE_INSTRUCTIONS = [
  "You triage production errors for a personal portfolio site built with Next.js, Supabase, and Vercel.",
  "You receive one Sentry issue alert. Decide how urgent it is and what the maintainer should do first.",
  "There is exactly one maintainer. Answer as if writing a note they read on their phone.",
  "",
  "Write every text field in Korean. Keep each field to one or two sentences.",
  "",
  "Severity:",
  "- critical: visitors cannot use a core path (public pages, chat, images) or data is corrupted.",
  "- high: a screen or feature is broken and there is no workaround.",
  "- medium: something is degraded but visitors can work around it.",
  "- low: one-off, external, or almost no visitor impact.",
  "",
  "Set isNoise only when the error is not ours to fix: browser extension scripts, third-party",
  "scripts with no application frame in the stack, or requests the visitor cancelled.",
  "",
  "recommendedActions must be concrete: a file to open, a condition to reproduce, a value to check.",
  "Never write generic advice such as adding monitoring, improving error handling, or investigating further.",
  "When the stack has no application frame, say so in probableCause and leave suspectArea empty.",
  "",
  "State uncertainty in confidence rather than hedging inside the text fields.",
].join("\n");

/** 지시문과 데이터를 가르는 표시. `TRIAGE_INSTRUCTIONS` 가 같은 이름을 언급한다. */
const ALERT_DATA_START = "----- BEGIN ALERT DATA -----";
const ALERT_DATA_END = "----- END ALERT DATA -----";

const frameLine = (frame: SentryAlertSummary["frames"][number]): string => {
  const location = [frame.filename, frame.lineno].filter(Boolean).join(":");
  return `  at ${frame.function ?? "(anonymous)"}${location ? ` (${location})` : ""}`;
};

const labelled = (label: string, value: string | undefined): string | null =>
  value ? `${label}: ${value}` : null;

/**
 * 화이트리스트로 추린 요약을 모델 입력 텍스트로 만든다.
 *
 * 외부 제공자에게 나가는 문자열은 이 함수의 반환값이 전부다. `SentryAlertSummary` 에 없는 값은
 * 여기에도 없으며, 요약에 새 필드를 더할 때는 그 값이 제공자에게 나가도 되는지 먼저 판단한다.
 *
 * @param alert 정규화를 마친 이벤트 요약.
 * @returns 제공자에게 보낼 사용자 메시지.
 */
const buildTriageInput = (alert: SentryAlertSummary): string => {
  const tags = Object.entries(alert.tags)
    .map(([name, value]) => `${name}=${value}`)
    .join(" ");

  const lines = [
    labelled("Title", alert.title),
    labelled("Culprit", alert.culprit),
    labelled("Level", alert.level),
    labelled("Environment", alert.environment),
    labelled("Release", alert.release),
    labelled("Tags", tags),
    labelled("Triggered rule", alert.triggeredRule),
    labelled("Exception", [alert.exceptionType, alert.exceptionValue].filter(Boolean).join(": ")),
  ].filter((line): line is string => line !== null);

  if (alert.frames.length > 0) {
    lines.push("In-app stack (most recent first):", ...alert.frames.map(frameLine));
  } else {
    lines.push("In-app stack: none");
  }

  return lines.join("\n");
};

export { ALERT_DATA_END, ALERT_DATA_START, buildTriageInput, TRIAGE_INSTRUCTIONS };
