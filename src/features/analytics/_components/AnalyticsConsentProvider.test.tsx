// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";
import { AnalyticsConsentProvider } from "@/features/analytics/_components/AnalyticsConsentProvider";
import { useAnalyticsConsent } from "@/features/analytics/_hooks/use-analytics-consent";
import { resetAnalyticsConsentCache } from "@/features/analytics/_lib/analytics-consent";

const { disableGoogleAnalytics, startBrowserMonitoring, stopBrowserMonitoring } = vi.hoisted(
  () => ({
    disableGoogleAnalytics: vi.fn(),
    startBrowserMonitoring: vi.fn(() => Promise.resolve()),
    stopBrowserMonitoring: vi.fn(() => Promise.resolve()),
  }),
);

vi.mock("@/features/analytics/_components/GoogleAnalytics", () => ({
  GoogleAnalytics: () => <span data-testid="ga-state">enabled</span>,
}));

vi.mock("@/features/analytics/_lib/gtag", () => ({ disableGoogleAnalytics }));

vi.mock("@/lib/monitoring/browser-monitoring", () => ({
  startBrowserMonitoring,
  stopBrowserMonitoring,
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: {
      analyticsConsentLabel: "선택적 데이터 수집 설정",
      analyticsConsentTitle: "선택적 데이터 수집 설정",
      analyticsConsentBody: "각 항목을 선택하세요.",
      analyticsConsentAnalyticsLabel: "방문 분석",
      analyticsConsentAnalyticsBody: "GA 설명",
      analyticsConsentMonitoringLabel: "오류 보고 및 화면 기록",
      analyticsConsentMonitoringBody: "Sentry 설명",
      analyticsConsentDetailsLabel: "상세 설명",
      analyticsConsentSave: "선택 저장",
      analyticsConsentDenyAll: "모두 거부",
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
    startBrowserMonitoring.mockClear();
    stopBrowserMonitoring.mockClear();
  });
  afterEach(cleanup);

  it("선택이 없으면 배너를 열고 거부를 180일 저장한다", async () => {
    render(
      <AnalyticsConsentProvider gaEnabled monitoringEnabled={false}>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "모두 거부" }));
    expect(screen.queryByLabelText("선택적 데이터 수집 설정")).toBeNull();
    expect(screen.queryByTestId("ga-state")).toBeNull();
    expect(disableGoogleAnalytics).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.CONSENT)!)).toMatchObject({
      analytics: "denied",
      monitoring: "denied",
    });
  });

  it("저장된 허용을 읽어 GA를 활성화하고 설정에서 철회할 수 있다", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONSENT,
      JSON.stringify({
        analytics: "granted",
        monitoring: "denied",
        expiresAt: Date.now() + 60_000,
      }),
    );
    render(
      <AnalyticsConsentProvider gaEnabled monitoringEnabled={false}>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ga-state").textContent).toBe("enabled"));
    expect(screen.queryByLabelText("선택적 데이터 수집 설정")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "모두 거부" }));
    expect(screen.queryByTestId("ga-state")).toBeNull();
  });

  it("허용을 철회한 뒤 다시 허용하면 GA를 다시 마운트한다", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONSENT,
      JSON.stringify({
        analytics: "granted",
        monitoring: "denied",
        expiresAt: Date.now() + 60_000,
      }),
    );
    render(
      <AnalyticsConsentProvider gaEnabled monitoringEnabled={false}>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ga-state")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "모두 거부" }));
    expect(screen.queryByTestId("ga-state")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /방문 분석/ }));
    fireEvent.click(screen.getByRole("button", { name: "선택 저장" }));
    await waitFor(() => expect(screen.getByTestId("ga-state")).toBeTruthy());
  });

  it("GA·모니터링이 모두 구성되지 않은 환경에서는 배너와 GA를 렌더하지 않는다", async () => {
    render(
      <AnalyticsConsentProvider gaEnabled={false} monitoringEnabled={false}>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );
    await waitFor(() => expect(screen.queryByLabelText("선택적 데이터 수집 설정")).toBeNull());
    expect(screen.queryByTestId("ga-state")).toBeNull();
    expect(startBrowserMonitoring).not.toHaveBeenCalled();
  });

  it("GA 없이 모니터링만 구성돼도 배너를 열고, 허용 시 public 모드로 시작한다", async () => {
    render(
      <AnalyticsConsentProvider gaEnabled={false} monitoringEnabled>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    fireEvent.click(await screen.findByRole("checkbox", { name: /오류 보고 및 화면 기록/ }));
    fireEvent.click(screen.getByRole("button", { name: "선택 저장" }));
    await waitFor(() => expect(startBrowserMonitoring).toHaveBeenCalledWith("public"));
    // GA 측정 ID가 없으므로 허용해도 GA 청크는 마운트하지 않는다.
    expect(screen.queryByTestId("ga-state")).toBeNull();
  });

  it("상세 설명은 선택값을 바꾸지 않고 각 항목에서 독립적으로 펼칠 수 있다", async () => {
    render(
      <AnalyticsConsentProvider gaEnabled monitoringEnabled>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    const details = await screen.findAllByLabelText("상세 설명");
    const checkboxes = screen.getAllByRole("checkbox");
    expect(details).toHaveLength(2);
    expect(screen.getByText("GA 설명").closest("details")?.hasAttribute("open")).toBe(false);
    expect(screen.getByText("Sentry 설명").closest("details")?.hasAttribute("open")).toBe(false);

    fireEvent.click(details[0]);
    expect(screen.getByText("GA 설명").closest("details")?.hasAttribute("open")).toBe(true);
    expect(screen.getByText("Sentry 설명").closest("details")?.hasAttribute("open")).toBe(false);
    expect(checkboxes.every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);

    fireEvent.click(details[1]);
    expect(screen.getByText("GA 설명").closest("details")?.hasAttribute("open")).toBe(true);
    expect(screen.getByText("Sentry 설명").closest("details")?.hasAttribute("open")).toBe(true);
    expect(checkboxes.every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
  });

  it("허용을 철회하면 모니터링을 중지한다", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONSENT,
      JSON.stringify({
        analytics: "granted",
        monitoring: "granted",
        expiresAt: Date.now() + 60_000,
      }),
    );
    render(
      <AnalyticsConsentProvider gaEnabled monitoringEnabled>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    await waitFor(() => expect(startBrowserMonitoring).toHaveBeenCalledWith("public"));

    fireEvent.click(screen.getByRole("button", { name: "설정 열기" }));
    fireEvent.click(screen.getByRole("button", { name: "모두 거부" }));
    await waitFor(() => expect(stopBrowserMonitoring).toHaveBeenCalled());
  });

  it("v1 잔존 동의는 승계하지 않는다 — 허용 기록이 있어도 배너를 다시 연다", async () => {
    window.localStorage.setItem(
      LEGACY_STORAGE_KEYS.ANALYTICS_CONSENT,
      JSON.stringify({ value: "granted", expiresAt: Date.now() + 60_000 }),
    );
    render(
      <AnalyticsConsentProvider gaEnabled monitoringEnabled>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    expect(await screen.findByLabelText("선택적 데이터 수집 설정")).toBeTruthy();
    expect(screen.queryByTestId("ga-state")).toBeNull();
    expect(startBrowserMonitoring).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(LEGACY_STORAGE_KEYS.ANALYTICS_CONSENT)).toBeNull();
  });

  it("로컬 preview 플래그는 저장된 선택과 GA 구성 없이도 배너만 강제로 연다", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.CONSENT,
      JSON.stringify({ analytics: "denied", monitoring: "denied", expiresAt: Date.now() + 60_000 }),
    );
    render(
      <AnalyticsConsentProvider gaEnabled={false} monitoringEnabled={false} forceBanner>
        <SettingsButton />
      </AnalyticsConsentProvider>,
    );

    expect(await screen.findByLabelText("선택적 데이터 수집 설정")).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByTestId("ga-state")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "모두 거부" }));
    expect(screen.queryByLabelText("선택적 데이터 수집 설정")).toBeNull();
  });
});
