import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/lang/_components/LocalizedLink", () => ({
  LocalizedLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { getLegalDocument, type LegalDocumentKind } from "@/features/legal/_lib/legal-documents";

const KINDS: LegalDocumentKind[] = ["privacy", "terms", "accessibility"];

describe("legal documents", () => {
  it.each(KINDS)("%s 문서가 한국어·영어에서 완결된 섹션 구조를 가진다", (kind) => {
    for (const lang of ["ko", "en"] as const) {
      const document = getLegalDocument(kind, lang);
      const titles = document.sections.map(({ title }) => title);

      expect(document.eyebrow.trim()).not.toBe("");
      expect(document.title.trim()).not.toBe("");
      expect(document.effective.trim()).not.toBe("");
      expect(titles.length).toBeGreaterThan(0);
      expect(new Set(titles).size).toBe(titles.length);
      expect(titles.every((title) => title.trim() !== "")).toBe(true);
    }
  });

  it("개인정보 처리방침이 세분화 동의와 국외 이전 필수 항목을 공개한다", () => {
    const html = renderToStaticMarkup(
      <>
        {getLegalDocument("privacy", "ko").sections.map((section) => (
          <div key={section.title}>{section.content}</div>
        ))}
      </>,
    );

    expect(html).toContain("ap-consent:v3");
    expect(html).toContain("이전받는 자·연락처");
    expect(html).toContain("국가·시기·방법");
    expect(html).toContain("목적·보유 기간");
    expect(html).toContain("거부 방법과 영향");
  });

  it("Sentry가 활성화된 배포에서는 국외 이전 필수 항목을 고지한다", async () => {
    vi.resetModules();
    vi.doMock("@/lib/monitoring/monitoring-dsn", () => ({
      SENTRY_DSN: "https://public@example.ingest.us.sentry.io/1",
      SENTRY_TRANSFER_COUNTRY: { ko: "미국", en: "the United States" },
    }));
    const { getLegalDocument: getEnabledLegalDocument } =
      await import("@/features/legal/_lib/legal-documents");
    const html = renderToStaticMarkup(
      <>
        {getEnabledLegalDocument("privacy", "ko").sections.map((section) => (
          <div key={section.title}>{section.content}</div>
        ))}
      </>,
    );

    expect(html).toContain("privacy@sentry.io");
    expect(html).toContain("Sentry Developer 플랜 · 30일");
    expect(html).toContain("미국 · 오류 발생 시");
  });

  it("Sentry가 비활성화된 배포에서는 Sentry 처리와 미설정 국가를 고지하지 않는다", async () => {
    vi.resetModules();
    vi.doMock("@/lib/monitoring/monitoring-dsn", () => ({
      SENTRY_DSN: "",
      SENTRY_TRANSFER_COUNTRY: { ko: "미설정", en: "not configured" },
    }));
    const { getLegalDocument: getDisabledLegalDocument } =
      await import("@/features/legal/_lib/legal-documents");

    for (const lang of ["ko", "en"] as const) {
      const html = renderToStaticMarkup(
        <>
          {getDisabledLegalDocument("privacy", lang).sections.map((section) => (
            <div key={section.title}>{section.content}</div>
          ))}
        </>,
      );
      expect(html).not.toContain("Sentry");
      expect(html).not.toContain(lang === "ko" ? "미설정" : "not configured");
    }
  });
});
