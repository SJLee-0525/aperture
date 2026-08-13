// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_CONSENT_MAX_AGE_MS,
  getAnalyticsConsentSnapshot,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  resetAnalyticsConsentCache,
  setBrowserAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/features/analytics/_lib/analytics-consent";

import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";

const NOW = Date.UTC(2026, 7, 9);
const CHOICE = { analytics: "granted", monitoring: "denied" } as const;

describe("tracking consent storage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
    resetAnalyticsConsentCache();
  });

  it("분석과 오류 기록의 독립 선택을 읽는다", () => {
    const raw = JSON.stringify({ ...CHOICE, expiresAt: NOW + 1 });
    expect(parseAnalyticsConsent(raw, NOW)).toEqual(CHOICE);
  });

  it.each([
    null,
    "",
    "not-json",
    JSON.stringify({ analytics: "unknown", monitoring: "denied", expiresAt: NOW + 1 }),
    JSON.stringify({ analytics: "granted", monitoring: "denied", expiresAt: NOW }),
  ])("누락·손상·만료 값은 미선택이다", (raw) => {
    expect(parseAnalyticsConsent(raw, NOW)).toBeNull();
  });

  it("선택을 180일 만료 시각과 함께 저장한다", () => {
    const setItem = vi.fn();
    expect(writeAnalyticsConsent({ setItem }, CHOICE, NOW)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.CONSENT,
      JSON.stringify({ ...CHOICE, expiresAt: NOW + ANALYTICS_CONSENT_MAX_AGE_MS }),
    );
  });

  it("v1·v2 단일 범위 동의는 승계하지 않고 삭제한다", () => {
    const removeItem = vi.fn();
    const values: Record<string, string> = {
      [LEGACY_STORAGE_KEYS.ANALYTICS_CONSENT]: "legacy-v1",
      [LEGACY_STORAGE_KEYS.COMBINED_CONSENT]: "legacy-v2",
    };
    const storage = {
      getItem: vi.fn((key: string) => values[key] ?? null),
      removeItem,
    };

    expect(readAnalyticsConsent(storage, NOW)).toBeNull();
    expect(removeItem).toHaveBeenCalledWith(LEGACY_STORAGE_KEYS.ANALYTICS_CONSENT);
    expect(removeItem).toHaveBeenCalledWith(LEGACY_STORAGE_KEYS.COMBINED_CONSENT);
  });

  it("storage 접근 실패는 throw하지 않는다", () => {
    expect(
      readAnalyticsConsent({
        getItem: () => {
          throw new Error("blocked");
        },
        removeItem: vi.fn(),
      }),
    ).toBeNull();
    expect(
      writeAnalyticsConsent(
        {
          setItem: () => {
            throw new Error("blocked");
          },
        },
        { analytics: "denied", monitoring: "denied" },
      ),
    ).toBe(false);
  });

  it("현재 탭의 메모리 캐시도 180일 뒤 만료된다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    setBrowserAnalyticsConsent(CHOICE);
    expect(getAnalyticsConsentSnapshot()).toEqual(CHOICE);

    vi.setSystemTime(NOW + ANALYTICS_CONSENT_MAX_AGE_MS);
    expect(getAnalyticsConsentSnapshot()).toBeNull();
  });

  it("같은 저장값은 한 번만 파싱하고 레거시 키도 최초 조회에서만 정리한다", () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONSENT,
      JSON.stringify({ ...CHOICE, expiresAt: NOW + 1 }),
    );
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const parse = vi.spyOn(JSON, "parse");
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const legacyKeys = new Set<string>([
      LEGACY_STORAGE_KEYS.ANALYTICS_CONSENT,
      LEGACY_STORAGE_KEYS.COMBINED_CONSENT,
    ]);

    const first = getAnalyticsConsentSnapshot();
    const second = getAnalyticsConsentSnapshot();

    expect(second).toBe(first);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(getItem.mock.calls.filter(([key]) => legacyKeys.has(String(key)))).toHaveLength(2);
  });

  it("브라우저 storage가 차단돼도 선택 저장 함수가 throw하지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => setBrowserAnalyticsConsent(CHOICE)).not.toThrow();
    expect(getAnalyticsConsentSnapshot()).toEqual(CHOICE);
  });
});
