"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { Album } from "@/types/album";
import type { DevProject } from "@/types/dev";
import type { MusicAward, MusicMedia, MusicWork } from "@/types/music";
import type { Photo } from "@/types/photo";

import styles from "./SearchResults.module.css";

type Props = {
  photos: Photo[];
  albums: Album[];
  works: MusicWork[];
  awards: MusicAward[];
  media: MusicMedia[];
  projects: DevProject[];
};

type Hit = { key: string; title: string; meta: string; href: string };
type Group = { section: "photo" | "music" | "dev"; label: string; hits: Hit[] };

/** 통합 검색 결과 (/search?q=) — 서버가 넘긴 전 섹션 데이터를 q(useSearchParams)로 클라 필터.
 *  데이터는 ISR 캐시(q 무관), 필터만 클라라 타이핑/언어 전환에 즉시 반응. */
const SearchResults = ({ photos, albums, works, awards, media, projects }: Props) => {
  const { dict, lang } = useLang();
  const q = (useSearchParams().get("q") ?? "").trim();
  const ql = q.toLowerCase();

  const groups = useMemo<Group[]>(() => {
    if (!ql) return [];
    /** 주어진 텍스트 조각들 중 하나라도 q 를 포함하면 매치. */
    const hit = (...parts: (string | undefined)[]) =>
      parts.filter(Boolean).join(" ").toLowerCase().includes(ql);

    const photoHits: Hit[] = [
      ...photos
        .filter((p) => hit(pickText(p.title, lang), pickText(p.place, lang), p.camera, p.lens))
        .map((p) => ({
          key: `photo-${p.id}`,
          title: pickText(p.title, lang),
          meta: pickText(p.place, lang),
          href: `${ROUTES.PHOTO}?photo=${p.id}`,
        })),
      ...albums
        .filter((a) => hit(pickText(a.title, lang), pickText(a.subtitle, lang)))
        .map((a) => ({
          key: `album-${a.id}`,
          title: pickText(a.title, lang),
          meta: dict.albumsNav,
          href: `${ROUTES.PHOTO_ALBUMS}/${a.id}`,
        })),
    ];

    const musicHits: Hit[] = [
      ...works
        .filter((w) =>
          hit(
            pickText(w.title, lang),
            pickText(w.subtitle, lang),
            pickText(w.venue, lang),
            pickText(w.category, lang),
            w.program.join(" "),
          ),
        )
        .map((w) => ({
          key: `work-${w.id}`,
          title: pickText(w.title, lang),
          meta: pickText(w.subtitle, lang),
          href: `${ROUTES.MUSIC}?work=${w.id}`,
        })),
      ...awards
        .filter((a) => hit(pickText(a.name, lang), a.place))
        .map((a) => ({
          key: `award-${a.id}`,
          title: pickText(a.name, lang),
          meta: String(a.year),
          href: `${ROUTES.MUSIC_CAREER}?award=${a.id}`,
        })),
      ...media
        .filter((m) => hit(pickText(m.title, lang), pickText(m.source, lang)))
        .map((m) => ({
          key: `media-${m.id}`,
          title: pickText(m.title, lang),
          meta: pickText(m.source, lang),
          href: ROUTES.MUSIC_MEDIA,
        })),
    ];

    const devHits: Hit[] = projects
      .filter((p) =>
        hit(
          pickText(p.title, lang),
          pickText(p.category, lang),
          pickText(p.summary, lang),
          p.techTags.join(" "),
        ),
      )
      .map((p) => ({
        key: `proj-${p.id}`,
        title: pickText(p.title, lang),
        meta: pickText(p.category, lang),
        href: `${ROUTES.DEV_PROJECTS}?project=${p.id}`,
      }));

    return (
      [
        { section: "photo", label: dict.sectionPhoto, hits: photoHits },
        { section: "music", label: dict.sectionMusic, hits: musicHits },
        { section: "dev", label: dict.sectionDev, hits: devHits },
      ] as Group[]
    ).filter((g) => g.hits.length > 0);
  }, [ql, lang, dict, photos, albums, works, awards, media, projects]);

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
