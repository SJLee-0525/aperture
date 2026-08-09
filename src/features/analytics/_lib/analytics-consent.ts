import { STORAGE_KEYS } from "@/constants/storage-keys";

/** 분석 선택을 유지하는 기간. 단위는 밀리초이며 현재 계약은 180일이다. */
const ANALYTICS_CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

/** 방문자가 명시적으로 선택할 수 있는 분석 저장 상태. */
type AnalyticsConsent = "granted" | "denied";
/** localStorage에 직렬화하는 버전 1 분석 선택 스키마. */
type StoredAnalyticsConsent = { value: AnalyticsConsent; expiresAt: number };

/** localStorage가 차단돼도 현재 탭의 선택을 유지하는 메모리 스냅샷. */
let volatileConsent: AnalyticsConsent | null | undefined;

/**
 * 직렬화된 분석 선택을 검증하고 아직 유효한 값만 반환한다.
 *
 * @param {string | null} raw - localStorage에서 읽은 원문.
 * @param {number} now - 만료 여부를 비교할 Unix epoch 밀리초.
 * @returns {AnalyticsConsent | null} 유효한 선택, 또는 누락·손상·만료 시 `null`.
 */
const parseAnalyticsConsent = (raw: string | null, now = Date.now()): AnalyticsConsent | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAnalyticsConsent>;
    if (
      (parsed.value === "granted" || parsed.value === "denied") &&
      typeof parsed.expiresAt === "number" &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt > now
    ) {
      return parsed.value;
    }
  } catch {
    // 손상된 저장값은 미동의로 취급한다.
  }
  return null;
};

/**
 * 주어진 저장소에서 분석 선택을 읽고 잘못된 항목은 제거한다.
 *
 * @param {Pick<Storage, "getItem" | "removeItem">} storage - 읽기와 정리를 지원하는 저장소.
 * @param {number} now - 만료 여부를 비교할 Unix epoch 밀리초.
 * @returns {AnalyticsConsent | null} 현재 유효한 선택. 저장소 접근 실패는 `null`이다.
 */
const readAnalyticsConsent = (
  storage: Pick<Storage, "getItem" | "removeItem">,
  now = Date.now(),
): AnalyticsConsent | null => {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEYS.ANALYTICS_CONSENT);
    const consent = parseAnalyticsConsent(raw, now);
    if (!consent && raw != null) storage.removeItem(STORAGE_KEYS.ANALYTICS_CONSENT);
    return consent;
  } catch {
    return null;
  }
};

/**
 * 분석 선택과 180일 만료 시각을 저장한다.
 *
 * @param {Pick<Storage, "setItem">} storage - 선택을 기록할 Web Storage 호환 객체.
 * @param {AnalyticsConsent} value - 저장할 허용 또는 거부 상태.
 * @param {number} now - 만료 시각 계산의 기준이 되는 Unix epoch 밀리초.
 * @returns {boolean} 저장 성공 여부. 차단된 저장소에서는 `false`를 반환한다.
 */
const writeAnalyticsConsent = (
  storage: Pick<Storage, "setItem">,
  value: AnalyticsConsent,
  now = Date.now(),
): boolean => {
  try {
    const stored: StoredAnalyticsConsent = {
      value,
      expiresAt: now + ANALYTICS_CONSENT_MAX_AGE_MS,
    };
    storage.setItem(STORAGE_KEYS.ANALYTICS_CONSENT, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

/**
 * React 외부 스토어가 사용할 현재 탭의 분석 선택 스냅샷을 반환한다.
 *
 * @returns {AnalyticsConsent | null} 메모리 선택을 우선한 현재 분석 상태.
 */
const getAnalyticsConsentSnapshot = (): AnalyticsConsent | null => {
  const stored = readAnalyticsConsent(window.localStorage);
  return volatileConsent ?? stored ?? null;
};

/**
 * 현재 탭의 사용자 선택 이벤트와 다른 탭의 storage 변경을 함께 구독한다.
 *
 * @param {() => void} listener - 선택 변경 후 React에 새 스냅샷을 요청하는 콜백.
 * @returns {() => void} 두 전역 이벤트 리스너를 제거하는 구독 해제 함수.
 */
const subscribeAnalyticsConsent = (listener: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage || event.key !== STORAGE_KEYS.ANALYTICS_CONSENT) {
      return;
    }
    volatileConsent = undefined;
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
 * 현재 탭의 분석 선택을 갱신하고 같은 문서의 구독자에게 변경을 알린다.
 *
 * @param {AnalyticsConsent} value - 방문자가 선택한 허용 또는 거부 상태.
 * @returns {void}
 */
const setBrowserAnalyticsConsent = (value: AnalyticsConsent): void => {
  volatileConsent = value;
  writeAnalyticsConsent(window.localStorage, value);
  window.dispatchEvent(new Event("analytics-consent-change"));
};

/**
 * 모듈 메모리 스냅샷을 초기화한다. 테스트 격리 전용이며 브라우저 공개 API가 아니다.
 *
 * @returns {void}
 */
const resetAnalyticsConsentCache = (): void => {
  volatileConsent = undefined;
};

export {
  ANALYTICS_CONSENT_MAX_AGE_MS,
  getAnalyticsConsentSnapshot,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  resetAnalyticsConsentCache,
  setBrowserAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
};
export type { AnalyticsConsent };
