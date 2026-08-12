import type { MetadataRoute } from "next";

import { LANGS } from "@/constants/langs";
import { ROUTES, albumRoute, devArticleRoute } from "@/constants/routes";
import { getDevArticles } from "@/lib/content/dev-articles";
import { getAlbums } from "@/lib/content/photo";
import { localizePath } from "@/lib/i18n/locale-path";
import { languageAlternates } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/site-url";

const PUBLIC_ROUTES = [
  ROUTES.LANDING,
  ROUTES.PHOTO,
  ROUTES.PHOTO_ALBUMS,
  ROUTES.PHOTO_MAP,
  ROUTES.PHOTO_ABOUT,
  ROUTES.MUSIC,
  ROUTES.MUSIC_CAREER,
  ROUTES.MUSIC_MEDIA,
  ROUTES.MUSIC_ABOUT,
  ROUTES.DEV,
  ROUTES.DEV_PROJECTS,
  ROUTES.DEV_CAREER,
  ROUTES.DEV_ARTICLES,
  ROUTES.CONTACT,
  ROUTES.PRIVACY,
  ROUTES.TERMS,
  ROUTES.ACCESSIBILITY,
] as const;

/**
 * 언어별 URL을 각각 등록(ko·en 2배) + hreflang alternates.
 * alternates는 페이지 <link rel="alternate">(pageMetadata)와 같은 세트를 절대 URL로 출력 —
 * 두 채널이 단일 출처(languageAlternates)를 공유하므로 충돌하지 않는다.
 *
 * @returns {Promise<MetadataRoute.Sitemap>}
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [albums, articles] = await Promise.all([getAlbums(), getDevArticles()]);
  const routes = [...PUBLIC_ROUTES, ...albums.map((album) => albumRoute(album.id))];

  const pages = routes.flatMap((route) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(route)).map(([code, path]) => [code, absoluteUrl(path)]),
    );

    return LANGS.map((lang) => ({
      url: absoluteUrl(localizePath(lang, route)),
      changeFrequency: route === ROUTES.LANDING ? ("weekly" as const) : ("monthly" as const),
      priority: route === ROUTES.LANDING ? 1 : route.split("/").length <= 3 ? 0.8 : 0.7,
      alternates: { languages },
    }));
  });

  // 블로그 글은 한국어 URL 하나만 올린다. 본문이 한국어 원문뿐이라 영어 경로는 번역본이
  // 아니고, 상세 metadata 도 canonical 을 한국어로 고정한다 — 사이트맵이 그 신고와 어긋나면 안 된다.
  const articlePages = articles.map((article) => ({
    url: absoluteUrl(localizePath("ko", devArticleRoute(article.slug))),
    lastModified: article.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...pages, ...articlePages];
}
