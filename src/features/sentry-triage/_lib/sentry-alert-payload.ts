import { createHash } from "node:crypto";

import type { SentryAlertSummary, SentryFrame } from "@/types/sentry-alert";

/** 카드와 프롬프트가 감당할 분량. 스택 하단(오래된 프레임)부터 버린다. */
const MAX_FRAMES = 15;

/** LLM 에 넘길 태그. 어느 표면에서 났는지만 알면 된다. */
const ALLOWED_TAGS = ["app_runtime", "area", "transaction"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined => {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

/**
 * `event.tags` 는 `[키, 값]` 쌍의 배열이다(실물 확인, docs/plan/10 §13.2).
 * 허용 목록 밖은 버린다. 실제 페이로드의 `url`·`replayId` 가 여기로 들어온다.
 */
const pickTags = (value: unknown): Record<string, string> => {
  if (!Array.isArray(value)) return {};
  const picked: Record<string, string> = {};
  for (const pair of value) {
    if (!Array.isArray(pair)) continue;
    const [name, tagValue] = pair;
    if (typeof name !== "string") continue;
    if (!(ALLOWED_TAGS as readonly string[]).includes(name)) continue;
    const resolved = text(tagValue);
    if (resolved) picked[name] = resolved;
  }
  return picked;
};

/**
 * 프레임에서 위치만 남긴다.
 *
 * 실물 프레임에는 `vars`, `pre_context`, `post_context`, `context_line` 이 함께 온다.
 * 지역 변수와 소스 본문이라 외부 제공자로 나가면 안 된다. 필요한 세 값만 뽑는 이유다.
 */
const toFrame = (value: unknown): SentryFrame | null => {
  if (!isRecord(value)) return null;
  const filename = text(value.filename) ?? text(value.abs_path);
  const fn = text(value.function);
  if (!filename && !fn) return null;
  const lineno = typeof value.lineno === "number" ? value.lineno : undefined;
  return { filename, function: fn, lineno };
};

/**
 * in-app 프레임만 최신 순으로 모은다.
 *
 * Sentry 는 오래된 프레임을 앞에 둔다. 마지막 프레임이 예외가 발생한 지점이므로 뒤집는다.
 * in-app 프레임이 하나도 없으면 외부 스크립트 오류일 가능성이 커서 빈 배열을 그대로 넘긴다.
 * 그 판단은 LLM 이 `isNoise` 로 한다.
 */
const pickFrames = (stacktrace: unknown): SentryFrame[] => {
  if (!isRecord(stacktrace) || !Array.isArray(stacktrace.frames)) return [];
  return stacktrace.frames
    .filter((frame) => isRecord(frame) && frame.in_app === true)
    .map(toFrame)
    .filter((frame): frame is SentryFrame => frame !== null)
    .reverse()
    .slice(0, MAX_FRAMES);
};

/**
 * 예외 정보를 고른다. `values` 는 원인 예외가 앞, 실제로 던져진 예외가 뒤다.
 */
const pickException = (event: Record<string, unknown>) => {
  const exception = isRecord(event.exception) ? event.exception : null;
  const values = exception && Array.isArray(exception.values) ? exception.values : [];
  const thrown = values.at(-1);
  const metadata = isRecord(event.metadata) ? event.metadata : {};

  if (!isRecord(thrown)) {
    return {
      exceptionType: text(metadata.type),
      exceptionValue: text(metadata.value),
      frames: [] as SentryFrame[],
    };
  }

  return {
    exceptionType: text(thrown.type) ?? text(metadata.type),
    exceptionValue: text(thrown.value) ?? text(metadata.value),
    // raw_stacktrace 는 심볼화 전 번들 좌표라 쓰지 않는다.
    frames: pickFrames(thrown.stacktrace),
  };
};

/**
 * 웹훅 본문을 LLM·카드·기록이 공유하는 요약으로 정규화한다.
 *
 * 필요한 경로만 뽑는다. `data.event` 를 통째로 넘기고 몇 개를 빼는 방식은 쓰지 않는다.
 * 실물 페이로드에는 `user.geo`(도시 단위 위치), `request.url`, `breadcrumbs`(직전 요청 URL 전체),
 * `frames[].context_line`(소스 본문)이 함께 오므로, Sentry 가 필드를 추가할 때 그대로 흘러가면 안 된다.
 *
 * @param raw `request.text()` 로 받은 본문 원문. 서명 검증과 같은 문자열이어야 한다.
 * @returns 이벤트 요약. 파싱 실패나 식별자 누락이면 null.
 */
const normalizeSentryAlert = (raw: string): SentryAlertSummary | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) return null;

  const data = parsed.data;
  const event = isRecord(data.event) ? data.event : null;
  if (!event) return null;

  const issueId = text(event.issue_id);
  if (!issueId) return null;

  // event_id 가 없으면 멱등 키가 비어 재전송이 그대로 통과한다. 본문 해시로 대신한다.
  const eventId =
    text(event.event_id) ?? createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 32);

  const { exceptionType, exceptionValue, frames } = pickException(event);
  const metadata = isRecord(event.metadata) ? event.metadata : {};
  // join 은 빈 배열에 "" 를 돌려주므로 ?? 로는 다음 후보로 넘어가지 않는다.
  const composedTitle = [exceptionType, exceptionValue].filter(Boolean).join(": ") || undefined;

  return {
    issueId,
    eventId,
    shortId: text(event.short_id),
    title: text(event.title) ?? composedTitle ?? text(metadata.value) ?? "(제목 없음)",
    culprit: text(event.culprit),
    level: text(event.level),
    environment: text(event.environment),
    release: text(event.release),
    webUrl: text(event.web_url),
    triggeredRule: text(data.triggered_rule),
    tags: pickTags(event.tags),
    exceptionType,
    exceptionValue,
    frames,
  };
};

export { MAX_FRAMES, normalizeSentryAlert };
