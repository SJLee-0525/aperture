/**
 * Sentry DSN과 저장 지역을 함께 검증한다. 두 Vercel 환경변수는 한 쌍의 설정이다.
 *
 * 어느 하나가 비었거나 SaaS DSN host와 지역이 다르면 세 런타임 모두 no-op이다(ADR-0004).
 * DSN은 이벤트 수신 주소일 뿐이라 공개돼도 안전하다. 진짜 시크릿(SENTRY_AUTH_TOKEN)은
 * 빌드 플러그인 전용으로 분리돼 있고 이 모듈과 무관하다.
 * `NEXT_PUBLIC_` 값은 빌드 타임에 문자열로 인라인되므로 런타임 조회가 아니라 상수 취급이다.
 */
type SentryDataRegion = "US" | "DE";

const rawRegion = process.env.NEXT_PUBLIC_SENTRY_DATA_REGION;
const SENTRY_DATA_REGION: SentryDataRegion | null =
  rawRegion === "US" || rawRegion === "DE" ? rawRegion : null;

/**
 * Sentry SaaS DSN의 수집 지역과 고지할 저장 지역이 같은지 확인한다.
 *
 * @param dsn - 검사할 Sentry DSN.
 * @param region - 개인정보 처리방침에 고지한 저장 지역.
 * @returns DSN 호스트가 저장 지역과 일치하면 `true`.
 */
const isSentryDsnInRegion = (dsn: string, region: SentryDataRegion): boolean => {
  try {
    const url = new URL(dsn);
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    const isDe = hostname === "ingest.de.sentry.io" || hostname.endsWith(".ingest.de.sentry.io");
    const isUs =
      hostname === "ingest.us.sentry.io" ||
      hostname.endsWith(".ingest.us.sentry.io") ||
      hostname === "ingest.sentry.io" ||
      hostname.endsWith(".ingest.sentry.io");

    return region === "DE" ? isDe : isUs;
  } catch {
    return false;
  }
};

const rawDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
// 국외 이전 국가가 확정되지 않거나 DSN 지역과 다르면 수집을 시작하지 않는다.
const SENTRY_DSN =
  SENTRY_DATA_REGION && isSentryDsnInRegion(rawDsn, SENTRY_DATA_REGION) ? rawDsn : "";

const SENTRY_TRANSFER_COUNTRY: Record<"ko" | "en", string> = {
  ko: SENTRY_DATA_REGION === "DE" ? "독일" : SENTRY_DATA_REGION === "US" ? "미국" : "미설정",
  en:
    SENTRY_DATA_REGION === "DE"
      ? "Germany"
      : SENTRY_DATA_REGION === "US"
        ? "the United States"
        : "not configured",
};

export { isSentryDsnInRegion, SENTRY_DSN, SENTRY_TRANSFER_COUNTRY };
