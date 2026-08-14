"use client";

import { useState } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { ROUTES } from "@/constants/routes";
import { SENTRY_TRANSFER_COUNTRY } from "@/lib/monitoring/monitoring-dsn";

import type { TrackingConsent } from "@/features/analytics/_lib/analytics-consent";

import styles from "./AnalyticsConsentBanner.module.css";

type Props = {
  gaEnabled: boolean;
  monitoringEnabled: boolean;
  initialConsent: TrackingConsent | null;
  onDecide: (decision: TrackingConsent) => void;
};

/**
 * 방문 분석과 오류 보고를 따로 선택하는 하단 배너를 렌더한다.
 *
 * @param {Props} props - 배너 설정과 저장 콜백.
 * @param {boolean} props.gaEnabled - 방문 분석을 선택할 수 있는지 여부.
 * @param {boolean} props.monitoringEnabled - 오류 보고를 선택할 수 있는지 여부.
 * @param {TrackingConsent | null} props.initialConsent - 저장된 선택.
 * @param {(decision: TrackingConsent) => void} props.onDecide - 선택 저장 콜백.
 * @returns {JSX.Element} 선택적 데이터 수집 설정 배너.
 */
const AnalyticsConsentBanner = ({
  gaEnabled,
  monitoringEnabled,
  initialConsent,
  onDecide,
}: Props) => {
  const { dict, lang } = useLang();
  const [analytics, setAnalytics] = useState(initialConsent?.analytics === "granted");
  const [monitoring, setMonitoring] = useState(initialConsent?.monitoring === "granted");

  const save = () =>
    onDecide({
      analytics: gaEnabled && analytics ? "granted" : "denied",
      monitoring: monitoringEnabled && monitoring ? "granted" : "denied",
    });

  const denyAll = () => onDecide({ analytics: "denied", monitoring: "denied" });

  return (
    <section
      className={styles.banner}
      aria-label={dict.analyticsConsentLabel}
      data-analytics-consent
    >
      <div className={styles.copy}>
        <h2 className={styles.title}>{dict.analyticsConsentTitle}</h2>
        <p className={styles.body}>
          {dict.analyticsConsentBody}{" "}
          <LocalizedLink href={ROUTES.PRIVACY}>{dict.privacyNav}</LocalizedLink>
        </p>
        <div className={styles.choices}>
          {gaEnabled ? (
            <div className={styles.choice}>
              <label className={styles.choiceLabel} data-cursor-target>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.currentTarget.checked)}
                />
                <strong>{dict.analyticsConsentAnalyticsLabel}</strong>
              </label>
              <details className={styles.details}>
                <summary aria-label={dict.analyticsConsentDetailsLabel} data-cursor-target />
                <p>{dict.analyticsConsentAnalyticsBody}</p>
              </details>
            </div>
          ) : null}
          {monitoringEnabled ? (
            <div className={styles.choice}>
              <label className={styles.choiceLabel} data-cursor-target>
                <input
                  type="checkbox"
                  checked={monitoring}
                  onChange={(event) => setMonitoring(event.currentTarget.checked)}
                />
                <strong>{dict.analyticsConsentMonitoringLabel}</strong>
              </label>
              <details className={styles.details}>
                <summary aria-label={dict.analyticsConsentDetailsLabel} data-cursor-target />
                <p>
                  {dict.analyticsConsentMonitoringBody.replace(
                    "{country}",
                    SENTRY_TRANSFER_COUNTRY[lang],
                  )}
                </p>
              </details>
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={denyAll}>
          {dict.analyticsConsentDenyAll}
        </button>
        <button type="button" className={styles.primary} onClick={save}>
          {dict.analyticsConsentSave}
        </button>
      </div>
    </section>
  );
};

export { AnalyticsConsentBanner };
