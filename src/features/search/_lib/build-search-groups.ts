import { DICTIONARY } from "@/constants/dictionary";
import { pickText } from "@/lib/i18n/pick-text";
import { highlightTokensFor, splitTextByMatches } from "@/lib/search/highlight-title";
import { createDocumentScorer } from "@/lib/search/score-documents";
import { tokensFor } from "@/lib/text/korean-tokenize";

import type { ArticleBodyMatch } from "@/features/search/_lib/search-article-bodies";
import type { TitleSegment } from "@/lib/search/highlight-title";
import type { Lang } from "@/types/lang";
import type { SearchDocument, SearchSection } from "@/types/search";

type Hit = {
  key: string;
  titleSegments: TitleSegment[];
  meta: string;
  href: string;
  imageUrl?: string;
  score: number;
  /** 본문 일치 근거. 태그(meta)와 별개로 제목 아랫줄에 강조 세그먼트로 표시한다. */
  snippetSegments?: TitleSegment[];
};

/** 렌더 순서를 가진 결과 묶음 키. 개발 섹션만 프로젝트와 블로그로 나뉜다. */
type GroupKey = SearchSection | "blog";

type Group = { key: GroupKey; section: SearchSection; label: string; hits: Hit[] };

/**
 * 스니펫의 강조 세그먼트. 가장자리 말줄임표를 분리하고 나머지만 대조한다.
 * NFKC 정규화가 말줄임표(…)를 "..." 로 펼치면 `splitTextByMatches` 의 길이 가드에 걸려
 * 스니펫 전체가 강조 없이 통과한다.
 */
const snippetSegmentsFor = (snippet: string, tokens: ReadonlySet<string>): TitleSegment[] => {
  const leading = snippet.startsWith("…");
  const trailing = snippet.endsWith("…");
  const core = snippet.slice(leading ? 1 : 0, trailing ? snippet.length - 1 : undefined);
  return [
    ...(leading ? [{ text: "…", hit: false }] : []),
    ...splitTextByMatches(core, tokens),
    ...(trailing ? [{ text: "…", hit: false }] : []),
  ];
};

/**
 * 검색 인덱스와 본문 일치를 화면에 뿌릴 그룹으로 조립한다.
 *
 * 그룹 순서는 개발, 블로그, 사진, 음악으로 고정한다. 블로그는 개발 섹션의 콘텐츠라
 * 액센트는 개발을 따르고 목록만 따로 묶는다. 그룹 안은 점수 내림차순이며 동점은
 * 문서 배열 순서(관리자 큐레이션)를 유지한다.
 *
 * 자모만 친 질의("ㅂㅅ")는 서버가 만든 초성 인덱스와 대조하는 초성 검색으로 동작한다.
 *
 * @param input.bodyMatches 본문 일치 목록. 빈 배열이면 인덱스 매치만으로 조립한다.
 * @param input.query 정리(trim)를 마친 방문자 질의.
 * @returns 항목이 있는 그룹만 담은 목록과 전체 결과 수.
 */
const buildSearchGroups = ({
  documents,
  bodyMatches,
  query,
  lang,
}: {
  documents: SearchDocument[];
  bodyMatches: ArticleBodyMatch[];
  query: string;
  lang: Lang;
}): { groups: Group[]; total: number } => {
  if (!query) return { groups: [], total: 0 };

  const dict = DICTIONARY[lang];
  const queryTokens = tokensFor(query); // 채점과 하이라이트가 공유하므로 질의 토큰화는 한 번만
  const highlightTokens = highlightTokensFor(query, queryTokens);
  const scoreDocument = createDocumentScorer(query, queryTokens);
  const hits: Record<GroupKey, Hit[]> = { dev: [], blog: [], photo: [], music: [] };

  for (const document of documents) {
    const score = scoreDocument(document.index);
    if (score <= 0) continue;
    hits[document.subsection ?? document.section].push({
      key: document.key,
      titleSegments: splitTextByMatches(pickText(document.title, lang), highlightTokens),
      meta:
        document.metaLabel === "albums"
          ? dict.albumsNav
          : document.meta
            ? pickText(document.meta, lang)
            : "",
      href: document.href,
      imageUrl: document.imageUrl,
      score,
    });
  }

  // 인덱스(제목·요약·태그·목차)로 이미 잡힌 글은 건너뛰고 나머지만 스니펫을 근거로 보여 준다.
  const matchedBlogKeys = new Set(hits.blog.map(({ key }) => key));
  for (const match of bodyMatches) {
    const document = documents.find((item) => item.key === `article-${match.id}`);
    if (!document || matchedBlogKeys.has(document.key)) continue;
    hits.blog.push({
      key: document.key,
      titleSegments: splitTextByMatches(pickText(document.title, lang), highlightTokens),
      meta: document.meta ? pickText(document.meta, lang) : "",
      href: document.href,
      imageUrl: document.imageUrl,
      // 제목·태그 매치보다 근거가 약하므로 인덱스 매치 아래에 놓는다.
      score: 0,
      snippetSegments: snippetSegmentsFor(match.snippet, highlightTokens),
    });
  }

  // sort 는 안정 정렬이라 동점 항목의 입력 순서가 보존된다.
  for (const key of Object.keys(hits) as GroupKey[]) {
    hits[key].sort((a, b) => b.score - a.score);
  }

  const groups = (
    [
      { key: "dev", section: "dev", label: dict.sectionDev, hits: hits.dev },
      { key: "blog", section: "dev", label: dict.devArticlesNav, hits: hits.blog },
      { key: "photo", section: "photo", label: dict.sectionPhoto, hits: hits.photo },
      { key: "music", section: "music", label: dict.sectionMusic, hits: hits.music },
    ] as Group[]
  ).filter((group) => group.hits.length > 0);

  return { groups, total: groups.reduce((count, group) => count + group.hits.length, 0) };
};

export { buildSearchGroups };
export type { Group, Hit };
