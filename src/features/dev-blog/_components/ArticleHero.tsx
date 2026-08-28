"use client";

import { DetailHero } from "@/components/DetailHero";

import { ARTICLE_HERO_MIN_HEIGHT } from "@/features/dev-blog/_lib/article-hero-height";

import { DICTIONARY } from "@/constants/dictionary";
import { ROUTES } from "@/constants/routes";
import { formatEventYMD } from "@/lib/format/format-date";
import { localizePath } from "@/lib/i18n/locale-path";

import { imagePreviewUrl } from "@/types/image";

import type { ImageMeta } from "@/types/image";
import type { Lang } from "@/types/lang";

import styles from "./ArticleHero.module.css";

type Props = {
  title: string;
  summary: string;
  cover: ImageMeta | null;
  coverAlt: string;
  publishedAt: Date | null;
  readingMinutes: number;
  tagLabels: string[];
  lang: Lang;
  shareUrl?: string;
};

/**
 * 블로그 상세 상단 — 대표 이미지를 배경으로 제목·요약·발행 정보·태그를 얹는다.
 *
 * 제목과 요약은 이미지에 새기지 않고 실제 텍스트로 둔다. 검색·번역·화면 낭독기가 읽어야 하고
 * 대표 이미지가 없는 글도 같은 정보를 같은 순서로 보여 줘야 하기 때문이다. 이미지가 없으면
 * 공용 히어로가 타이포그래피형으로 바뀌고 여기서는 글자색만 밝은 배경용으로 되돌린다.
 *
 * 대표 이미지의 초점 위치는 다루지 않는다 — `ImageMeta` 에 해당 필드가 없고, 넣으려면 업로더와
 * 관리자 폼, 기존 문서 이행까지 함께 바뀐다. 지금은 가운데를 기준으로 잘라 쓴다.
 *
 * @param props.title 현재 언어 제목.
 * @param props.summary 현재 언어 요약. 비면 표시하지 않는다.
 * @param props.cover 대표 이미지. `null` 이면 타이포그래피형 히어로가 된다.
 * @param props.coverAlt 관리자가 적은 대체 텍스트. 제목을 반복하지 않는다.
 * @param props.publishedAt 발행일. 없으면(초안 미리보기) 발행일 자리를 비운다.
 * @param props.readingMinutes 본문에서 센 예상 읽기 시간.
 * @param props.tagLabels 현재 언어로 해석한 태그 라벨.
 * @param props.lang 복귀 링크의 로케일 프리픽스와 사전 언어를 고른다.
 * @param props.shareUrl 공유할 canonical 주소. 생략하면 현재 주소를 공유한다.
 */
const ArticleHero = ({
  title,
  summary,
  cover,
  coverAlt,
  publishedAt,
  readingMinutes,
  tagLabels,
  lang,
  shareUrl,
}: Props) => {
  const dict = DICTIONARY[lang];
  const coverUrl = cover ? imagePreviewUrl(cover) : "";

  return (
    <DetailHero
      cover={coverUrl ? { url: coverUrl, alt: coverAlt } : null}
      back={{ href: localizePath(lang, ROUTES.DEV_ARTICLES), label: dict.devArticlesNav }}
      share={{ title, label: dict.shareLabel, url: shareUrl }}
      minHeight={ARTICLE_HERO_MIN_HEIGHT}
    >
      <div className={styles.text} data-variant={coverUrl ? "image" : "plain"}>
        <h1 className={styles.title}>{title}</h1>
        {summary ? <p className={styles.summary}>{summary}</p> : null}

        {/* 넓은 화면에서는 태그를 왼쪽에, 발행 정보를 오른쪽 끝에 둔다. */}
        <div className={styles.footRow}>
          {tagLabels.length > 0 ? (
            <ul className={styles.tags}>
              {tagLabels.map((label) => (
                <li key={label} className={styles.tag}>
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <span />
          )}

          <div className={styles.metaGroup}>
            <p className={styles.meta}>
              {publishedAt ? (
                <time dateTime={publishedAt.toISOString()}>{formatEventYMD(publishedAt)}</time>
              ) : (
                <span>{dict.articleDraftLabel}</span>
              )}
              <span className={styles.metaDot} aria-hidden="true" />
              <span>{dict.articleReadingMinutes.replace("{n}", String(readingMinutes))}</span>
            </p>
          </div>
        </div>
      </div>
    </DetailHero>
  );
};

export { ArticleHero };
