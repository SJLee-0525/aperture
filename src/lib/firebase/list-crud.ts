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
import { getFirebaseDb } from "@/lib/firebase/client";
import type { RagSyncSourceType } from "@/types/rag";

type WithId = { id: string };

/**
 * 리스트 컬렉션 공통 관리자 CRUD 팩토리 — 컬렉션명·매퍼·라벨만 다르다.
 * albums.ts 의 개별 함수 패턴을 컬렉션마다 반복하지 않고 한 곳으로 압축(음악 works/awards/media·개발 projects 공용).
 * 목록은 초안 포함 전체를 order 순으로 반환(관리자 전용, Rules 의 isAdmin 로 허용).
 *
 * @param {string} name 대상 Firestore 컬렉션 이름.
 * @param {(id: string, d: DocumentData) => T} toEntity 문서 ID와 필드를 도메인 모델로 바꾸는 함수.
 * @param {string} label 오류 메시지에 표시할 항목 이름.
 * @param {RagSyncSourceType} [ragSourceType] 변경 후 동기화할 RAG 소스 종류.
 * @returns {{ newId: () => string; list: () => Promise<T[]>; get: (id: string) => Promise<T | null>; create: (id: string, input: Omit<T, 'id'>) => Promise<void>; update: (id: string, input: Omit<T, 'id'>) => Promise<void>; updateOrder: (id: string, order: number) => Promise<void>; setPublished: (id: string, published: boolean) => Promise<void>; remove: (id: string) => Promise<void> }} 해당 컬렉션에 묶인 관리자 CRUD 함수.
 */
const listCrud = <T extends WithId>(
  name: string,
  toEntity: (id: string, d: DocumentData) => T,
  label: string,
  ragSourceType?: RagSyncSourceType,
) => {
  type Input = Omit<T, "id">;
  /** @returns {ReturnType<typeof collection>} 현재 CRUD가 사용하는 컬렉션 참조. */
  const col = () => collection(getFirebaseDb(), name);
  const cacheTag = firestoreCollectionCacheTag(name);
  return {
    /** 새 문서 ID를 미리 발급한다. Storage 경로를 먼저 정할 때 사용한다. */
    newId: (): string => doc(col()).id,
    /** 초안을 포함한 전체 관리자 목록을 `order` 순으로 읽는다. */
    list: async (): Promise<T[]> => {
      try {
        const snap = await getDocs(query(col(), orderBy("order")));
        return snap.docs.map((d) => toEntity(d.id, d.data()));
      } catch {
        throw new Error(`${label} 목록을 불러오지 못했습니다.`);
      }
    },
    /**
     * 관리자 편집용 문서 한 건을 읽는다.
     *
     * @param {string} id 조회할 문서 ID.
     * @returns {Promise<T | null>} 변환된 모델. 문서가 없으면 `null`이다.
     */
    get: async (id: string): Promise<T | null> => {
      try {
        const snap = await getDoc(doc(getFirebaseDb(), name, id));
        return snap.exists() ? toEntity(snap.id, snap.data()) : null;
      } catch {
        throw new Error(`${label}을(를) 불러오지 못했습니다.`);
      }
    },
    /**
     * 미리 발급한 ID로 문서를 생성한다.
     *
     * @param {string} id 새 문서에 사용할 ID.
     * @param {Input} input 문서 ID를 제외한 저장 필드.
     * @returns {Promise<void>} 저장과 후속 갱신이 끝나면 완료된다.
     */
    create: async (id: string, input: Input): Promise<void> => {
      try {
        await setDoc(doc(getFirebaseDb(), name, id), {
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
    /**
     * 기존 문서의 도메인 필드를 수정한다.
     *
     * @param {string} id 수정할 문서 ID.
     * @param {Input} input 교체할 도메인 필드.
     * @returns {Promise<void>} 수정과 후속 갱신이 끝나면 완료된다.
     */
    update: async (id: string, input: Input): Promise<void> => {
      try {
        await updateDoc(doc(getFirebaseDb(), name, id), { ...input, updatedAt: serverTimestamp() });
      } catch {
        throw new Error(`${label} 수정에 실패했습니다.`);
      }
      requestPublicRevalidate(cacheTag);
      if (ragSourceType) await requestRagSync(ragSourceType, id);
    },
    /** 드래그 정렬 결과에 맞춰 `order` 필드만 갱신한다. */
    updateOrder: async (id: string, order: number): Promise<void> => {
      try {
        await updateDoc(doc(getFirebaseDb(), name, id), { order, updatedAt: serverTimestamp() });
      } catch {
        throw new Error("순서 저장에 실패했습니다.");
      }
      requestPublicRevalidate(cacheTag);
    },
    /**
     * 문서의 공개 상태를 변경한다.
     *
     * @param {string} id 상태를 바꿀 문서 ID.
     * @param {boolean} published 공개 여부.
     * @returns {Promise<void>} 상태 저장과 후속 갱신이 끝나면 완료된다.
     */
    setPublished: async (id: string, published: boolean): Promise<void> => {
      try {
        await updateDoc(doc(getFirebaseDb(), name, id), {
          published,
          updatedAt: serverTimestamp(),
        });
      } catch {
        throw new Error("공개 상태 변경에 실패했습니다.");
      }
      requestPublicRevalidate(cacheTag);
      if (ragSourceType) await requestRagSync(ragSourceType, id);
    },
    /**
     * 문서를 삭제하고 공개 캐시와 RAG 문서를 갱신한다.
     *
     * @param {string} id 삭제할 문서 ID.
     * @returns {Promise<void>} 삭제와 후속 갱신이 끝나면 완료된다.
     */
    remove: async (id: string): Promise<void> => {
      try {
        await deleteDoc(doc(getFirebaseDb(), name, id));
      } catch {
        throw new Error(`${label} 삭제에 실패했습니다.`);
      }
      requestPublicRevalidate(cacheTag);
      if (ragSourceType) await requestRagSync(ragSourceType, id);
    },
  };
};

export { listCrud };
