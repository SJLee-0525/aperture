import { ROUTES } from "@/constants/routes";
import type { Album } from "@/types/album";
import type { DevProject } from "@/types/dev";
import { imageThumbnailUrl } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { MusicAward, MusicMedia, MusicWork } from "@/types/music";
import type { Photo } from "@/types/photo";

type SearchSection = "photo" | "music" | "dev";

type SearchDocument = {
  key: string;
  section: SearchSection;
  title: LocalizedText;
  text: LocalizedText;
  meta?: LocalizedText;
  metaLabel?: "albums";
  imageUrl?: string;
  href: string;
};

type SearchSources = {
  photos: Photo[];
  albums: Album[];
  works: MusicWork[];
  awards: MusicAward[];
  media: MusicMedia[];
  projects: DevProject[];
};

const joinSearchText = (localized: LocalizedText[], common: string[] = []): LocalizedText => ({
  ko: [...localized.map((text) => text.ko), ...common].join(" "),
  en: [...localized.map((text) => text.en), ...common].join(" "),
});

/** 공개 도메인 객체를 Client Module에 필요한 최소 검색 문서로 투영한다. */
const createSearchDocuments = ({
  photos,
  albums,
  works,
  awards,
  media,
  projects,
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
      text: joinSearchText([photo.title, photo.place], [photo.camera, photo.lens]),
      meta: photo.place,
      imageUrl: imageThumbnailUrl(photo.image),
      href: `${ROUTES.PHOTO}?photo=${photo.id}`,
    })),
    ...albums.map((album) => ({
      key: `album-${album.id}`,
      section: "photo" as const,
      title: album.title,
      text: joinSearchText([album.title, album.subtitle]),
      metaLabel: "albums" as const,
      imageUrl: albumImageUrl(album),
      href: `${ROUTES.PHOTO_ALBUMS}/${album.id}`,
    })),
    ...works.map((work) => ({
      key: `work-${work.id}`,
      section: "music" as const,
      title: work.title,
      text: joinSearchText([work.title, work.subtitle, work.venue, work.category], work.program),
      meta: work.subtitle,
      imageUrl: imageThumbnailUrl(work.poster),
      href: `${ROUTES.MUSIC}?work=${work.id}`,
    })),
    ...awards.map((award) => ({
      key: `award-${award.id}`,
      section: "music" as const,
      title: award.name,
      text: joinSearchText([award.name], [award.place]),
      meta: { ko: String(award.year), en: String(award.year) },
      href: `${ROUTES.MUSIC_CAREER}?award=${award.id}`,
    })),
    ...media.map((item) => ({
      key: `media-${item.id}`,
      section: "music" as const,
      title: item.title,
      text: joinSearchText([item.title, item.source]),
      meta: item.source,
      imageUrl: item.youtubeId ? `https://i.ytimg.com/vi/${item.youtubeId}/mqdefault.jpg` : "",
      href: ROUTES.MUSIC_MEDIA,
    })),
    ...projects.map((project) => ({
      key: `proj-${project.id}`,
      section: "dev" as const,
      title: project.title,
      text: joinSearchText([project.title, project.category, project.summary], project.techTags),
      meta: project.category,
      imageUrl: imageThumbnailUrl(project.cover),
      href: `${ROUTES.DEV_PROJECTS}?project=${project.id}`,
    })),
  ];
};

export { createSearchDocuments };
export type { SearchDocument, SearchSection };
