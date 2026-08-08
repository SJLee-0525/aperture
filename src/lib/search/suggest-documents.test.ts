import { describe, expect, it } from "vitest";

import type { SearchDocument, SearchSection } from "@/types/search";
import { SUGGESTION_LIMIT, suggestDocuments } from "@/lib/search/suggest-documents";
import { choseongOf } from "@/lib/text/choseong";
import { normalizeForSearch } from "@/lib/text/korean-tokenize";

/**
 * 서버(search-documents)와 같은 정규화 경로로 픽스처 문서를 만든다.
 *
 * @param {string} key
 * @param {SearchSection} section
 * @param {string} titleKo
 * @param {string} [body]
 * @returns {SearchDocument}
 */
const doc = (key: string, section: SearchSection, titleKo: string, body = ""): SearchDocument => ({
  key,
  section,
  title: { ko: titleKo, en: "" },
  index: {
    title: normalizeForSearch(titleKo),
    body: normalizeForSearch(body),
    choseong: choseongOf(`${titleKo} ${body}`),
  },
  href: `/x/${key}`,
});

const documents: SearchDocument[] = [
  doc("photo-harbor", "photo", "항구 풍경", "부산 야경"),
  doc("photo-dawn", "photo", "부산의 새벽"),
  doc("photo-sea", "photo", "겨울 바다", "강릉"),
  doc("work-piano", "music", "겨울 독주회", "피아노"),
];

describe("suggestDocuments", () => {
  it("빈 질의에는 빈 추천을 반환한다", () => {
    expect(suggestDocuments(documents, "  ", "ko")).toEqual([]);
  });

  it("일치가 없으면 빈 추천을 반환한다", () => {
    expect(suggestDocuments(documents, "서울", "ko")).toEqual([]);
  });

  it("제목 매치를 본문 매치보다 앞에 놓고 매치 구간을 하이라이트한다", () => {
    const suggestions = suggestDocuments(documents, "부산", "ko");

    expect(suggestions.map(({ key }) => key)).toEqual(["photo-dawn", "photo-harbor"]);
    expect(suggestions[0]!.href).toBe("/x/photo-dawn");
    expect(suggestions[0]!.section).toBe("photo");
    expect(suggestions[0]!.titleSegments).toEqual([
      { text: "부산", hit: true },
      { text: "의 새벽", hit: false },
    ]);
  });

  it("추천은 섹션 무관 통합 랭킹으로 최대 개수를 넘지 않는다", () => {
    const many = Array.from({ length: SUGGESTION_LIMIT + 3 }, (_, index) =>
      doc(`photo-${index}`, "photo", `부산 풍경 ${index + 1}호`),
    );

    expect(suggestDocuments(many, "부산", "ko")).toHaveLength(SUGGESTION_LIMIT);
  });

  it("초성 질의도 결과 페이지와 같은 규칙으로 추천한다", () => {
    const suggestions = suggestDocuments(documents, "ㅂㅅ", "ko");

    // 초성 매치는 전부 동점 — 문서 배열 순서(큐레이션) 유지.
    expect(suggestions.map(({ key }) => key)).toEqual(["photo-harbor", "photo-dawn"]);
  });
});
