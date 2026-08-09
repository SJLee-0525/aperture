// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@/constants/storage-keys";
import { AnalyticsConsentProvider } from "@/features/analytics/_components/AnalyticsConsentProvider";
import { useAnalyticsConsent } from "@/features/analytics/_hooks/use-analytics-consent";
import { resetAnalyticsConsentCache } from "@/features/analytics/_lib/analytics-consent";

const { disableGoogleAnalytics } = vi.hoisted(() => ({ disableGoogleAnalytics: vi.fn() }));

vi.mock("@/features/analytics/_components/GoogleAnalytics", () => ({
  GoogleAnalytics: () => <span data-testid="ga-state">enabled</span>,
}));

vi.mock("@/features/analytics/_lib/gtag", () => ({ disableGoogleAnalytics }));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: {
      analyticsConsentLabel: "분석 쿠키 선택",
      analyticsConsentTitle: "방문 분석",
      analyticsConsentBody: "분석 설명",
      analyticsConsentAllow: "분석 허용",
      analyticsConsentDeny: "거부",
      privacyNav: "개인정보 처리방침",
    },
  }),
}));

vi.mock("@/features/lang/_components/LocalizedLink", () => ({
  LocalizedLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const SettingsButton = () => {
  const { openSettings } = useAnalyticsConsent();
  return (
    <button type="button" onClick={openSettings}>
      설정 열기
    </button>
  );
};

describe("AnalyticsConsentProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAnalyticsConsentCache();
    disableGoogleAnalytics.mockClear();
  });
  afterEach(cleanup);

  it("선택이 없으면 배너를 열고 거부를 180일 저장한다", async () => {
    render(
      <AnalyticsConsentProvider analyticsEnabled>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "거부" }));
    expect(screen.queryByLabelText("분석 쿠키 선택")).toBeNull();
    expect(screen.queryByTestId("ga-state")).toBeNull();
    expect(disableGoogleAnalytics).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.ANALYTICS_CONSENT)!)).toMatchObject({
      value: "denied",
    });
  });

  it("저장된 허용을 읽어 GA를 활성화하고 설정에서 철회할 수 있다", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ANALYTICS_CONSENT,
      JSON.stringify({ value: "granted", expiresAt: Date.now() + 60_000 }),
    );
    render(
      <AnalyticsConsentProvider analyticsEnabled>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ga-state").textContent).toBe("enabled"));
    expect(screen.queryByLabelText("분석 쿠키 선택")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "거부" }));
    expect(screen.queryByTestId("ga-state")).toBeNull();
  });

  it("허용을 철회한 뒤 다시 허용하면 GA를 다시 마운트한다", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ANALYTICS_CONSENT,
      JSON.stringify({ value: "granted", expiresAt: Date.now() + 60_000 }),
    );
    render(
      <AnalyticsConsentProvider analyticsEnabled>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ga-state")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "거부" }));
    expect(screen.queryByTestId("ga-state")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "분석 허용" }));
    await waitFor(() => expect(screen.getByTestId("ga-state")).toBeTruthy());
  });

  it("분석이 구성되지 않은 환경에서는 배너와 GA를 렌더하지 않는다", async () => {
    render(
      <AnalyticsConsentProvider analyticsEnabled={false}>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );
    await waitFor(() => expect(screen.queryByLabelText("분석 쿠키 선택")).toBeNull());
    expect(screen.queryByTestId("ga-state")).toBeNull();
  });

  it("로컬 preview 플래그는 저장된 선택과 GA 구성 없이도 배너만 강제로 연다", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ANALYTICS_CONSENT,
      JSON.stringify({ value: "denied", expiresAt: Date.now() + 60_000 }),
    );
    render(
      <AnalyticsConsentProvider analyticsEnabled={false} forceBanner>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    expect(await screen.findByLabelText("분석 쿠키 선택")).toBeTruthy();
    expect(screen.queryByTestId("ga-state")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "거부" }));
    expect(screen.queryByLabelText("분석 쿠키 선택")).toBeNull();
  });
});
