import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";

import { COLLECTIONS, SITE_MUSIC_DOC } from "@/constants/collections";
import { firestoreDocumentCacheTag } from "@/constants/cache";
import { EMPTY_MUSIC_CONFIG } from "@/constants/empty-configs";

import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { getFirebaseDb } from "@/lib/firebase/client";
import { listCrud } from "@/lib/firebase/list-crud";
import { deleteMusicWorkImages } from "@/lib/firebase/storage";
import { asText } from "@/lib/i18n/as-text";

import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

/**
 * Firestore에서 읽은 날짜 값을 화면 모델의 `Date`로 맞춘다.
 *
 * @param {unknown} v 변환할 Firestore `Timestamp` 또는 `Date` 값.
 * @returns {Date} 변환된 날짜. 지원하지 않는 값이면 현재 시각을 반환한다.
 */
const asDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date();

/**
 * 연주 문서의 누락 필드를 기본값으로 채워 `MusicWork`로 변환한다.
 *
 * @param {string} id Firestore 연주 문서 ID.
 * @param {DocumentData} d Firestore에서 읽은 연주 문서 필드.
 * @returns {MusicWork} 관리자 화면에서 사용하는 연주 모델.
 */
const toMusicWork = (id: string, d: DocumentData): MusicWork => ({
  id,
  title: asText(d.title),
  subtitle: asText(d.subtitle),
  performedAt: asDate(d.performedAt),
  time: d.time ?? "",
  venue: asText(d.venue),
  category: asText(d.category),
  program: d.program ?? [],
  description: asText(d.description),
  poster: d.poster ?? { url: "", path: "", w: 0, h: 0 },
  ticketUrl: d.ticketUrl ?? "",
  order: d.order ?? 0,
  published: d.published ?? false,
});

/**
 * 수상 문서의 다국어 필드와 기본값을 정규화한다.
 *
 * @param {string} id Firestore 수상 문서 ID.
 * @param {DocumentData} d Firestore에서 읽은 수상 문서 필드.
 * @returns {MusicAward} 관리자 화면에서 사용하는 수상 모델.
 */
const toMusicAward = (id: string, d: DocumentData): MusicAward => ({
  id,
  year: d.year ?? 0,
  name: asText(d.name),
  place: d.place ?? "",
  description: asText(d.description),
  order: d.order ?? 0,
  published: d.published ?? false,
});

/**
 * 영상 문서의 다국어 필드와 기본값을 정규화한다.
 *
 * @param {string} id Firestore 영상 문서 ID.
 * @param {DocumentData} d Firestore에서 읽은 영상 문서 필드.
 * @returns {MusicMedia} 관리자 화면에서 사용하는 영상 모델.
 */
const toMusicMedia = (id: string, d: DocumentData): MusicMedia => ({
  id,
  title: asText(d.title),
  source: asText(d.source),
  youtubeId: d.youtubeId ?? "",
  order: d.order ?? 0,
  published: d.published ?? false,
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
  try {
    const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.SITE, SITE_MUSIC_DOC));
    if (!snap.exists()) return EMPTY_MUSIC_CONFIG;
    const d = snap.data();
    return { intro: asText(d.intro), career: d.career ?? [], education: d.education ?? [] };
  } catch {
    throw new Error("음악 설정을 불러오지 못했습니다.");
  }
};

/**
 * 음악 설정 문서 전체를 저장하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {MusicConfig} config 저장할 소개, 경력, 학력 설정.
 * @returns {Promise<void>} 저장과 RAG 동기화가 끝나면 완료된다.
 */
const updateMusicConfig = async (config: MusicConfig): Promise<void> => {
  try {
    await setDoc(doc(getFirebaseDb(), COLLECTIONS.SITE, SITE_MUSIC_DOC), {
      ...config,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("음악 설정 저장에 실패했습니다.");
  }
  requestPublicRevalidate(firestoreDocumentCacheTag(COLLECTIONS.SITE, SITE_MUSIC_DOC));
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
