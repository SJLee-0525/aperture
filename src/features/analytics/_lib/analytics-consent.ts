import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";

/** 분석·오류 기록 선택을 유지하는 기간. */
const ANALYTICS_CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

type ConsentDecision = "granted" | "denied";
type TrackingConsent = {
  analytics: ConsentDecision;
  monitoring: ConsentDecision;
};
type StoredTrackingConsent = TrackingConsent & { expiresAt: number };
type ParsedTrackingConsent = {
  consent: TrackingConsent;
  expiresAt: number;
};

/** localStorage가 차단돼도 현재 탭의 선택을 유지하는 메모리 스냅샷. */
let volatileConsent: TrackingConsent | null | undefined;
let volatileExpiresAt = 0;
let cachedRaw: string | null | undefined;
let cachedParsed: TrackingConsent | null = null;
let cachedExpiresAt = 0;
let legacyConsentChecked = false;

/**
 * 저장값이 지원하는 동의 상태인지 확인한다.
 *
 * @param {unknown} value - 검사할 값.
 * @returns {boolean} `granted` 또는 `denied`이면 `true`.
 */
const isDecision = (value: unknown): value is ConsentDecision =>
  value === "granted" || value === "denied";

/**
 * 직렬화된 v3 선택을 검증하고 아직 유효한 값만 반환한다.
 *
 * @param {string | null} raw - localStorage에서 읽은 JSON 문자열.
 * @param {number} [now=Date.now()] - 만료 여부를 판단할 기준 시각.
 * @returns {ParsedTrackingConsent | null} 유효한 선택과 만료 시각 또는 `null`.
 */
const parseStoredTrackingConsent = (
  raw: string | null,
  now = Date.now(),
): ParsedTrackingConsent | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTrackingConsent>;
    if (
      isDecision(parsed.analytics) &&
      isDecision(parsed.monitoring) &&
      typeof parsed.expiresAt === "number" &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt > now
    ) {
      return {
        consent: { analytics: parsed.analytics, monitoring: parsed.monitoring },
        expiresAt: parsed.expiresAt,
      };
    }
  } catch {
    // 손상된 저장값은 미선택으로 취급한다.
  }
  return null;
};

/**
 * 직렬화된 v3 선택을 검증하고 아직 유효한 선택만 반환한다.
 *
 * @param {string | null} raw - localStorage에서 읽은 JSON 문자열.
 * @param {number} [now=Date.now()] - 만료 여부를 판단할 기준 시각.
 * @returns {TrackingConsent | null} 유효한 선택 또는 `null`.
 */
const parseAnalyticsConsent = (raw: string | null, now = Date.now()): TrackingConsent | null =>
  parseStoredTrackingConsent(raw, now)?.consent ?? null;

/**
 * 이전 단일 범위 동의값을 제거한다. 새 범위로 승계하지 않는다.
 *
 * @param {Pick<Storage, "getItem" | "removeItem">} storage - 정리할 웹 저장소.
 * @returns {void}
 */
const removeLegacyConsent = (storage: Pick<Storage, "getItem" | "removeItem">): void => {
  for (const key of [LEGACY_STORAGE_KEYS.ANALYTICS_CONSENT, LEGACY_STORAGE_KEYS.COMBINED_CONSENT]) {
    if (storage.getItem(key) != null) storage.removeItem(key);
  }
};

/**
 * 저장소에서 세분화 선택을 읽고 손상되거나 만료된 항목을 정리한다.
 *
 * @param {Pick<Storage, "getItem" | "removeItem">} storage - 선택을 읽을 웹 저장소.
 * @param {number} [now=Date.now()] - 만료 여부를 판단할 기준 시각.
 * @returns {TrackingConsent | null} 저장된 선택 또는 `null`.
 */
const readAnalyticsConsent = (
  storage: Pick<Storage, "getItem" | "removeItem">,
  now = Date.now(),
): TrackingConsent | null => {
  try {
    removeLegacyConsent(storage);
    const raw = storage.getItem(STORAGE_KEYS.CONSENT);
    const parsed = parseStoredTrackingConsent(raw, now);
    if (!parsed && raw != null) storage.removeItem(STORAGE_KEYS.CONSENT);
    return parsed?.consent ?? null;
  } catch {
    return null;
  }
};

