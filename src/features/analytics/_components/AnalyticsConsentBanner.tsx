"use client";

import { ROUTES } from "@/constants/routes";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { useLang } from "@/features/lang/_hooks/use-lang";

import type { AnalyticsConsent } from "@/features/analytics/_lib/analytics-consent";

import styles from "./AnalyticsConsentBanner.module.css";

type AnalyticsConsentBannerProps = {
  /** 방문자가 허용 또는 거부 버튼을 누른 직후 실행할 콜백. */
  onDecide: (decision: AnalyticsConsent) => void;
};

/**
 * 추적 전송 전에 선택을 받는 비차단형 하단 분석 동의 배너.
 *
 * @param {AnalyticsConsentBannerProps} props
 * @param {(decision: AnalyticsConsent) => void} props.onDecide - 허용 또는 거부 선택 콜백.
 * @returns {JSX.Element}
 */
const AnalyticsConsentBanner = ({ onDecide }: AnalyticsConsentBannerProps) => {
  const { dict } = useLang();

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
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => onDecide("denied")}>
          {dict.analyticsConsentDeny}
        </button>
        <button type="button" className={styles.primary} onClick={() => onDecide("granted")}>
          {dict.analyticsConsentAllow}
        </button>
      </div>
    </section>
  );
};

export { AnalyticsConsentBanner };
