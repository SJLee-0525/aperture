import { COLLECTIONS, SITE_MUSIC_DOC } from "@/constants/collections";
import {
  fetchDocument,
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  runQuery,
  toDate,
} from "@/lib/firebase/public/transport";
import { asText } from "@/lib/i18n/as-text";
import { normalizePublicHref } from "@/lib/security/public-url";

import type { ImageMeta } from "@/types/image";
import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";
import type { TimelineEntry } from "@/types/timeline";

type ChatMusicWork = Pick<
  MusicWork,
  "id" | "title" | "performedAt" | "venue" | "program" | "poster" | "order" | "published"
>;
type ChatMusicAward = Pick<MusicAward, "id" | "year" | "name" | "place" | "order" | "published">;
type ChatMusicMedia = Pick<MusicMedia, "id" | "title" | "source" | "order" | "published">;

const EMPTY_IMAGE: ImageMeta = { url: "", path: "", w: 0, h: 0 };

/**
 * REST API로 읽은 연주 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id Firestore 연주 문서 ID.
 * @param {Record<string, unknown>} data 디코딩된 연주 문서 필드.
 * @returns {MusicWork} 기본값과 다국어 필드가 정규화된 연주 모델.
 */
const toMusicWork = (id: string, data: Record<string, unknown>): MusicWork => ({
  id,
  title: asText(data.title),
  subtitle: asText(data.subtitle),
  performedAt: toDate(data.performedAt),
  time: (data.time as string) ?? "",
  venue: asText(data.venue),
  category: asText(data.category),
  program: (data.program as string[]) ?? [],
  description: asText(data.description),
  poster: (data.poster as ImageMeta) ?? EMPTY_IMAGE,
  ticketUrl: normalizePublicHref(data.ticketUrl),
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

/**
 * REST API로 읽은 수상 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id Firestore 수상 문서 ID.
 * @param {Record<string, unknown>} data 디코딩된 수상 문서 필드.
 * @returns {MusicAward} 기본값과 다국어 필드가 정규화된 수상 모델.
 */
const toMusicAward = (id: string, data: Record<string, unknown>): MusicAward => ({
  id,
  year: (data.year as number) ?? 0,
  name: asText(data.name),
  place: (data.place as string) ?? "",
  description: asText(data.description),
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

/**
 * REST API로 읽은 영상 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id Firestore 영상 문서 ID.
 * @param {Record<string, unknown>} data 디코딩된 영상 문서 필드.
 * @returns {MusicMedia} 기본값과 다국어 필드가 정규화된 영상 모델.
 */
const toMusicMedia = (id: string, data: Record<string, unknown>): MusicMedia => ({
  id,
  title: asText(data.title),
  source: asText(data.source),
  youtubeId: (data.youtubeId as string) ?? "",
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

/**
 * REST API로 읽은 음악 설정 필드를 공개 페이지 모델로 변환한다.
 *
 * @param {Record<string, unknown>} data 디코딩된 음악 설정 필드.
 * @returns {MusicConfig} 소개와 경력·학력 목록이 정규화된 설정.
 */
const toMusicConfig = (data: Record<string, unknown>): MusicConfig => ({
  intro: asText(data.intro),
  career: (data.career as TimelineEntry[]) ?? [],
  education: (data.education as TimelineEntry[]) ?? [],
});

/**
 * 공개된 연주 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<MusicWork[]>} 공개된 연주 목록.
 */
const fetchPublishedMusicWorks = async (options?: { fresh?: boolean }): Promise<MusicWork[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.MUSIC_WORKS), options)).map(({ id, data }) =>
    toMusicWork(id, data),
  );
/**
 * 공개된 수상 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<MusicAward[]>} 공개된 수상 목록.
 */
const fetchPublishedMusicAwards = async (options?: { fresh?: boolean }): Promise<MusicAward[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.MUSIC_AWARDS), options)).map(({ id, data }) =>
    toMusicAward(id, data),
  );
/**
 * 공개된 영상 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<MusicMedia[]>} 공개된 영상 목록.
 */
const fetchPublishedMusicMedia = async (options?: { fresh?: boolean }): Promise<MusicMedia[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.MUSIC_MEDIA), options)).map(({ id, data }) =>
    toMusicMedia(id, data),
  );

/**
 * 공개 페이지에서 사용할 음악 설정 문서를 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<MusicConfig | null>} 음악 설정. 문서가 없으면 `null`이다.
 */
const fetchMusicConfig = async (options?: { fresh?: boolean }): Promise<MusicConfig | null> => {
  const data = await fetchDocument(COLLECTIONS.SITE, SITE_MUSIC_DOC, "music config", options);
  return data ? toMusicConfig(data) : null;
};

/**
 * 채팅 검색에 필요한 필드만 선택해 공개 문서를 조회한다.
 *
 * @param {string} collection 조회할 Firestore 컬렉션 이름.
 * @param {string[]} fields 응답에 포함할 필드 경로.
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<Array<{ id: string; data: Record<string, unknown> }>>} 문서 ID와 디코딩된 필드 목록.
 */
const chatQuery = (collection: string, fields: string[], options?: { fresh?: boolean }) =>
  runQuery(projectedPublishedOrderedQuery(collection, fields), options);

/**
 * 채팅 검색에 필요한 공개 연주 필드만 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<ChatMusicWork[]>} 채팅용 연주 목록.
 */
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
/**
 * 채팅 검색에 필요한 공개 수상 필드만 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<ChatMusicAward[]>} 채팅용 수상 목록.
 */
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
/**
 * 채팅 검색에 필요한 공개 영상 필드만 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<ChatMusicMedia[]>} 채팅용 영상 목록.
 */
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
  toMusicAward,
  toMusicConfig,
  toMusicMedia,
  toMusicWork,
};
export type { ChatMusicAward, ChatMusicMedia, ChatMusicWork };
