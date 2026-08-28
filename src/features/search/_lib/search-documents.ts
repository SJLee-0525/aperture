import { devArticleRoute, ROUTES } from "@/constants/routes";
import { choseongOf } from "@/lib/text/choseong";
import { normalizeForSearch } from "@/lib/text/korean-tokenize";

import { imageThumbnailUrl } from "@/types/image";

import type { ArticleSearchSource } from "@/features/dev-blog/_lib/article-search-source";
import type { Album } from "@/types/album";
import type { DevProject } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";
import type { MusicAward, MusicMedia, MusicWork } from "@/types/music";
import type { Photo } from "@/types/photo";
import type { SearchDocument, SearchIndex } from "@/types/search";

type SearchSources = {
  photos: Photo[];
  albums: Album[];
  works: MusicWork[];
  awards: MusicAward[];
  media: MusicMedia[];
  projects: DevProject[];
  articles: ArticleSearchSource[];
};

const indexText = (localized: LocalizedText[], common: string[] = []): string =>
  normalizeForSearch([...localized.flatMap((text) => [text.ko, text.en]), ...common].join(" "));

// 문서 측 정규화(NFKC·조사 스트립·불용어·별칭)를 ISR 재생성 시점에 끝내둔다 —
// 클라이언트는 대조만 하고, 제목/본문 분리가 랭킹(score-documents)의 가중 신호가 된다.
// 초성은 ko 원문에서만 뽑는다(en·라틴은 getChoseong이 걸러냄) — es-hangul은 서버 청크에만 실린다.
const searchIndexFor = (
  title: LocalizedText,
  body: LocalizedText[],
  common: string[] = [],
): SearchIndex => ({
  title: indexText([title]),
  body: indexText(body, common),
  choseong: choseongOf([title.ko, ...body.map((text) => text.ko), ...common].join(" ")),
});

/**
 * 공개 도메인 객체를 Client Module에 필요한 최소 검색 문서로 투영한다.
 */
const createSearchDocuments = ({
  photos,
  albums,
  works,
  awards,
  media,
  projects,
  articles,
}: SearchSources): SearchDocument[] => {
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const albumImageUrl = (album: Album): string => {
    for (const photoId of [album.coverPhotoId, ...album.photoIds]) {
      if (!album.photoIds.includes(photoId)) continue;
      const imageUrl = imageThumbnailUrl(photoById.get(photoId)?.image);
      if (imageUrl) return imageUrl;
    }
    return "";
  };

  return [
    ...photos.map((photo) => ({
      key: `photo-${photo.id}`,
      section: "photo" as const,
      title: photo.title,
      index: searchIndexFor(photo.title, [photo.place], [photo.camera, photo.lens]),
      meta: photo.place,
      imageUrl: imageThumbnailUrl(photo.image),
      href: `${ROUTES.PHOTO}?photo=${photo.id}`,
    })),
    ...albums.map((album) => ({
      key: `album-${album.id}`,
      section: "photo" as const,
      title: album.title,
      index: searchIndexFor(album.title, [album.subtitle]),
      metaLabel: "albums" as const,
      imageUrl: albumImageUrl(album),
      href: `${ROUTES.PHOTO_ALBUMS}/${album.id}`,
    })),
    ...works.map((work) => ({
      key: `work-${work.id}`,
      section: "music" as const,
      title: work.title,
      index: searchIndexFor(work.title, [work.subtitle, work.venue, work.category], work.program),
      meta: work.subtitle,
      imageUrl: imageThumbnailUrl(work.poster),
      href: `${ROUTES.MUSIC}?work=${work.id}`,
    })),
    ...awards.map((award) => ({
      key: `award-${award.id}`,
      section: "music" as const,
      title: award.name,
      // 설명까지 색인한다 — 이름이 한글뿐이면 "award" 같은 영어 질의가 닿지 못한다.
      // 개발 프로젝트는 achievements 가 색인돼 한·영 모두 걸리는데 수상만 비대칭이었다.
      index: searchIndexFor(award.name, [award.description], [award.place]),
      meta: { ko: String(award.year), en: String(award.year) },
      href: `${ROUTES.MUSIC_CAREER}?award=${award.id}`,
    })),
    ...media.map((item) => ({
      key: `media-${item.id}`,
      section: "music" as const,
      title: item.title,
      index: searchIndexFor(item.title, [item.source]),
      meta: item.source,
      imageUrl: item.youtubeId ? `https://i.ytimg.com/vi/${item.youtubeId}/mqdefault.jpg` : "",
      href: ROUTES.MUSIC_MEDIA,
    })),
    ...projects.map((project) => ({
      key: `proj-${project.id}`,
      section: "dev" as const,
      title: project.title,
      // achievements(성과·수상)까지 색인한다: 빠뜨리면 "수상" 같은 질의가 프로젝트에 닿지 못한다.
      index: searchIndexFor(
        project.title,
        [project.category, project.summary, ...project.achievements],
        project.techTags,
      ),
      meta: project.category,
      imageUrl: imageThumbnailUrl(project.cover),
      href: `${ROUTES.DEV_PROJECTS}?project=${project.id}`,
    })),
    ...articles.map((article) => ({
      key: `article-${article.id}`,
      section: "dev" as const,
      subsection: "blog" as const,
      title: article.title,
      // 태그 라벨과 본문 소제목까지 색인한다: 제목·요약만으로는 어떤 주제를 다뤘는지 묻는 질의가 닿지 않는다.
      // 둘을 같은 자리에 두어 가중치가 같아지는 것은 SearchIndex 를 늘리지 않으려는 선택이다.
      index: searchIndexFor(
        article.title,
        [article.summary],
        [...article.tagLabels, ...article.headings],
      ),
      // 행 오른쪽에는 요약 대신 태그를 둔다. 제목 옆에서 한 줄로 잘리는 자리라
      // 문장보다 분류가 더 읽힌다.
      meta: article.tagText,
      imageUrl: imageThumbnailUrl(article.cover),
      href: devArticleRoute(article.slug),
    })),
  ];
};

export { createSearchDocuments };
