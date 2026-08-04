"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";
import type { TitleSegment } from "@/lib/search/highlight-title";
import { highlightTokensFor, splitTitleByMatches } from "@/lib/search/highlight-title";
import { createDocumentScorer } from "@/lib/search/score-documents";
import type { SearchDocument, SearchSection } from "@/types/search";
import { pickText } from "@/lib/i18n/pick-text";
import { tokensFor } from "@/lib/text/korean-tokenize";

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
};
type Group = { section: SearchSection; label: string; hits: Hit[] };

/** 통합 검색 결과 (/search?q=) — 서버가 정규화까지 마친 검색 인덱스를 q(useSearchParams)로 클라 대조.
 *  데이터는 ISR 캐시(q 무관), 대조만 클라라 타이핑/언어 전환에 즉시 반응.
 *  그룹 순서는 사진→음악→개발 고정, 그룹 안은 점수순(제목 매치 가중) + 매치 구간 하이라이트.
 *  자모만 친 질의("ㅂㅅ")는 서버가 만든 초성 인덱스와 대조하는 초성 검색으로 동작. */
const SearchResults = ({ documents }: Props) => {
  const { dict, lang } = useLang();
  const q = (useSearchParams().get("q") ?? "").trim();

  const groups = useMemo<Group[]>(() => {
    if (!q) return [];
    const queryTokens = tokensFor(q); // 채점·하이라이트가 공유 — 질의 토큰화는 한 번만
    const highlightTokens = highlightTokensFor(q, queryTokens);
    const scoreDocument = createDocumentScorer(q, queryTokens);
    const hits: Record<SearchSection, Hit[]> = { photo: [], music: [], dev: [] };

    for (const document of documents) {
      const score = scoreDocument(document.index);
      if (score <= 0) continue;
      hits[document.section].push({
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
    // 그룹 내부만 점수순 — sort는 안정 정렬이라 동점은 문서 배열 순서(관리자 큐레이션) 유지.
    for (const section of Object.keys(hits) as SearchSection[]) {
      hits[section].sort((a, b) => b.score - a.score);
    }

    return [
      { section: "photo", label: dict.sectionPhoto, hits: hits.photo },
      { section: "music", label: dict.sectionMusic, hits: hits.music },
      { section: "dev", label: dict.sectionDev, hits: hits.dev },
    ].filter((group) => group.hits.length > 0) as Group[];
  }, [q, lang, dict, documents]);

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
          <section key={group.section} className={styles.group} data-section={group.section}>
            <div className={styles.groupHead}>
              <span className="u-label">{group.label}</span>
              <span className={styles.gcount}>{group.hits.length}</span>
            </div>
            <ul className={styles.list}>
              {group.hits.map((hitItem) => (
                <li key={hitItem.key}>
                  <Link href={hitItem.href} prefetch={false} className={styles.hit}>
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
                      {hitItem.meta ? <span className={styles.hitMeta}>{hitItem.meta}</span> : null}
                    </span>
                  </Link>
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
