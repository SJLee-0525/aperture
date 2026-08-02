import { COLLECTIONS, SITE_MUSIC_DOC } from "@/constants/collections";
import {
  fetchDocument,
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  runQuery,
  toDate,
} from "@/lib/firebase/public/transport";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";
import type { TimelineEntry } from "@/types/timeline";

type ChatMusicWork = Pick<
  MusicWork,
  "id" | "title" | "performedAt" | "venue" | "program" | "poster" | "order" | "published"
>;
type ChatMusicAward = Pick<MusicAward, "id" | "year" | "name" | "place" | "order" | "published">;
type ChatMusicMedia = Pick<MusicMedia, "id" | "title" | "source" | "order" | "published">;

const EMPTY_LOCALIZED: LocalizedText = { ko: "", en: "" };
const EMPTY_IMAGE: ImageMeta = { url: "", path: "", w: 0, h: 0 };

const toMusicWork = (id: string, data: Record<string, unknown>): MusicWork => ({
  id,
  title: (data.title as LocalizedText) ?? EMPTY_LOCALIZED,
  subtitle: (data.subtitle as LocalizedText) ?? EMPTY_LOCALIZED,
  performedAt: toDate(data.performedAt),
  time: (data.time as string) ?? "",
  venue: (data.venue as LocalizedText) ?? EMPTY_LOCALIZED,
  category: (data.category as LocalizedText) ?? EMPTY_LOCALIZED,
  program: (data.program as string[]) ?? [],
  description: (data.description as LocalizedText) ?? EMPTY_LOCALIZED,
  poster: (data.poster as ImageMeta) ?? EMPTY_IMAGE,
  ticketUrl: (data.ticketUrl as string) ?? "",
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const toMusicAward = (id: string, data: Record<string, unknown>): MusicAward => ({
  id,
  year: (data.year as number) ?? 0,
  name: (data.name as LocalizedText) ?? EMPTY_LOCALIZED,
  place: (data.place as string) ?? "",
  description: (data.description as LocalizedText) ?? EMPTY_LOCALIZED,
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const toMusicMedia = (id: string, data: Record<string, unknown>): MusicMedia => ({
  id,
  title: (data.title as LocalizedText) ?? EMPTY_LOCALIZED,
  source: (data.source as LocalizedText) ?? EMPTY_LOCALIZED,
  youtubeId: (data.youtubeId as string) ?? "",
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const fetchPublishedMusicWorks = async (): Promise<MusicWork[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.MUSIC_WORKS))).map(({ id, data }) =>
    toMusicWork(id, data),
  );
const fetchPublishedMusicAwards = async (): Promise<MusicAward[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.MUSIC_AWARDS))).map(({ id, data }) =>
    toMusicAward(id, data),
  );
const fetchPublishedMusicMedia = async (): Promise<MusicMedia[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.MUSIC_MEDIA))).map(({ id, data }) =>
    toMusicMedia(id, data),
  );

const fetchMusicConfig = async (): Promise<MusicConfig | null> => {
  const data = await fetchDocument(COLLECTIONS.SITE, SITE_MUSIC_DOC, "music config");
  if (!data) return null;
  return {
    intro: (data.intro as LocalizedText) ?? EMPTY_LOCALIZED,
    career: (data.career as TimelineEntry[]) ?? [],
    education: (data.education as TimelineEntry[]) ?? [],
  };
};

const chatQuery = (collection: string, fields: string[], options?: { fresh?: boolean }) =>
  runQuery(projectedPublishedOrderedQuery(collection, fields), options);

const fetchChatMusicWorks = async (options?: { fresh?: boolean }): Promise<ChatMusicWork[]> =>
  (
    await chatQuery(
      COLLECTIONS.MUSIC_WORKS,
      ["title", "performedAt", "venue", "program", "poster", "order", "published"],
      options,
    )
  ).map(({ id, data }) => {
    const work = toMusicWork(id, data);
    return {
      id: work.id,
      title: work.title,
      performedAt: work.performedAt,
      venue: work.venue,
      program: work.program,
      poster: work.poster,
      order: work.order,
      published: work.published,
    };
  });
const fetchChatMusicAwards = async (options?: { fresh?: boolean }): Promise<ChatMusicAward[]> =>
  (
    await chatQuery(
      COLLECTIONS.MUSIC_AWARDS,
      ["year", "name", "place", "order", "published"],
      options,
    )
  ).map(({ id, data }) => {
    const award = toMusicAward(id, data);
    return {
      id: award.id,
      year: award.year,
      name: award.name,
      place: award.place,
      order: award.order,
      published: award.published,
    };
  });
const fetchChatMusicMedia = async (options?: { fresh?: boolean }): Promise<ChatMusicMedia[]> =>
  (
    await chatQuery(COLLECTIONS.MUSIC_MEDIA, ["title", "source", "order", "published"], options)
  ).map(({ id, data }) => {
    const media = toMusicMedia(id, data);
    return {
      id: media.id,
      title: media.title,
      source: media.source,
      order: media.order,
      published: media.published,
    };
  });

export {
  fetchChatMusicAwards,
  fetchChatMusicMedia,
  fetchChatMusicWorks,
  fetchMusicConfig,
  fetchPublishedMusicAwards,
  fetchPublishedMusicMedia,
  fetchPublishedMusicWorks,
};
