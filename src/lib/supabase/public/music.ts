import { COLLECTIONS, SITE_MUSIC_DOC } from "@/constants/collections";
import {
  decodeMusicAward,
  decodeMusicConfig,
  decodeMusicMedia,
  decodeMusicWork,
} from "@/lib/supabase/decode/music";
import { sanitizeMusicWorkForPublic } from "@/lib/supabase/decode/public-sanitize";
import { fetchRow, selectPublished } from "@/lib/supabase/public/transport";

import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

type ChatMusicWork = Pick<
  MusicWork,
  "id" | "title" | "performedAt" | "venue" | "program" | "poster" | "order" | "published"
>;
type ChatMusicAward = Pick<MusicAward, "id" | "year" | "name" | "place" | "order" | "published">;
type ChatMusicMedia = Pick<MusicMedia, "id" | "title" | "source" | "order" | "published">;

/** 공개 연주 모델. 저장된 예매 링크는 여기서만 표시용으로 정화한다. */
const toMusicWork = (id: string, data: Record<string, unknown>): MusicWork =>
  sanitizeMusicWorkForPublic(decodeMusicWork(id, data));

const toMusicAward = decodeMusicAward;
const toMusicMedia = decodeMusicMedia;
const toMusicConfig = decodeMusicConfig;

/**
 * 공개된 연주 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<MusicWork[]>} 공개된 연주 목록.
 */
const fetchPublishedMusicWorks = async (options?: { fresh?: boolean }): Promise<MusicWork[]> =>
  (await selectPublished(COLLECTIONS.MUSIC_WORKS, options)).map(({ id, data }) =>
    toMusicWork(id, data),
  );

/**
 * 공개된 수상 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<MusicAward[]>} 공개된 수상 목록.
 */
const fetchPublishedMusicAwards = async (options?: { fresh?: boolean }): Promise<MusicAward[]> =>
  (await selectPublished(COLLECTIONS.MUSIC_AWARDS, options)).map(({ id, data }) =>
    toMusicAward(id, data),
  );

/**
 * 공개된 영상 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<MusicMedia[]>} 공개된 영상 목록.
 */
const fetchPublishedMusicMedia = async (options?: { fresh?: boolean }): Promise<MusicMedia[]> =>
  (await selectPublished(COLLECTIONS.MUSIC_MEDIA, options)).map(({ id, data }) =>
    toMusicMedia(id, data),
  );

/**
 * 공개 페이지에서 사용할 음악 설정 문서를 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<MusicConfig | null>} 음악 설정. 문서가 없으면 `null`이다.
 */
const fetchMusicConfig = async (options?: { fresh?: boolean }): Promise<MusicConfig | null> => {
  const data = await fetchRow(COLLECTIONS.SITE, SITE_MUSIC_DOC, "music config", options);
  return data ? toMusicConfig(data) : null;
};

/**
 * 채팅 검색용 공개 연주 목록. 행 전체를 받아 도메인 투영만 유지한다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<ChatMusicWork[]>} 채팅용 연주 목록.
 */
const fetchChatMusicWorks = async (options?: { fresh?: boolean }): Promise<ChatMusicWork[]> =>
  (await selectPublished(COLLECTIONS.MUSIC_WORKS, options)).map(({ id, data }) => {
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
 * 채팅 검색용 공개 수상 목록.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<ChatMusicAward[]>} 채팅용 수상 목록.
 */
const fetchChatMusicAwards = async (options?: { fresh?: boolean }): Promise<ChatMusicAward[]> =>
  (await selectPublished(COLLECTIONS.MUSIC_AWARDS, options)).map(({ id, data }) => {
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
 * 채팅 검색용 공개 영상 목록.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<ChatMusicMedia[]>} 채팅용 영상 목록.
 */
const fetchChatMusicMedia = async (options?: { fresh?: boolean }): Promise<ChatMusicMedia[]> =>
  (await selectPublished(COLLECTIONS.MUSIC_MEDIA, options)).map(({ id, data }) => {
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
