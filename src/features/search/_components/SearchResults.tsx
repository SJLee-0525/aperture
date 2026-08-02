"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";
import type { SearchDocument, SearchSection } from "@/features/search/_lib/search-documents";
import { matchesSearchText } from "@/lib/ai/rag-query";
import { pickText } from "@/lib/i18n/pick-text";

import styles from "./SearchResults.module.css";

type Props = {
  documents: SearchDocument[];
};

type Hit = { key: string; title: string; meta: string; href: string; imageUrl?: string };
type Group = { section: SearchSection; label: string; hits: Hit[] };

/** 통합 검색 결과 (/search?q=) — 서버가 투영한 최소 검색 문서를 q(useSearchParams)로 클라 필터.
 *  데이터는 ISR 캐시(q 무관), 필터만 클라라 타이핑/언어 전환에 즉시 반응. */
const SearchResults = ({ documents }: Props) => {
  const { dict, lang } = useLang();
  const q = (useSearchParams().get("q") ?? "").trim();

  const groups = useMemo<Group[]>(() => {
    if (!q) return [];
    const hits: Record<SearchSection, Hit[]> = { photo: [], music: [], dev: [] };

    for (const document of documents) {
      const searchableText = `${document.text.ko} ${document.text.en}`;
      if (!matchesSearchText(q, searchableText)) continue;
      hits[document.section].push({
        key: document.key,
        title: pickText(document.title, lang),
        meta:
          document.metaLabel === "albums"
            ? dict.albumsNav
            : document.meta
              ? pickText(document.meta, lang)
              : "",
        href: document.href,
        imageUrl: document.imageUrl,
      });
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
                      <span className={styles.hitTitle}>{hitItem.title}</span>
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
