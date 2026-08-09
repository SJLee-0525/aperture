// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  LOCALE_PREFERENCE_COOKIE,
  LOCALE_PREFERENCE_MAX_AGE_SECONDS,
} from "@/constants/locale-preference";
import { writeLocalePreferenceCookie } from "@/features/lang/_lib/locale-preference-cookie";

describe("writeLocalePreferenceCookie", () => {
  beforeEach(() => {
    document.cookie = `${LOCALE_PREFERENCE_COOKIE}=; Max-Age=0; Path=/`;
  });

  it.each(["ko", "en"] as const)("명시적 %s 선택을 first-party 쿠키로 기록한다", (lang) => {
    writeLocalePreferenceCookie(lang);
    expect(document.cookie).toContain(`${LOCALE_PREFERENCE_COOKIE}=${lang}`);
  });

  it("쿠키 보유 기간 계약은 30일이다", () => {
    expect(LOCALE_PREFERENCE_MAX_AGE_SECONDS).toBe(2_592_000);
  });
});
