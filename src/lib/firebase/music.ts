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
import { db } from "@/lib/firebase/client";
import { listCrud } from "@/lib/firebase/list-crud";
import { deleteMusicWorkImages } from "@/lib/firebase/storage";
import { asText } from "@/lib/i18n/as-text";

import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

const asDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date();

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

const toMusicAward = (id: string, d: DocumentData): MusicAward => ({
  id,
  year: d.year ?? 0,
  name: asText(d.name),
  place: d.place ?? "",
  description: asText(d.description),
  order: d.order ?? 0,
  published: d.published ?? false,
});

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
 * site/music 설정(소개 intro + 경력·학력 타임라인) 읽기/저장 — 단일 문서.
 * site.ts 와 동일하게 "전체 로드 → 편집 → 전체 저장" 흐름이라 필드 유실이 없다.
 */
const getMusicConfigAdmin = async (): Promise<MusicConfig> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SITE, SITE_MUSIC_DOC));
    if (!snap.exists()) return EMPTY_MUSIC_CONFIG;
    const d = snap.data();
    return { intro: asText(d.intro), career: d.career ?? [], education: d.education ?? [] };
  } catch {
    throw new Error("음악 설정을 불러오지 못했습니다.");
  }
};

const updateMusicConfig = async (config: MusicConfig): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.SITE, SITE_MUSIC_DOC), {
      ...config,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("음악 설정 저장에 실패했습니다.");
  }
  requestPublicRevalidate(firestoreDocumentCacheTag(COLLECTIONS.SITE, SITE_MUSIC_DOC));
  await requestRagSync("musicConfig", SITE_MUSIC_DOC);
};

type MusicWorkInput = Omit<MusicWork, "id">;
type MusicAwardInput = Omit<MusicAward, "id">;
type MusicMediaInput = Omit<MusicMedia, "id">;

export { getMusicConfigAdmin, musicAwards, musicMedia, musicWorks, updateMusicConfig };
export type { MusicAwardInput, MusicMediaInput, MusicWorkInput };
