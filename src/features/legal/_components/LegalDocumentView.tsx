import type { LegalDocument } from "@/features/legal/_lib/legal-documents";

import styles from "./LegalDocumentView.module.css";

type LegalDocumentViewProps = {
  /** 현재 언어와 문서 종류에 맞게 선택된 정적 원문. */
  document: LegalDocument;
};

/**
 * 정책과 안내 문서가 공유하는 정적 레이아웃. 원문은 상위 페이지에서 주입한다.
 *
 * @param {LegalDocumentViewProps} props
 * @param {LegalDocument} props.document - 제목, 시행일과 본문 섹션으로 구성된 문서.
 * @returns {JSX.Element}
 */
const LegalDocumentView = ({ document }: LegalDocumentViewProps) => (
  <main className={styles.main}>
    <header className={styles.head}>
      <p className={styles.eyebrow}>{document.eyebrow}</p>
      <h1 className={styles.title}>{document.title}</h1>
      <p className={styles.effective}>{document.effective}</p>
    </header>
    <div className={styles.sections}>
      {document.sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2>{section.title}</h2>
          {section.content}
        </section>
      ))}
    </div>
  </main>
);

export { LegalDocumentView };
