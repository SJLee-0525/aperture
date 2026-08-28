/**
 * 브라우저·Node·Edge에서 Sentry 이벤트와 breadcrumb의 민감정보를 제거한다.
 *
 * `dataCollection` 잠금(userInfo·cookies·httpBodies 차단)이 1차 방어지만, SDK 옵션은
 * 버전에 따라 기본값이 움직인 전례가 있어 전송 직전에 한 번 더 지운다(ADR-0004).
 * 이 프로젝트에서 실제로 위험한 값은 셋이다:
 * - `Authorization` 헤더의 Supabase access token (관리자 server action·API 호출)
 * - 방문자가 입력한 질문 전체가 담긴 `/api/chat` 요청 본문
 * - URL 쿼리의 `q`(통합 검색어) · `token` · `code`
 *
 * `@sentry/nextjs` 참조는 type-only import뿐이라 이 모듈은 동의 게이팅(정적 import 금지)을
 * 깨지 않는다.
 */

import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const REDACTED = "[Filtered]";

const SENSITIVE_HEADER_KEYS = ["authorization", "cookie", "set-cookie"];
const SENSITIVE_QUERY_KEYS = ["q", "token", "code"];

/**
 * 쿼리스트링(`a=1&token=x`)에서 민감 키의 값만 마스킹한다.
 *
 * @param query - `?` 뒤의 원본 쿼리스트링.
 * @returns 민감 키의 값이 `[Filtered]`로 바뀐 쿼리스트링.
 */
const scrubQueryString = (query: string): string =>
  query
    .split("&")
    .map((pair) => {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex === -1) return pair;
      const key = pair.slice(0, separatorIndex);
      return SENSITIVE_QUERY_KEYS.includes(key.toLowerCase()) ? `${key}=${REDACTED}` : pair;
    })
    .join("&");

/**
 * URL의 쿼리 부분에서 민감 값을 마스킹한다. 쿼리가 없으면 원본을 반환한다.
 *
 * @param url - 절대 또는 상대 URL.
 * @returns 쿼리만 마스킹된 URL.
 */
const scrubUrl = (url: string): string => {
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return url;
  return `${url.slice(0, queryIndex)}?${scrubQueryString(url.slice(queryIndex + 1))}`;
};

/**
 * Sentry 이벤트에서 인증 토큰·요청 본문·민감 쿼리를 제거한다.
 * `beforeSend`에 그대로 연결할 수 있도록 이벤트를 반환한다.
 *
 * @param event - 전송 직전의 Sentry 오류 이벤트.
 * @returns 민감 값이 제거된 같은 이벤트.
 */
const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  const request = event.request;
  if (!request) return event;

  // 요청 본문은 경로와 관계없이 제거한다. 이 사이트에서는 /api/chat의 방문자 질문과
  // 관리자 쓰기 요청에 본문이 실리므로 진단 정보보다 개인정보 노출 위험이 크다.
  if (request.data != null) {
    request.data = REDACTED;
  }

  if (request.cookies) {
    request.cookies = { [REDACTED]: REDACTED };
  }

  if (request.headers) {
    for (const key of Object.keys(request.headers)) {
      if (SENSITIVE_HEADER_KEYS.includes(key.toLowerCase())) {
        request.headers[key] = REDACTED;
      }
    }
  }

  if (typeof request.url === "string") {
    request.url = scrubUrl(request.url);
  }

  if (typeof request.query_string === "string") {
    request.query_string = scrubQueryString(request.query_string);
  }

  return event;
};

/**
 * breadcrumb의 URL 필드(fetch/xhr `url`, navigation `from`/`to`)에서 민감 쿼리를 마스킹한다.
 *
 * @param breadcrumb - 기록 직전의 breadcrumb.
 * @returns URL 쿼리가 마스킹된 같은 breadcrumb.
 */
const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
  const data = breadcrumb.data;
  if (!data) return breadcrumb;

  for (const key of ["url", "from", "to"]) {
    if (typeof data[key] === "string") {
      data[key] = scrubUrl(data[key]);
    }
  }

  return breadcrumb;
};

type ReplayRecordingEvent = {
  data?: unknown;
};

/**
 * Replay 녹화 이벤트의 현재 주소와 navigation URL에서 민감 쿼리를 제거한다.
 * ErrorEvent의 `beforeSend`와 Replay의 녹화 스트림은 서로 다른 경로라 별도 콜백이 필요하다.
 *
 * @param event - Replay 버퍼에 추가되기 직전의 이벤트.
 * @returns URL이 정제된 같은 이벤트.
 */
const scrubReplayEvent = <T extends ReplayRecordingEvent>(event: T): T => {
  const data = event.data;
  if (!data || typeof data !== "object") return event;
  const replayData = data as Record<string, unknown>;

  if (typeof replayData.href === "string") {
    replayData.href = scrubUrl(replayData.href);
  }

  const payload = replayData.payload;
  const breadcrumbData =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : null;
  if (breadcrumbData && typeof breadcrumbData === "object") {
    const urls = breadcrumbData as Record<string, unknown>;
    for (const key of ["url", "from", "to"]) {
      if (typeof urls[key] === "string") {
        urls[key] = scrubUrl(urls[key]);
      }
    }
  }

  return event;
};

export { REDACTED, scrubBreadcrumb, scrubEvent, scrubQueryString, scrubReplayEvent, scrubUrl };
