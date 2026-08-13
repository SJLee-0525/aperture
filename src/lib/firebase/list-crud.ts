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
 * 쓰기 후 RAG 동기화 여부를 정하는 정책.
 *
 * 작업 종류(kind)는 받지 않는다 — 정책은 쓰기 전후 문서 상태만으로 판단한다.
 * (도메인 저장소가 `setPublished` 를 `update` 경로로 우회해도 계약이 어긋나지 않는다.)
 * `before` 는 쓰기 직전 스냅샷(생성이면 `null`), `after` 는 쓰기 결과(삭제면 `null`)다.
 *
 * `"remove"` 는 별도 삭제 API 호출이 아니다 — `requestRagSync` 에는 작업 종류 인자가 없고,
 * embeddings route 가 원본을 다시 읽어 비공개·부재 문서의 청크를 비우므로 `"sync"` 와 같은
 * 요청으로 수렴한다. 세 값을 유지하는 이유는 §11 표 계약을 테스트가 그대로 읽게 하기 위해서다.
 */
type PostSyncPolicy<T> = (before: T | null, after: T | null) => "sync" | "remove" | "skip";

/**
 * 리스트 컬렉션 공통 관리자 CRUD 팩토리 — 컬렉션명·매퍼·라벨만 다르다.
 * albums.ts 의 개별 함수 패턴을 컬렉션마다 반복하지 않고 한 곳으로 압축(음악 works/awards/media·개발 projects 공용).
 * 목록은 초안 포함 전체를 order 순으로 반환(관리자 전용, Rules 의 isAdmin 로 허용).
 *
 * @param {string} name 대상 Firestore 컬렉션 이름.
 * @param {(id: string, d: DocumentData) => T} toEntity 문서 ID와 필드를 도메인 모델로 바꾸는 함수.
 * @param {string} label 오류 메시지에 표시할 항목 이름.
 * @param {RagSyncSourceType} [ragSourceType] 변경 후 동기화할 RAG 소스 종류. 없으면 정책과 무관하게 동기화 요청이 없다.
 * @param {PostSyncPolicy<T>} [syncPolicy] 쓰기 전후 상태로 동기화 여부를 정하는 정책. 없으면 지금까지처럼 모든 쓰기가 동기화를 요청하고, 쓰기 직전 스냅샷도 읽지 않는다.
 * @returns {{ newId: () => string; list: () => Promise<T[]>; get: (id: string) => Promise<T | null>; create: (id: string, input: Omit<T, 'id'>) => Promise<void>; update: (id: string, input: Omit<T, 'id'>) => Promise<void>; updateOrder: (id: string, order: number) => Promise<void>; setPublished: (id: string, published: boolean) => Promise<void>; remove: (id: string) => Promise<void> }} 해당 컬렉션에 묶인 관리자 CRUD 함수.
 */
