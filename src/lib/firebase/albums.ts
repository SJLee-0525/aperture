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

import { COLLECTIONS } from "@/constants/collections";
import { firestoreCollectionCacheTag } from "@/constants/cache";

import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { getFirebaseDb } from "@/lib/firebase/client";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { Album } from "@/types/album";

const ALBUMS_CACHE_TAG = firestoreCollectionCacheTag(COLLECTIONS.ALBUMS);

/** 새 앨범을 저장할 때 사용하는 문서 ID 제외 입력값. */
type AlbumInput = Omit<Album, "id">;

/**
 * 앨범 문서의 누락 필드를 기본값으로 채워 `Album`으로 변환한다.
 *
 * @param {string} id Firestore 앨범 문서 ID.
 * @param {DocumentData} data Firestore에서 읽은 앨범 문서 필드.
 * @returns {Album} 관리자 화면에서 사용하는 앨범 모델.
 */
const toAlbum = (id: string, data: DocumentData): Album => ({
  id,
  title: data.title ?? EMPTY_TEXT,
  subtitle: data.subtitle ?? EMPTY_TEXT,
  coverPhotoId: data.coverPhotoId ?? "",
  cover: data.cover ?? null,
  photoIds: data.photoIds ?? [],
  order: data.order ?? 0,
  published: data.published ?? false,
});

/**
 * 새 앨범 문서 ID 선발급.
 *
 * @returns {string} Firestore에서 미리 발급한 앨범 문서 ID.
 */
const newAlbumId = (): string => doc(collection(getFirebaseDb(), COLLECTIONS.ALBUMS)).id;

/**
 * 관리자 앨범 목록 — 초안 포함 전체, order 순.
 *
 * @returns {Promise<Album[]>} `order` 오름차순으로 정렬된 전체 앨범.
 */
const listAlbumsAdmin = async (): Promise<Album[]> => {
  try {
    const snap = await getDocs(
      query(collection(getFirebaseDb(), COLLECTIONS.ALBUMS), orderBy("order")),
    );
    return snap.docs.map((d) => toAlbum(d.id, d.data()));
  } catch {
    throw new Error("앨범 목록을 불러오지 못했습니다.");
  }
};

/**
 * 관리자 편집용 앨범 한 건을 읽는다.
 *
 * @param {string} id 조회할 앨범 문서 ID.
 * @returns {Promise<Album | null>} 앨범 모델. 문서가 없으면 `null`이다.
 */
const getAlbumAdmin = async (id: string): Promise<Album | null> => {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.ALBUMS, id));
    return snap.exists() ? toAlbum(snap.id, snap.data()) : null;
  } catch {
    throw new Error("앨범을 불러오지 못했습니다.");
  }
};

/**
 * 미리 발급한 ID로 앨범을 생성하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {string} id 새 앨범에 사용할 문서 ID.
 * @param {AlbumInput} input 저장할 앨범 필드.
 * @returns {Promise<void>} 저장과 RAG 동기화가 끝나면 완료된다.
 */
const createAlbum = async (id: string, input: AlbumInput): Promise<void> => {
  try {
    await setDoc(doc(getFirebaseDb(), COLLECTIONS.ALBUMS, id), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("앨범 저장에 실패했습니다.");
  }
  requestPublicRevalidate(ALBUMS_CACHE_TAG);
  await requestRagSync("album", id);
};

/**
 * 앨범 필드 전체를 수정하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {string} id 수정할 앨범 문서 ID.
 * @param {AlbumInput} input 교체할 앨범 필드.
 * @returns {Promise<void>} 수정과 RAG 동기화가 끝나면 완료된다.
 */
const updateAlbum = async (id: string, input: AlbumInput): Promise<void> => {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.ALBUMS, id), {
      ...input,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("앨범 수정에 실패했습니다.");
  }
  requestPublicRevalidate(ALBUMS_CACHE_TAG);
  await requestRagSync("album", id);
};

/**
 * 순서만 갱신 (dnd 정렬).
 *
 * @param {string} id 순서를 바꿀 앨범 문서 ID.
 * @param {number} order 저장할 정렬 순서.
 * @returns {Promise<void>} 순서 저장이 끝나면 완료된다.
 */
const updateAlbumOrder = async (id: string, order: number): Promise<void> => {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.ALBUMS, id), {
      order,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("순서 저장에 실패했습니다.");
  }
  requestPublicRevalidate(ALBUMS_CACHE_TAG);
};

/**
 * 앨범의 공개 상태를 바꾸고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {string} id 상태를 바꿀 앨범 문서 ID.
 * @param {boolean} published 공개 여부.
 * @returns {Promise<void>} 상태 저장과 RAG 동기화가 끝나면 완료된다.
 */
const setAlbumPublished = async (id: string, published: boolean): Promise<void> => {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.ALBUMS, id), {
      published,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("공개 상태 변경에 실패했습니다.");
  }
  requestPublicRevalidate(ALBUMS_CACHE_TAG);
  await requestRagSync("album", id);
};

/**
 * 앨범 삭제 — 사진은 지우지 않는다(앨범은 참조만 보유).
 *
 * @param {string} id 삭제할 앨범 문서 ID.
 * @returns {Promise<void>} 삭제와 RAG 동기화가 끝나면 완료된다.
 */
const deleteAlbum = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.ALBUMS, id));
  } catch {
    throw new Error("앨범 삭제에 실패했습니다.");
  }
  requestPublicRevalidate(ALBUMS_CACHE_TAG);
  await requestRagSync("album", id);
};

export {
  createAlbum,
  deleteAlbum,
  getAlbumAdmin,
  listAlbumsAdmin,
  newAlbumId,
  setAlbumPublished,
  updateAlbum,
  updateAlbumOrder,
};
export type { AlbumInput };
