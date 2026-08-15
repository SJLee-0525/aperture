"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { pickText } from "@/lib/i18n/pick-text";
import { highlightTokensFor, splitTitleByMatches } from "@/lib/search/highlight-title";
import { createDocumentScorer } from "@/lib/search/score-documents";
import { tokensFor } from "@/lib/text/korean-tokenize";

import type { ArticleBodyMatch } from "@/features/search/_lib/search-article-bodies";
import type { TitleSegment } from "@/lib/search/highlight-title";
import type { SearchDocument, SearchSection } from "@/types/search";

import styles from "./SearchResults.module.css";

type Props = {
  documents: SearchDocument[];
};

type Hit = {
  key: string;
  titleSegments: TitleSegment[];
  meta: string;
  href: string;
  imageUrl?: string;
  score: number;
  /** 본문 일치 근거. 태그(meta)와 별개로 제목 아랫줄에 표시한다. */
  snippet?: string;
};
/** 렌더 순서를 가진 결과 묶음 키. 개발 섹션만 프로젝트와 블로그로 나뉜다. */
type GroupKey = SearchSection | "blog";
type Group = { key: GroupKey; section: SearchSection; label: string; hits: Hit[] };

/** 통합 검색 결과 (/search?q=) — 서버가 정규화까지 마친 검색 인덱스를 q(useSearchParams)로 클라 대조.
 *  데이터는 ISR 캐시(q 무관), 대조만 클라라 타이핑/언어 전환에 즉시 반응.
 *  그룹 순서는 개발→블로그→사진→음악 고정, 그룹 안은 점수순(제목 매치 가중) + 매치 구간 하이라이트.
 *  블로그는 개발 섹션의 콘텐츠라 액센트는 개발을 따르고 목록만 따로 묶는다.
 *
 * @param {Props} props
 * @param {SearchDocument[]} props.documents
 * @returns {JSX.Element}
 *  자모만 친 질의("ㅂㅅ")는 서버가 만든 초성 인덱스와 대조하는 초성 검색으로 동작. */
const SearchResults = ({ documents }: Props) => {
  const { dict, lang } = useLang();
  const q = (useSearchParams().get("q") ?? "").trim();

  // 본문 일치는 서버 대조(/api/search-body) — 클라 인덱스는 전송량 때문에 본문 전문을 담지 않는다.
  // 응답을 질의와 함께 저장하고 현재 q 와 일치할 때만 쓴다. 낡은 응답과 실패는 대조에서 걸러진다.
  const [bodyResult, setBodyResult] = useState<{ q: string; matches: ArticleBodyMatch[] }>({
    q: "",
    matches: [],
  });
  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/search-body?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { matches: [] }))
      .then((payload) =>
        setBodyResult({ q, matches: (payload as { matches?: ArticleBodyMatch[] }).matches ?? [] }),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [q]);
  const bodyMatches = useMemo(
    () => (bodyResult.q === q ? bodyResult.matches : []),
    [bodyResult, q],
  );

  const groups = useMemo<Group[]>(() => {
    if (!q) return [];
    const queryTokens = tokensFor(q); // 채점·하이라이트가 공유 — 질의 토큰화는 한 번만
    const highlightTokens = highlightTokensFor(q, queryTokens);
    const scoreDocument = createDocumentScorer(q, queryTokens);
    const hits: Record<GroupKey, Hit[]> = { dev: [], blog: [], photo: [], music: [] };

    for (const document of documents) {
      const score = scoreDocument(document.index);
      if (score <= 0) continue;
      hits[document.subsection ?? document.section].push({
        key: document.key,
        titleSegments: splitTitleByMatches(pickText(document.title, lang), highlightTokens),
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
    // 본문 일치 — 인덱스(제목·요약·태그·목차)로 이미 잡힌 글은 건너뛰고, 스니펫을 근거로 보여 준다.
    const matchedBlogKeys = new Set(hits.blog.map(({ key }) => key));
    for (const match of bodyMatches) {
      const document = documents.find((item) => item.key === `article-${match.id}`);
      if (!document || matchedBlogKeys.has(document.key)) continue;
      hits.blog.push({
        key: document.key,
        titleSegments: splitTitleByMatches(pickText(document.title, lang), highlightTokens),
        meta: document.meta ? pickText(document.meta, lang) : "",
        href: document.href,
        imageUrl: document.imageUrl,
        // 제목·태그 매치보다 근거가 약하므로 인덱스 매치 아래에 놓는다.
        score: 0,
        snippet: match.snippet,
      });
    }

    // 그룹 내부만 점수순 — sort는 안정 정렬이라 동점은 문서 배열 순서(관리자 큐레이션) 유지.
    for (const key of Object.keys(hits) as GroupKey[]) {
      hits[key].sort((a, b) => b.score - a.score);
    }

    return (
      [
        { key: "dev", section: "dev", label: dict.sectionDev, hits: hits.dev },
        { key: "blog", section: "dev", label: dict.devArticlesNav, hits: hits.blog },
        { key: "photo", section: "photo", label: dict.sectionPhoto, hits: hits.photo },
        { key: "music", section: "music", label: dict.sectionMusic, hits: hits.music },
      ] as Group[]
    ).filter((group) => group.hits.length > 0);
  }, [q, lang, dict, documents, bodyMatches]);

  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>{q ? `“${q}”` : dict.searchPlaceholder}</h1>
        {q ? <span className={styles.total}>{total}</span> : null}
      </header>

      {!q ? (
        <p className={styles.empty}>{dict.searchPrompt}</p>
      ) : total === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{dict.searchEmpty}</p>
          <p className={styles.emptyHint}>{dict.searchEmptyChatHint}</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className={styles.group} data-section={group.section}>
            <div className={styles.groupHead}>
              <span className="u-label">{group.label}</span>
              <span className={styles.gcount}>{group.hits.length}</span>
            </div>
            <ul className={styles.list}>
              {group.hits.map((hitItem) => (
                <li key={hitItem.key}>
                  <LocalizedLink href={hitItem.href} prefetch={false} className={styles.hit}>
                    {hitItem.imageUrl ? (
                      <span className={styles.thumbnail} data-protected-image>
                        <Image
                          src={hitItem.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className={styles.thumbnailImage}
                        />
                      </span>
                    ) : null}
                    <span className={styles.hitText}>
                      <span className={styles.hitRow}>
                        <span className={styles.hitTitle}>
                          {hitItem.titleSegments.map((segment, segmentIndex) =>
                            segment.hit ? (
                              <mark key={segmentIndex} className={styles.mark}>
                                {segment.text}
                              </mark>
                            ) : (
                              <Fragment key={segmentIndex}>{segment.text}</Fragment>
                            ),
                          )}
                        </span>
                        {hitItem.meta ? (
                          <span className={styles.hitMeta}>{hitItem.meta}</span>
                        ) : null}
                      </span>
                      {hitItem.snippet ? (
                        <span className={styles.hitSnippet}>{hitItem.snippet}</span>
                      ) : null}
                    </span>
                  </LocalizedLink>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
};

export { SearchResults };
