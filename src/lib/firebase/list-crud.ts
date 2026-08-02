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
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { firestoreCollectionCacheTag } from "@/constants/cache";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { db } from "@/lib/firebase/client";
import type { RagSyncSourceType } from "@/types/rag";

type WithId = { id: string };

/**
 * 리스트 컬렉션 공통 관리자 CRUD 팩토리 — 컬렉션명·매퍼·라벨만 다르다.
 * albums.ts 의 개별 함수 패턴을 컬렉션마다 반복하지 않고 한 곳으로 압축(음악 works/awards/media·개발 projects 공용).
 * 목록은 초안 포함 전체를 order 순으로 반환(관리자 전용, Rules 의 isAdmin 로 허용).
 */
const listCrud = <T extends WithId>(
  name: string,
  toEntity: (id: string, d: DocumentData) => T,
  label: string,
  ragSourceType?: RagSyncSourceType,
) => {
  type Input = Omit<T, "id">;
  const col = () => collection(db, name);
  const cacheTag = firestoreCollectionCacheTag(name);
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
      requestPublicRevalidate(cacheTag);
      if (ragSourceType) await requestRagSync(ragSourceType, id);
    },
    update: async (id: string, input: Input): Promise<void> => {
      try {
        await updateDoc(doc(db, name, id), { ...input, updatedAt: serverTimestamp() });
      } catch {
        throw new Error(`${label} 수정에 실패했습니다.`);
      }
      requestPublicRevalidate(cacheTag);
      if (ragSourceType) await requestRagSync(ragSourceType, id);
    },
    /** 순서만 갱신 (dnd 정렬). */
    updateOrder: async (id: string, order: number): Promise<void> => {
      try {
        await updateDoc(doc(db, name, id), { order, updatedAt: serverTimestamp() });
      } catch {
        throw new Error("순서 저장에 실패했습니다.");
      }
      requestPublicRevalidate(cacheTag);
    },
    setPublished: async (id: string, published: boolean): Promise<void> => {
      try {
        await updateDoc(doc(db, name, id), { published, updatedAt: serverTimestamp() });
      } catch {
        throw new Error("공개 상태 변경에 실패했습니다.");
      }
      requestPublicRevalidate(cacheTag);
      if (ragSourceType) await requestRagSync(ragSourceType, id);
    },
    remove: async (id: string): Promise<void> => {
      try {
        await deleteDoc(doc(db, name, id));
      } catch {
        throw new Error(`${label} 삭제에 실패했습니다.`);
      }
      requestPublicRevalidate(cacheTag);
      if (ragSourceType) await requestRagSync(ragSourceType, id);
    },
  };
};

export { listCrud };
