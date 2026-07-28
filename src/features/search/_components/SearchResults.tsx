"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";
import type { SearchDocument, SearchSection } from "@/features/search/_lib/search-documents";
import { pickText } from "@/lib/i18n/pick-text";

import styles from "./SearchResults.module.css";

type Props = {
  documents: SearchDocument[];
};

type Hit = { key: string; title: string; meta: string; href: string };
type Group = { section: SearchSection; label: string; hits: Hit[] };

/** 통합 검색 결과 (/search?q=) — 서버가 투영한 최소 검색 문서를 q(useSearchParams)로 클라 필터.
 *  데이터는 ISR 캐시(q 무관), 필터만 클라라 타이핑/언어 전환에 즉시 반응. */
const SearchResults = ({ documents }: Props) => {
  const { dict, lang } = useLang();
  const q = (useSearchParams().get("q") ?? "").trim();
  const ql = q.toLowerCase();

  const groups = useMemo<Group[]>(() => {
    if (!ql) return [];
    const hitsBySection = (section: SearchSection): Hit[] =>
      documents
        .filter(
          (document) =>
            document.section === section &&
            pickText(document.text, lang).toLowerCase().includes(ql),
        )
        .map((document) => ({
          key: document.key,
          title: pickText(document.title, lang),
          meta:
            document.metaLabel === "albums"
              ? dict.albumsNav
              : document.meta
                ? pickText(document.meta, lang)
                : "",
          href: document.href,
        }));

    return (
      [
        { section: "photo", label: dict.sectionPhoto, hits: hitsBySection("photo") },
        { section: "music", label: dict.sectionMusic, hits: hitsBySection("music") },
        { section: "dev", label: dict.sectionDev, hits: hitsBySection("dev") },
      ] as Group[]
    ).filter((g) => g.hits.length > 0);
  }, [ql, lang, dict, documents]);

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
        <p className={styles.empty}>{dict.searchEmpty}</p>
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
                  <Link href={hitItem.href} className={styles.hit}>
                    <span className={styles.hitTitle}>{hitItem.title}</span>
                    {hitItem.meta ? <span className={styles.hitMeta}>{hitItem.meta}</span> : null}
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
