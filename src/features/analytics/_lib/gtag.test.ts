// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  configureGoogleAnalytics,
  disableGoogleAnalytics,
  prepareGoogleAnalytics,
} from "@/features/analytics/_lib/gtag";

describe("gtag consent bridge", () => {
  beforeEach(() => {
    window.dataLayer = undefined;
    window.gtag = undefined;
    document.cookie = "_ga=; Max-Age=0; Path=/";
    document.cookie = "_ga_TEST=; Max-Age=0; Path=/";
  });

  it("외부 스크립트 전에 dataLayer queue를 준비한다", () => {
    prepareGoogleAnalytics();
    expect(window.dataLayer).toEqual([]);
    window.gtag?.("event", "test");
    expect(window.dataLayer).toHaveLength(1);
  });

  it("기본 상태를 거부한 뒤 분석만 허용하고 광고 관련 저장·개인화를 거부한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    configureGoogleAnalytics("G-TEST");
    expect(gtag).toHaveBeenCalledWith("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(gtag).toHaveBeenCalledWith(
      "config",
      "G-TEST",
      expect.objectContaining({
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      }),
    );
  });

  it("철회 신호를 보내고 접근 가능한 GA 쿠키를 제거한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    document.cookie = "_ga=abc; Path=/";
    document.cookie = "_ga_TEST=def; Path=/";

    disableGoogleAnalytics();

    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).not.toContain("_ga_TEST=");
  });
});
