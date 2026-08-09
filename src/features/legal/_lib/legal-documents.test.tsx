import { describe, expect, it } from "vitest";

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
});
