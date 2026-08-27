import type { ReactNode } from "react";

/** 법적·운영 문서 안의 제목 있는 본문 단위. */
type LegalSection = { title: string; content: ReactNode };

/** 공용 문서 레이아웃에 전달하는 언어별 정적 원문. */
type LegalDocument = {
  eyebrow: string;
  title: string;
  effective: string;
  sections: readonly LegalSection[];
};

/** 공용 레이아웃으로 제공하는 문서 종류. */
type LegalDocumentKind = "privacy" | "terms" | "accessibility";

export type { LegalDocument, LegalDocumentKind, LegalSection };
