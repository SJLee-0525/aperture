"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { AnalyticsConsentBanner } from "@/features/analytics/_components/AnalyticsConsentBanner";
import {
  type AnalyticsConsent,
  getAnalyticsConsentSnapshot,
  setBrowserAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "@/features/analytics/_lib/analytics-consent";
import { disableGoogleAnalytics } from "@/features/analytics/_lib/gtag";

/** 분석 설정 UI와 현재 선택을 자식 컴포넌트에 제공하는 Context 계약. */
type AnalyticsConsentContextValue = {
  /** GA 측정 ID 또는 로컬 배너 미리보기가 구성됐는지 여부. */
  analyticsEnabled: boolean;
  /** 저장된 방문자 선택. 아직 선택하지 않았으면 `null`. */
  consent: AnalyticsConsent | null;
  /** Footer 등에서 분석 설정 배너를 다시 여는 함수. */
  openSettings: () => void;
};

type AnalyticsConsentProviderProps = {
  /** 운영 환경에 유효한 GA4 측정 ID가 있는지 여부. */
  analyticsEnabled: boolean;
  /** 분석 동의 경계 안에서 렌더할 공개 페이지 트리. */
  children: React.ReactNode;
  /** 로컬 UI 확인용. GA 구성 여부와 무관하며 production layout에서는 항상 `false`다. */
  forceBanner?: boolean;
};

/** 공개 트리에서 공유하는 분석 동의 Context. */
const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(null);
/** 방문자가 허용하기 전에는 초기 번들에 포함하지 않는 GA 클라이언트 청크. */
const GoogleAnalytics = dynamic(
  () =>
    import("@/features/analytics/_components/GoogleAnalytics").then(
      (module) => module.GoogleAnalytics,
    ),
  { ssr: false },
);

/** @returns {() => void} 아무 작업도 하지 않는 구독 해제 함수. */
const subscribeNoop = (): (() => void) => () => undefined;
/** @returns {boolean} 클라이언트 hydration 완료 스냅샷. */
const clientHydratedSnapshot = (): boolean => true;
/** @returns {boolean} 서버 렌더 중 hydration 스냅샷. */
const serverHydratedSnapshot = (): boolean => false;

/**
 * 공개 트리의 분석 동의 상태와 GA 로딩을 한 경계에서 관리한다.
 * GA 클라이언트 코드는 허용 상태에서만 별도 청크로 불러온다.
 *
 * @param {AnalyticsConsentProviderProps} props
 * @param {boolean} props.analyticsEnabled - 유효한 GA4 측정 ID가 있는지 여부.
 * @param {React.ReactNode} props.children - 분석 동의 경계 안의 공개 페이지 트리.
 * @param {boolean} [props.forceBanner=false] - 개발 환경에서 배너만 강제로 표시할지 여부.
 * @returns {JSX.Element}
 */
const AnalyticsConsentProvider = ({
  analyticsEnabled,
  children,
  forceBanner = false,
}: AnalyticsConsentProviderProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const consentUiEnabled = analyticsEnabled || forceBanner;

  /**
   * 분석 선택 변경을 구독하고 철회가 감지되면 React 갱신 전에 GA를 차단한다.
   *
   * @param {() => void} listener - 외부 스토어 변경을 React에 알리는 콜백.
   * @returns {() => void} 분석 선택 구독 해제 함수.
   */
  const subscribeConsent = useCallback(
    (listener: () => void) =>
      subscribeAnalyticsConsent(() => {
        if (getAnalyticsConsentSnapshot() !== "granted") disableGoogleAnalytics();
        listener();
      }),
    [],
  );
  /** @returns {AnalyticsConsent | null} UI가 활성화된 경우의 현재 분석 선택. */
  const getConsentSnapshot = useCallback(
    () => (consentUiEnabled ? getAnalyticsConsentSnapshot() : null),
    [consentUiEnabled],
  );

  const consent = useSyncExternalStore(
    consentUiEnabled ? subscribeConsent : subscribeNoop,
    getConsentSnapshot,
    () => null,
  );
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    clientHydratedSnapshot,
    serverHydratedSnapshot,
  );

  /**
   * 배너 선택을 저장하고 현재 설정 UI를 닫는다.
   *
   * @param {AnalyticsConsent} value - 방문자가 누른 허용 또는 거부 상태.
   * @returns {void}
   */
  const decide = useCallback((value: AnalyticsConsent) => {
    setSettingsOpen(false);
    setPreviewDismissed(true);
    setBrowserAnalyticsConsent(value);
  }, []);

  /** @returns {void} 분석 UI가 구성된 경우 설정 배너를 다시 연다. */
  const openSettings = useCallback(() => {
    if (consentUiEnabled) {
      setPreviewDismissed(false);
      setSettingsOpen(true);
    }
  }, [consentUiEnabled]);

  const contextValue = useMemo(
    () => ({ analyticsEnabled: consentUiEnabled, consent, openSettings }),
    [consentUiEnabled, consent, openSettings],
  );

  return (
    <AnalyticsConsentContext.Provider value={contextValue}>
      {children}
      {analyticsEnabled && consent === "granted" ? <GoogleAnalytics /> : null}
      {consentUiEnabled &&
      hydrated &&
      !previewDismissed &&
      (forceBanner || settingsOpen || consent == null) ? (
        <AnalyticsConsentBanner onDecide={decide} />
      ) : null}
    </AnalyticsConsentContext.Provider>
  );
};

export { AnalyticsConsentContext, AnalyticsConsentProvider };
