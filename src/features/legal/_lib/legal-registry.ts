import { ACCESSIBILITY_EN } from "@/features/legal/_lib/legal/accessibility-en";
import { ACCESSIBILITY_KO } from "@/features/legal/_lib/legal/accessibility-ko";
import { PRIVACY_EN } from "@/features/legal/_lib/legal/privacy-en";
import { PRIVACY_KO } from "@/features/legal/_lib/legal/privacy-ko";
import { TERMS_EN } from "@/features/legal/_lib/legal/terms-en";
import { TERMS_KO } from "@/features/legal/_lib/legal/terms-ko";

import type { LegalDocument, LegalDocumentKind } from "@/features/legal/_lib/legal/legal-document";
import type { Lang } from "@/types/lang";

/**
 * 문서 종류·언어와 원문을 잇는 표.
 *
 * 원문은 `_lib/legal/` 아래 언어마다 한 파일이다. 컴포넌트가 아니라 문서 데이터라
 * `_components/` 가 아닌 `_lib/` 에 두며, 본문에 링크와 표가 있어 확장자만 `.tsx` 다.
 */
const LEGAL_DOCUMENTS: Record<LegalDocumentKind, Record<Lang, LegalDocument>> = {
  privacy: { ko: PRIVACY_KO, en: PRIVACY_EN },
  terms: { ko: TERMS_KO, en: TERMS_EN },
  accessibility: { ko: ACCESSIBILITY_KO, en: ACCESSIBILITY_EN },
};

/** 문서 종류와 URL 언어에 대응하는 정적 원문. */
const getLegalDocument = (kind: LegalDocumentKind, lang: Lang): LegalDocument =>
  LEGAL_DOCUMENTS[kind][lang];

/** URL 세그먼트가 지원하는 법적 문서인지 판별한다. 동적 라우트의 파라미터 검증에 쓴다. */
const isLegalDocumentKind = (value: string): value is LegalDocumentKind => value in LEGAL_DOCUMENTS;

/** `generateStaticParams` 가 순회할 문서 종류. 라우트가 이 목록 밖 세그먼트를 받지 않는다. */
const LEGAL_DOCUMENT_KINDS = Object.keys(LEGAL_DOCUMENTS) as LegalDocumentKind[];

/** 문서별 SEO 메타데이터. 문서를 추가할 때 이 파일 하나만 고치면 된다. */
const LEGAL_DOCUMENT_METADATA: Record<
  LegalDocumentKind,
  { title: Record<Lang, string>; description: Record<Lang, string> }
> = {
  privacy: {
    title: { ko: "개인정보 처리방침", en: "Privacy Policy" },
    description: {
      ko: "Sungjoon Lee 포트폴리오의 언어 설정, 방문 분석과 개인정보 처리 방식을 안내합니다.",
      en: "How the Sungjoon Lee portfolio handles language preferences, visitor analytics, and personal data.",
    },
  },
  terms: {
    title: { ko: "사이트 이용 및 콘텐츠 안내", en: "Site Use & Content Notice" },
    description: {
      ko: "포트폴리오 콘텐츠의 저작권, 이용 범위, 외부 링크와 AI 챗봇 안내입니다.",
      en: "Copyright, permitted use, external links, and AI chatbot terms for this portfolio.",
    },
  },
  accessibility: {
    title: { ko: "접근성 안내", en: "Accessibility Statement" },
    description: {
      ko: "포트폴리오의 웹 접근성 목표, 적용 조치, 알려진 제한과 피드백 방법입니다.",
      en: "Accessibility goals, measures, known limitations, and feedback options for this portfolio.",
    },
  },
};

export { getLegalDocument, isLegalDocumentKind, LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_METADATA };