const listCrud = <T extends WithId>(
  name: string,
  toEntity: (id: string, d: DocumentData) => T,
  label: string,
  ragSourceType?: RagSyncSourceType,
  syncPolicy?: PostSyncPolicy<T>,
) => {
  type Input = Omit<T, "id">;
  /** 쓰기 직전 스냅샷과 조회 성공 여부. 실패와 "문서 없음"을 구분해야 fallback 이 성립한다. */
  type BeforeSnapshot = { before: T | null; failed: boolean };
  /** @returns {ReturnType<typeof collection>} 현재 CRUD가 사용하는 컬렉션 참조. */
  const col = () => collection(getFirebaseDb(), name);
  const cacheTag = firestoreCollectionCacheTag(name);
  const consultPolicy = Boolean(ragSourceType && syncPolicy);

  /**
   * 정책 판단용 쓰기 직전 스냅샷. 정책을 쓰지 않으면 읽기 자체를 하지 않는다 —
   * 정책 미주입 컬렉션의 읽기 횟수와 동작이 이 확장 전과 같아야 한다.
   *
   * @param {string} id 스냅샷을 읽을 문서 ID.
   * @returns {Promise<BeforeSnapshot | null>} 정책 미사용이면 `null`. 조회 실패는 `failed` 로 표시하고 쓰기를 막지 않는다.
   */
  const readBeforeWrite = async (id: string): Promise<BeforeSnapshot | null> => {
    if (!consultPolicy) return null;
    try {
      const snap = await getDoc(doc(getFirebaseDb(), name, id));
      return { before: snap.exists() ? toEntity(snap.id, snap.data()) : null, failed: false };
    } catch {
      return { before: null, failed: true };
    }
  };

  /**
   * 쓰기 성공 뒤 RAG 동기화를 요청한다. `ragSourceType` 이 없으면 아무것도 하지 않는다.
   *
   * 스냅샷 조회가 실패한 쓰기는 정책을 묻지 않고 동기화한다(보수적 fallback) —
   * `skip` 오판으로 stale 청크가 남는 쪽보다 불필요한 동기화 한 번이 낫다.
   *
   * @param {string} id 동기화할 문서 ID.
   * @param {BeforeSnapshot | null} snapshot `readBeforeWrite` 결과. 생성은 `{ before: null, failed: false }` 를 직접 만든다.
   * @param {T | null} after 쓰기 결과 문서. 삭제는 `null`.
   * @returns {Promise<void>} 동기화 요청이 끝나면 완료된다.
   */
  const syncAfterWrite = async (
    id: string,
    snapshot: BeforeSnapshot | null,
    after: T | null,
  ): Promise<void> => {
    if (!ragSourceType) return;
    const decision =
      !syncPolicy || !snapshot || snapshot.failed ? "sync" : syncPolicy(snapshot.before, after);
    if (decision === "skip") return;
    await requestRagSync(ragSourceType, id);
  };

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
      // 생성의 "쓰기 직전 상태" 는 정의상 문서 없음 — 스냅샷 조회 없이 만든다.
      await syncAfterWrite(id, { before: null, failed: false }, { id, ...input } as T);
    },
    /**
     * 기존 문서의 도메인 필드를 수정한다.
     *
     * @param {string} id 수정할 문서 ID.
     * @param {Input} input 교체할 도메인 필드.
     * @returns {Promise<void>} 수정과 후속 갱신이 끝나면 완료된다.
     */
    update: async (id: string, input: Input): Promise<void> => {
      const snapshot = await readBeforeWrite(id);
      try {
        await updateDoc(doc(getFirebaseDb(), name, id), { ...input, updatedAt: serverTimestamp() });
      } catch {
        throw new Error(`${label} 수정에 실패했습니다.`);
      }
      requestPublicRevalidate(cacheTag);
      await syncAfterWrite(id, snapshot, { id, ...input } as T);
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
      const snapshot = await readBeforeWrite(id);
      try {
        await updateDoc(doc(getFirebaseDb(), name, id), {
          published,
          updatedAt: serverTimestamp(),
        });
      } catch {
        throw new Error("공개 상태 변경에 실패했습니다.");
      }
      requestPublicRevalidate(cacheTag);
      // 쓰기 결과는 스냅샷에 published 만 얹은 모양이다. 스냅샷이 없으면(정책 미사용·조회 실패)
      // syncAfterWrite 가 정책을 묻지 않으므로 after 는 쓰이지 않는다.
      const after = snapshot?.before ? ({ ...snapshot.before, published } as T) : null;
      await syncAfterWrite(id, snapshot, after);
    },
    /**
     * 문서를 삭제하고 공개 캐시와 RAG 문서를 갱신한다.
     *
     * @param {string} id 삭제할 문서 ID.
     * @returns {Promise<void>} 삭제와 후속 갱신이 끝나면 완료된다.
     */
    remove: async (id: string): Promise<void> => {
      const snapshot = await readBeforeWrite(id);
      try {
        await deleteDoc(doc(getFirebaseDb(), name, id));
      } catch {
        throw new Error(`${label} 삭제에 실패했습니다.`);
      }
      requestPublicRevalidate(cacheTag);
      await syncAfterWrite(id, snapshot, null);
    },
  };
};

export { listCrud };
export type { PostSyncPolicy };
