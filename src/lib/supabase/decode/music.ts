import {
  readBoolean,
  readDate,
  readImage,
  readNumber,
  readString,
  readStringArray,
  readText,
  readTimeline,
} from "@/lib/supabase/decode/field";

import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

/**
 * 병합된 연주 행을 도메인 모델로 바꾼다.
 *
 * `ticketUrl` 은 저장된 원문 그대로 둔다. 읽기에서 정화하면 폼이 그 빈 값을 저장하고
 * 전체 문서를 되쓰는 경로도 원본을 지운다. 공개 표시용 정화는 `decode/public-sanitize` 가 한다.
 *
 * @param {string} id 연주 문서 ID.
 * @param {Record<string, unknown>} data 병합된 연주 문서 필드.
 * @returns {MusicWork}
 */
const decodeMusicWork = (id: string, data: Record<string, unknown>): MusicWork => ({
  id,
  title: readText(data.title),
  subtitle: readText(data.subtitle),
  performedAt: readDate(data.performedAt),
  time: readString(data.time),
  venue: readText(data.venue),
  category: readText(data.category),
  program: readStringArray(data.program),
  description: readText(data.description),
  poster: readImage(data.poster),
  ticketUrl: readString(data.ticketUrl),
  order: readNumber(data.order),
  published: readBoolean(data.published),
});

/**
 * @param {string} id 수상 문서 ID.
 * @param {Record<string, unknown>} data 병합된 수상 문서 필드.
 * @returns {MusicAward}
 */
const decodeMusicAward = (id: string, data: Record<string, unknown>): MusicAward => ({
  id,
  year: readNumber(data.year),
  name: readText(data.name),
  place: readString(data.place),
  description: readText(data.description),
  order: readNumber(data.order),
  published: readBoolean(data.published),
});

/**
 * @param {string} id 영상 문서 ID.
 * @param {Record<string, unknown>} data 병합된 영상 문서 필드.
 * @returns {MusicMedia}
 */
const decodeMusicMedia = (id: string, data: Record<string, unknown>): MusicMedia => ({
  id,
  title: readText(data.title),
  source: readText(data.source),
  youtubeId: readString(data.youtubeId),
  order: readNumber(data.order),
  published: readBoolean(data.published),
});

/**
 * @param {Record<string, unknown>} data 병합된 음악 설정 필드.
 * @returns {MusicConfig}
 */
const decodeMusicConfig = (data: Record<string, unknown>): MusicConfig => ({
  intro: readText(data.intro),
  career: readTimeline(data.career),
  education: readTimeline(data.education),
});

export { decodeMusicAward, decodeMusicConfig, decodeMusicMedia, decodeMusicWork };
