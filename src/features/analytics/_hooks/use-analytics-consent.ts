"use client";

import { useContext } from "react";

import { AnalyticsConsentContext } from "@/features/analytics/_components/AnalyticsConsentProvider";

/**
 * 가장 가까운 분석 동의 Provider의 상태와 설정 열기 함수를 반환한다.
 *
 * @returns 현재 분석 동의 Context.
 * @throws {Error} Provider 밖에서 호출한 경우.
 */
const useAnalyticsConsent = () => {
  const value = useContext(AnalyticsConsentContext);
  if (!value) throw new Error("useAnalyticsConsent must be used within AnalyticsConsentProvider");
  return value;
};

export { useAnalyticsConsent };
