import { TableScrollRegion } from "@/components/TableScrollRegion";

import { SENTRY_DSN } from "@/lib/monitoring/monitoring-dsn";

import type { ReactNode } from "react";

/** Privacy 본문에서 참조하는 외부 제공자의 공식 데이터 처리 문서. */
const EXTERNAL_POLICY_URLS = {
  web3Forms: "https://web3forms.com/privacy",
  googleAnalytics: "https://support.google.com/analytics/answer/6004245",
  googlePrivacyContact: "https://support.google.com/policies/contact/general_privacy_form",
  openAi: "https://platform.openai.com/docs/models/default-usage-policies-by-endpoint",
  gemini: "https://ai.google.dev/gemini-api/docs/zdr",
  sentry: "https://sentry.io/privacy/",
} as const;

/** DSN 이 없으면 브라우저 오류 수집 자체가 없으므로 본문에서 그 문단을 뺀다. */
const SENTRY_ENABLED = Boolean(SENTRY_DSN);

/** 정책 문서의 기존 E2E 선택자와 기능별 바깥 여백을 유지한다. */
const LegalTableScroll = ({ children, label }: { children: ReactNode; label: string }) => (
  <TableScrollRegion className="legal-document-table-scroll" label={label}>
    {children}
  </TableScrollRegion>
);

export { EXTERNAL_POLICY_URLS, LegalTableScroll, SENTRY_ENABLED };