/**
 * 세분화 선택과 180일 만료 시각을 기록한다.
 *
 * @param {Pick<Storage, "setItem">} storage - 선택을 기록할 웹 저장소.
 * @param {TrackingConsent} value - 저장할 분석·오류 보고 선택.
 * @param {number} [now=Date.now()] - 만료 시각 계산에 쓸 기준 시각.
 * @returns {boolean} 저장에 성공하면 `true`.
 */
const writeAnalyticsConsent = (
  storage: Pick<Storage, "setItem">,
  value: TrackingConsent,
  now = Date.now(),
): boolean => {
  try {
    const stored: StoredTrackingConsent = {
      ...value,
      expiresAt: now + ANALYTICS_CONSENT_MAX_AGE_MS,
    };
    storage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

/**
 * 현재 선택을 읽고 같은 저장값에는 안정된 객체 참조를 반환한다.
 *
 * @returns {TrackingConsent | null} 현재 유효한 선택 또는 `null`.
 */
const getAnalyticsConsentSnapshot = (): TrackingConsent | null => {
  if (volatileConsent !== undefined) {
    if (Date.now() < volatileExpiresAt) return volatileConsent;
    volatileConsent = undefined;
    volatileExpiresAt = 0;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CONSENT);
    if (raw === cachedRaw && Date.now() < cachedExpiresAt) return cachedParsed;
    cachedRaw = raw;
    const parsed = parseStoredTrackingConsent(raw);
    cachedParsed = parsed?.consent ?? null;
    cachedExpiresAt = parsed?.expiresAt ?? 0;
    return cachedParsed;
  } catch {
    return null;
  }
};

/**
 * 구형 키와 손상·만료된 항목을 저장소에서 지운다.
 *
 * `useSyncExternalStore` 의 getSnapshot 은 순수해야 하므로 이 정리는 그쪽이 아니라
 * provider 의 mount effect 가 한 번 호출한다.
 *
 * @returns {void}
 */
const cleanupStoredAnalyticsConsent = (): void => {
  try {
    if (!legacyConsentChecked) {
      removeLegacyConsent(window.localStorage);
      legacyConsentChecked = true;
    }
    const raw = window.localStorage.getItem(STORAGE_KEYS.CONSENT);
    if (raw != null && !parseStoredTrackingConsent(raw)) {
      window.localStorage.removeItem(STORAGE_KEYS.CONSENT);
      cachedRaw = undefined;
    }
  } catch {
    // 저장소를 막은 브라우저에서는 정리할 것도 없다.
  }
};

/**
 * 현재 문서와 다른 탭의 선택 변경을 구독한다.
 *
 * @param {() => void} listener - 선택이 바뀌었을 때 호출할 함수.
 * @returns {() => void} 구독 해제 함수.
 */
const subscribeAnalyticsConsent = (listener: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage || event.key !== STORAGE_KEYS.CONSENT) return;
    volatileConsent = undefined;
    volatileExpiresAt = 0;
    cachedRaw = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("analytics-consent-change", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("analytics-consent-change", listener);
  };
};

/**
 * 현재 탭의 세분화 선택을 갱신한다.
 *
 * @param {TrackingConsent} value - 저장할 분석·오류 보고 선택.
 * @returns {void}
 */
const setBrowserAnalyticsConsent = (value: TrackingConsent): void => {
  volatileConsent = value;
  cachedParsed = value;
  const now = Date.now();
  volatileExpiresAt = now + ANALYTICS_CONSENT_MAX_AGE_MS;
  cachedExpiresAt = now + ANALYTICS_CONSENT_MAX_AGE_MS;
  const stored = writeAnalyticsConsent(window.localStorage, value, now);
  try {
    cachedRaw = stored ? window.localStorage.getItem(STORAGE_KEYS.CONSENT) : undefined;
  } catch {
    cachedRaw = undefined;
  }
  window.dispatchEvent(new Event("analytics-consent-change"));
};

/**
 * 테스트 사이에 동의 캐시를 초기화한다.
 *
 * @returns {void}
 */
const resetAnalyticsConsentCache = (): void => {
  volatileConsent = undefined;
  volatileExpiresAt = 0;
  cachedRaw = undefined;
  cachedParsed = null;
  cachedExpiresAt = 0;
  legacyConsentChecked = false;
};

export {
  ANALYTICS_CONSENT_MAX_AGE_MS,
  cleanupStoredAnalyticsConsent,
  getAnalyticsConsentSnapshot,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  resetAnalyticsConsentCache,
  setBrowserAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
};
export type { TrackingConsent };
