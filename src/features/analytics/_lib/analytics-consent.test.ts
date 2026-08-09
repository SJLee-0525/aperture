import { describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@/constants/storage-keys";
import {
  ANALYTICS_CONSENT_MAX_AGE_MS,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/features/analytics/_lib/analytics-consent";

const NOW = Date.UTC(2026, 7, 9);

describe("analytics consent storage", () => {
  it.each(["granted", "denied"] as const)("유효한 %s 선택을 읽는다", (value) => {
    const raw = JSON.stringify({ value, expiresAt: NOW + 1 });
    expect(parseAnalyticsConsent(raw, NOW)).toBe(value);
  });

  it.each([
    null,
    "",
    "not-json",
    JSON.stringify({ value: "unknown", expiresAt: NOW + 1 }),
    JSON.stringify({ value: "granted", expiresAt: "later" }),
    JSON.stringify({ value: "granted", expiresAt: NOW }),
    JSON.stringify({ value: "denied", expiresAt: Number.POSITIVE_INFINITY }),
  ])("누락·손상·만료 값은 미동의다", (raw) => {
    expect(parseAnalyticsConsent(raw, NOW)).toBeNull();
  });

  it("선택을 180일 만료 시각과 함께 저장한다", () => {
    const setItem = vi.fn();
    expect(writeAnalyticsConsent({ setItem }, "granted", NOW)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.ANALYTICS_CONSENT,
      JSON.stringify({ value: "granted", expiresAt: NOW + ANALYTICS_CONSENT_MAX_AGE_MS }),
    );
  });

  it("만료되거나 손상된 저장값을 정리한다", () => {
    const removeItem = vi.fn();
    const storage = {
      getItem: vi.fn(() => JSON.stringify({ value: "granted", expiresAt: NOW - 1 })),
      removeItem,
    };
    expect(readAnalyticsConsent(storage, NOW)).toBeNull();
    expect(removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ANALYTICS_CONSENT);
  });

  it("storage 접근 실패는 throw하지 않고 미동의 또는 저장 실패로 처리한다", () => {
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
        "denied",
      ),
    ).toBe(false);
  });
});
