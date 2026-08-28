import { documentCacheTag } from "@/constants/cache";
import { COLLECTIONS, SITE_MUSIC_DOC, tableFor } from "@/constants/collections";
import { EMPTY_MUSIC_CONFIG } from "@/constants/empty-configs";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { isDangerousStoredHref } from "@/lib/security/public-url";
import { toJson } from "@/lib/supabase/admin/row-codec";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  decodeMusicAward,
  decodeMusicConfig,
  decodeMusicMedia,
  decodeMusicWork,
} from "@/lib/supabase/decode/music";
import { sortableListCrud } from "@/lib/supabase/list-crud";
import { deleteMusicWorkImages } from "@/lib/supabase/storage";

import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

const SITE_TABLE = tableFor(COLLECTIONS.SITE);

/**
 * 병합된 행의 날짜 값을 화면 모델의 `Date`로 맞춘다.
 *
 * @param v 변환할 ISO 문자열 또는 `Date` 값.
 * @returns 변환된 날짜. 지원하지 않는 값이면 현재 시각을 반환한다.
 */

/**
 * 연주 행의 누락 필드를 기본값으로 채워 `MusicWork`로 변환한다.
 *
 * @param id 연주 문서 ID.
 * @param d 병합된 연주 문서 필드.
 * @returns 관리자 화면에서 사용하는 연주 모델.
 */

/**
 * 수상 행의 다국어 필드와 기본값을 정규화한다.
 *
 * @param id 수상 문서 ID.
 * @param d 병합된 수상 문서 필드.
 * @returns 관리자 화면에서 사용하는 수상 모델.
 */

/**
 * 영상 행의 다국어 필드와 기본값을 정규화한다.
 *
 * @param id 영상 문서 ID.
 * @param d 병합된 영상 문서 필드.
 * @returns 관리자 화면에서 사용하는 영상 모델.
 */

const musicWorksCrud = sortableListCrud<MusicWork>(
  COLLECTIONS.MUSIC_WORKS,
  decodeMusicWork,
  "연주",
  "musicWork",
);
/**
 * 저장하면 안 되는 예매 링크를 거부한다.
 *
 * 폼을 거치지 않는 경로(이미지 마이그레이션의 전체 문서 저장 등)도 이 경계를 지난다.
 * https 전용 표시 정책은 폼이 보고, 여기서는 실행 가능한 스킴만 막는다.
 *
 * @throws {Error} `javascript:` 처럼 링크로 그릴 때 실행되는 주소일 때.
 */
const assertStorableTicketUrl = (input: MusicWorkInput): void => {
  if (isDangerousStoredHref(input.ticketUrl)) {
    throw new Error("예매 링크에 사용할 수 없는 주소입니다.");
  }
};

/**
 * 예매 링크 검증은 `create`·`update` 에만 얹는다. spread 로 함께 노출되는 `patchData` 는
 * 이미지 파생본 마이그레이션이 포스터만 바꿀 때 쓰므로 링크를 건드리지 않는다.
 */
const musicWorks = {
  ...musicWorksCrud,
  create: async (id: string, input: MusicWorkInput): Promise<void> => {
    assertStorableTicketUrl(input);
    await musicWorksCrud.create(id, input);
  },
  update: async (id: string, input: MusicWorkInput): Promise<void> => {
    assertStorableTicketUrl(input);
    await musicWorksCrud.update(id, input);
  },
  /**
   * 연주 문서를 삭제한 뒤 해당 연주의 Storage 이미지도 정리한다.
   *
   * @param id 삭제할 연주 문서 ID.
   * @returns 문서 삭제와 이미지 정리가 끝나면 완료된다.
   */
  remove: async (id: string): Promise<void> => {
    await musicWorksCrud.remove(id);
    await deleteMusicWorkImages(id).catch(() => undefined);
  },
};
const musicAwards = sortableListCrud<MusicAward>(
  COLLECTIONS.MUSIC_AWARDS,
  decodeMusicAward,
  "수상",
  "musicAward",
);
const musicMediaCrud = sortableListCrud<MusicMedia>(
  COLLECTIONS.MUSIC_MEDIA,
  decodeMusicMedia,
  "영상",
  "musicMedia",
);

/**
 * YouTube 영상 ID 는 11자의 base64url 문자다.
 *
 * 블로그 본문의 `::youtube` 디렉티브(`markdown-directives.ts`)가 같은 형태를 강제한다.
 * 여기만 열어 두면 두 경로의 규칙이 갈리고, 폼을 거치지 않는 재저장이 임의 경로를 심을 수 있다.
 */
const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;

const assertStorableYoutubeId = (input: { youtubeId: string }): void => {
  if (!YOUTUBE_ID_PATTERN.test(input.youtubeId)) {
    throw new Error("YouTube 영상 ID 형식이 올바르지 않습니다.");
  }
};

const musicMedia = {
  ...musicMediaCrud,
  create: async (id: string, input: Omit<MusicMedia, "id">): Promise<void> => {
    assertStorableYoutubeId(input);
    await musicMediaCrud.create(id, input);
  },
  update: async (id: string, input: Omit<MusicMedia, "id">): Promise<void> => {
    assertStorableYoutubeId(input);
    await musicMediaCrud.update(id, input);
  },
};

/**
 * 소개와 경력·학력 타임라인을 담은 음악 설정 문서를 읽는다.
 *
 * @returns 저장된 설정. 문서가 없으면 빈 설정을 반환한다.
 */
const getMusicConfigAdmin = async (): Promise<MusicConfig> => {
  const { data, error } = await getSupabaseClient()
    .from(SITE_TABLE)
    .select("data")
    .eq("id", SITE_MUSIC_DOC)
    .maybeSingle();
  if (error) throw new Error("음악 설정을 불러오지 못했습니다.");
  if (!data) return EMPTY_MUSIC_CONFIG;
  return decodeMusicConfig((data.data as Record<string, unknown> | null) ?? {});
};

/**
 * 음악 설정 문서 전체를 저장하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param config 저장할 소개, 경력, 학력 설정.
 * @returns 저장과 RAG 동기화가 끝나면 완료된다.
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
