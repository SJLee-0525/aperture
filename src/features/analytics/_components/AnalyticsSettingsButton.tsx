"use client";

import { useAnalyticsConsent } from "@/features/analytics/_hooks/use-analytics-consent";
import { useLang } from "@/features/lang/_hooks/use-lang";

/**
 * Footer와 Privacy 페이지에서 분석·오류 모니터링 선택을 다시 여는 공용 버튼.
 *
 * @returns {JSX.Element | null} 동의 UI가 구성된 경우 설정 버튼, 아니면 `null`.
 */
const AnalyticsSettingsButton = () => {
  const { dict } = useLang();
  const { consentUiEnabled, openSettings } = useAnalyticsConsent();
  if (!consentUiEnabled) return null;
  return (
    <button type="button" onClick={openSettings}>
      {dict.cookieSettingsLabel}
    </button>
  );
};

export { AnalyticsSettingsButton };
