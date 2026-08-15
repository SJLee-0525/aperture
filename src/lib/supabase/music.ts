import { documentCacheTag } from "@/constants/cache";
import { COLLECTIONS, SITE_MUSIC_DOC, SUPABASE_COLLECTIONS } from "@/constants/collections";
import { EMPTY_MUSIC_CONFIG } from "@/constants/empty-configs";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { deleteMusicWorkImages } from "@/lib/firebase/storage";
import { asText } from "@/lib/i18n/as-text";
import { toJson } from "@/lib/supabase/admin/row-codec";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listCrud } from "@/lib/supabase/list-crud";

import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

const SITE_TABLE = SUPABASE_COLLECTIONS[COLLECTIONS.SITE]?.table ?? "site_documents";

/**
 * 병합된 행의 날짜 값을 화면 모델의 `Date`로 맞춘다.
 *
 * @param {unknown} v 변환할 ISO 문자열 또는 `Date` 값.
 * @returns {Date} 변환된 날짜. 지원하지 않는 값이면 현재 시각을 반환한다.
 */
const asDate = (v: unknown): Date => {
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return v instanceof Date ? v : new Date();
};

/**
 * 연주 행의 누락 필드를 기본값으로 채워 `MusicWork`로 변환한다.
 *
 * @param {string} id 연주 문서 ID.
 * @param {Record<string, unknown>} d 병합된 연주 문서 필드.
 * @returns {MusicWork} 관리자 화면에서 사용하는 연주 모델.
 */
const toMusicWork = (id: string, d: Record<string, unknown>): MusicWork => ({
  id,
  title: asText(d.title),
  subtitle: asText(d.subtitle),
  performedAt: asDate(d.performedAt),
  time: (d.time as string) ?? "",
  venue: asText(d.venue),
  category: asText(d.category),
  program: (d.program as string[]) ?? [],
  description: asText(d.description),
  poster: (d.poster as MusicWork["poster"]) ?? { url: "", path: "", w: 0, h: 0 },
  ticketUrl: (d.ticketUrl as string) ?? "",
  order: (d.order as number) ?? 0,
  published: (d.published as boolean) ?? false,
});

/**
 * 수상 행의 다국어 필드와 기본값을 정규화한다.
 *
 * @param {string} id 수상 문서 ID.
 * @param {Record<string, unknown>} d 병합된 수상 문서 필드.
 * @returns {MusicAward} 관리자 화면에서 사용하는 수상 모델.
 */
const toMusicAward = (id: string, d: Record<string, unknown>): MusicAward => ({
  id,
  year: (d.year as number) ?? 0,
  name: asText(d.name),
  place: (d.place as string) ?? "",
  description: asText(d.description),
  order: (d.order as number) ?? 0,
  published: (d.published as boolean) ?? false,
});

/**
 * 영상 행의 다국어 필드와 기본값을 정규화한다.
 *
 * @param {string} id 영상 문서 ID.
 * @param {Record<string, unknown>} d 병합된 영상 문서 필드.
 * @returns {MusicMedia} 관리자 화면에서 사용하는 영상 모델.
 */
const toMusicMedia = (id: string, d: Record<string, unknown>): MusicMedia => ({
  id,
  title: asText(d.title),
  source: asText(d.source),
  youtubeId: (d.youtubeId as string) ?? "",
  order: (d.order as number) ?? 0,
  published: (d.published as boolean) ?? false,
});

const musicWorksCrud = listCrud<MusicWork>(
  COLLECTIONS.MUSIC_WORKS,
  toMusicWork,
  "연주",
  "musicWork",
);
const musicWorks = {
  ...musicWorksCrud,
  /**
   * 연주 문서를 삭제한 뒤 해당 연주의 Storage 이미지도 정리한다.
   *
   * @param {string} id 삭제할 연주 문서 ID.
   * @returns {Promise<void>} 문서 삭제와 이미지 정리가 끝나면 완료된다.
   */
  remove: async (id: string): Promise<void> => {
    await musicWorksCrud.remove(id);
    await deleteMusicWorkImages(id).catch(() => undefined);
  },
};
const musicAwards = listCrud<MusicAward>(
  COLLECTIONS.MUSIC_AWARDS,
  toMusicAward,
  "수상",
  "musicAward",
);
const musicMedia = listCrud<MusicMedia>(
  COLLECTIONS.MUSIC_MEDIA,
  toMusicMedia,
  "영상",
  "musicMedia",
);

/**
 * 소개와 경력·학력 타임라인을 담은 음악 설정 문서를 읽는다.
 *
 * @returns {Promise<MusicConfig>} 저장된 설정. 문서가 없으면 빈 설정을 반환한다.
 */
const getMusicConfigAdmin = async (): Promise<MusicConfig> => {
  const { data, error } = await getSupabaseClient()
    .from(SITE_TABLE)
    .select("data")
    .eq("id", SITE_MUSIC_DOC)
    .maybeSingle();
  if (error) throw new Error("음악 설정을 불러오지 못했습니다.");
  if (!data) return EMPTY_MUSIC_CONFIG;
  const d = (data.data as Record<string, unknown> | null) ?? {};
  return {
    intro: asText(d.intro),
    career: (d.career as MusicConfig["career"]) ?? [],
    education: (d.education as MusicConfig["education"]) ?? [],
  };
};

/**
 * 음악 설정 문서 전체를 저장하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {MusicConfig} config 저장할 소개, 경력, 학력 설정.
 * @returns {Promise<void>} 저장과 RAG 동기화가 끝나면 완료된다.
 */
const updateMusicConfig = async (config: MusicConfig): Promise<void> => {
  const { data, error } = await getSupabaseClient()
    .from(SITE_TABLE)
    .upsert({ id: SITE_MUSIC_DOC, data: toJson(config as unknown as Record<string, unknown>) })
    .select("id");
  if (error || !data?.length) throw new Error("음악 설정 저장에 실패했습니다.");
  requestPublicRevalidate(documentCacheTag(COLLECTIONS.SITE, SITE_MUSIC_DOC));
  await requestRagSync("musicConfig", SITE_MUSIC_DOC);
};

/** 새 연주를 저장할 때 사용하는 문서 ID 제외 입력값. */
type MusicWorkInput = Omit<MusicWork, "id">;
/** 새 수상 내역을 저장할 때 사용하는 문서 ID 제외 입력값. */
type MusicAwardInput = Omit<MusicAward, "id">;
/** 새 영상을 저장할 때 사용하는 문서 ID 제외 입력값. */
type MusicMediaInput = Omit<MusicMedia, "id">;

export { getMusicConfigAdmin, musicAwards, musicMedia, musicWorks, updateMusicConfig };
export type { MusicAwardInput, MusicMediaInput, MusicWorkInput };
