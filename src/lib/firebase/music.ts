import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import { COLLECTIONS, SITE_MUSIC_DOC } from "@/constants/collections";
import { db } from "@/lib/firebase/client";
import type { LocalizedText } from "@/types/localized";
import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

/**
 * 리스트 컬렉션(works·awards·media) 공통 CRUD — 컬렉션명·매퍼·라벨만 다르다.
 * albums.ts 의 개별 함수 패턴을 3컬렉션 반복 없이 팩토리로 압축(SRP: 파일 한 곳이 음악 write 책임).
 */
type WithId = { id: string };
const listCrud = <T extends WithId>(
  name: string,
  toEntity: (id: string, d: DocumentData) => T,
  label: string,
) => {
  type Input = Omit<T, "id">;
  const col = () => collection(db, name);
  return {
    /** 새 문서 ID 선발급 (Storage 경로 확정용). */
    newId: (): string => doc(col()).id,
    /** 관리자 목록 — 초안 포함 전체, order 순. */
    list: async (): Promise<T[]> => {
      try {
        const snap = await getDocs(query(col(), orderBy("order")));
        return snap.docs.map((d) => toEntity(d.id, d.data()));
      } catch {
        throw new Error(`${label} 목록을 불러오지 못했습니다.`);
      }
    },
    get: async (id: string): Promise<T | null> => {
      try {
        const snap = await getDoc(doc(db, name, id));
        return snap.exists() ? toEntity(snap.id, snap.data()) : null;
      } catch {
        throw new Error(`${label}을(를) 불러오지 못했습니다.`);
      }
    },
    create: async (id: string, input: Input): Promise<void> => {
      try {
        await setDoc(doc(db, name, id), {
          ...input,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        throw new Error(`${label} 저장에 실패했습니다.`);
      }
    },
    update: async (id: string, input: Input): Promise<void> => {
      try {
        await updateDoc(doc(db, name, id), { ...input, updatedAt: serverTimestamp() });
      } catch {
        throw new Error(`${label} 수정에 실패했습니다.`);
      }
    },
    /** 순서만 갱신 (dnd 정렬). */
    updateOrder: async (id: string, order: number): Promise<void> => {
      try {
        await updateDoc(doc(db, name, id), { order, updatedAt: serverTimestamp() });
      } catch {
        throw new Error("순서 저장에 실패했습니다.");
      }
    },
    setPublished: async (id: string, published: boolean): Promise<void> => {
      try {
        await updateDoc(doc(db, name, id), { published, updatedAt: serverTimestamp() });
      } catch {
        throw new Error("공개 상태 변경에 실패했습니다.");
      }
    },
    remove: async (id: string): Promise<void> => {
      try {
        await deleteDoc(doc(db, name, id));
      } catch {
        throw new Error(`${label} 삭제에 실패했습니다.`);
      }
    },
  };
};

const asDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date();
const asText = (v: unknown): LocalizedText => (v as LocalizedText) ?? { ko: "", en: "" };

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

const musicWorks = listCrud<MusicWork>(COLLECTIONS.MUSIC_WORKS, toMusicWork, "연주");
const musicAwards = listCrud<MusicAward>(COLLECTIONS.MUSIC_AWARDS, toMusicAward, "수상");
const musicMedia = listCrud<MusicMedia>(COLLECTIONS.MUSIC_MEDIA, toMusicMedia, "영상");

/**
 * site/music 설정(소개 intro + 경력·학력 타임라인) 읽기/저장 — 단일 문서.
 * site.ts 와 동일하게 "전체 로드 → 편집 → 전체 저장" 흐름이라 필드 유실이 없다.
 */
const getMusicConfigAdmin = async (): Promise<MusicConfig> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SITE, SITE_MUSIC_DOC));
    if (!snap.exists()) return { intro: { ko: "", en: "" }, career: [], education: [] };
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
};

type MusicWorkInput = Omit<MusicWork, "id">;
type MusicAwardInput = Omit<MusicAward, "id">;
type MusicMediaInput = Omit<MusicMedia, "id">;

export { getMusicConfigAdmin, musicAwards, musicMedia, musicWorks, updateMusicConfig };
export type { MusicAwardInput, MusicMediaInput, MusicWorkInput };
