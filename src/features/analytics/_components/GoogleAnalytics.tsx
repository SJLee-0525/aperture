"use client";

import Script from "next/script";
import { Suspense, useCallback, useState } from "react";

import { PageViewTracker } from "@/features/analytics/_components/PageViewTracker";

import { GA_MEASUREMENT_ID } from "@/features/analytics/_lib/ga-measurement-id";
import { configureGoogleAnalytics } from "@/features/analytics/_lib/gtag";

/**
 * GA4(gtag.js) 로더. 측정 ID 가 없으면 아무것도 렌더하지 않아 개발·프리뷰는 무해하다.
 *
 * `send_page_view: false` + PageViewTracker 조합이므로 GA 콘솔의
 * **향상된 측정 → 페이지 변경(브라우저 기록 이벤트)** 은 꺼야 한다. 켜두면 클라이언트
 * 내비게이션마다 GA 자체 기록 리스너와 트래커가 각각 보내 조회수가 두 배로 잡힌다.
 *
 * CSP 는 googletagmanager(script) + google-analytics(connect·img) 를 허용해야 한다 —
 * `constants/security-headers.ts` 의 ANALYTICS_* 목록.
 *
 * @returns 동의 후 삽입하는 스크립트와 트래커. 측정 ID가 없으면 `null`.
 */
export function GoogleAnalytics() {
  const [ready, setReady] = useState(false);

  /** @returns 외부 스크립트 준비 후 consent와 GA4 설정을 적용한다. */
  const configure = useCallback(() => {
    configureGoogleAnalytics(GA_MEASUREMENT_ID);
    setReady(true);
  }, []);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script id="ga-consent-bootstrap" strategy="afterInteractive">
        {
          "window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};"
        }
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        onReady={configure}
      />
      {ready ? (
        <Suspense>
          <PageViewTracker />
        </Suspense>
      ) : null}
    </>
  );
}
