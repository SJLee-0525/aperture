import Image from "next/image";
import { Fragment } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { DICTIONARY } from "@/constants/dictionary";

import type { Group } from "@/features/search/_lib/build-search-groups";
import type { Lang } from "@/types/lang";

import styles from "./SearchResults.module.css";

type Props = {
  q: string;
  lang: Lang;
  groups: Group[];
  total: number;
};

/**
 * 통합 검색 결과 (/search?q=) 표시. 대조와 조립은 `buildSearchGroups` 가 끝낸 뒤 들어온다.
 * 인덱스 매치와 블로그 본문 매치가 모두 반영된 확정 목록만 이 컴포넌트에 들어온다.
 *
 * @returns {JSX.Element}
 */
const SearchResults = ({ q, lang, groups, total }: Props) => {
  const dict = DICTIONARY[lang];

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
                      {hitItem.snippetSegments ? (
                        <span className={styles.hitSnippet}>
                          {hitItem.snippetSegments.map((segment, segmentIndex) =>
                            segment.hit ? (
                              <mark key={segmentIndex} className={styles.mark}>
                                {segment.text}
                              </mark>
                            ) : (
                              <Fragment key={segmentIndex}>{segment.text}</Fragment>
                            ),
                          )}
                        </span>
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
