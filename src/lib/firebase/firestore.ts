import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";

import { firestoreCollectionCacheTag } from "@/constants/cache";
import { COLLECTIONS } from "@/constants/collections";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { getFirebaseDb } from "@/lib/firebase/client";
import { removePhotoFromAlbum } from "@/lib/firebase/remove-photo-from-album";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

const PHOTOS_CACHE_TAG = firestoreCollectionCacheTag(COLLECTIONS.PHOTOS);
const ALBUMS_CACHE_TAG = firestoreCollectionCacheTag(COLLECTIONS.ALBUMS);

/** 새 사진을 저장할 때 사용하는 문서 ID 제외 입력값. */
type PhotoInput = Omit<Photo, "id">;

const EMPTY_EXIF: Photo["exif"] = {
  aperture: "",
  shutter: "",
  iso: "",
  focalLength: "",
  ev: "",
  wb: "",
  metering: "",
  flash: "",
};

/**
 * Firestore 사진 문서의 날짜와 누락 필드를 화면 모델에 맞게 정규화한다.
 *
 * @param {string} id Firestore 사진 문서 ID.
 * @param {DocumentData} data Firestore에서 읽은 사진 문서 필드.
 * @returns {Photo} 관리자 화면에서 사용하는 사진 모델.
 */
const toPhoto = (id: string, data: DocumentData): Photo => ({
  id,
  title: data.title ?? EMPTY_TEXT,
  shotAt: data.shotAt instanceof Timestamp ? data.shotAt.toDate() : new Date(data.shotAt ?? 0),
  camera: data.camera ?? "",
  lens: data.lens ?? "",
  exif: { ...EMPTY_EXIF, ...(data.exif ?? {}) },
  fileName: data.fileName ?? undefined,
  dimensions: data.dimensions ?? { w: 0, h: 0 },
  aspectRatio: data.aspectRatio ?? 1,
  place: data.place ?? EMPTY_TEXT,
  coords: data.coords ?? null,
  tags: data.tags ?? [],
  image: data.image,
  order: data.order ?? 0,
  published: data.published ?? false,
});

/**
 * 사진 입력의 `Date`를 Firestore `Timestamp`로 바꾸고 수정 시각을 붙인다.
 *
 * @param {PhotoInput} input 저장할 사진 필드.
 * @returns {{ shotAt: Timestamp; updatedAt: FieldValue; title: LocalizedText; camera: string; lens: string; exif: Exif; fileName?: string | undefined; dimensions: { w: number; h: number }; aspectRatio: number; place: LocalizedText; coords: Coords | null; tags: string[]; image: ImageMeta; order: number; published: boolean }} Firestore에 기록할 문서 필드.
 */
const toDoc = (input: PhotoInput) => ({
  ...input,
  shotAt: Timestamp.fromDate(input.shotAt),
  updatedAt: serverTimestamp(),
});

/**
 * 새 사진 문서 ID 선발급 — Storage 경로(photos/{id}) 확정에 필요.
 *
 * @returns {string} Firestore에서 미리 발급한 사진 문서 ID.
 */
const newPhotoId = (): string => doc(collection(getFirebaseDb(), COLLECTIONS.PHOTOS)).id;

/**
 * 관리자 사진 목록 — 초안 포함 전체, order 순.
 *
 * @returns {Promise<Photo[]>} `order` 오름차순으로 정렬된 전체 사진.
 */
const listPhotosAdmin = async (): Promise<Photo[]> => {
  try {
    const snap = await getDocs(
      query(collection(getFirebaseDb(), COLLECTIONS.PHOTOS), orderBy("order")),
    );
    return snap.docs.map((d) => toPhoto(d.id, d.data()));
  } catch {
    throw new Error("사진 목록을 불러오지 못했습니다.");
  }
};

/**
 * 관리자 편집용 사진 한 건을 읽는다.
 *
 * @param {string} id 조회할 사진 문서 ID.
 * @returns {Promise<Photo | null>} 사진 모델. 문서가 없으면 `null`이다.
 */
const getPhotoAdmin = async (id: string): Promise<Photo | null> => {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.PHOTOS, id));
    return snap.exists() ? toPhoto(snap.id, snap.data()) : null;
  } catch {
    throw new Error("사진을 불러오지 못했습니다.");
  }
};

/**
 * 사진 문서를 생성하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {string} id 새 사진에 사용할 문서 ID.
 * @param {PhotoInput} input 저장할 사진 필드.
 * @returns {Promise<void>} 저장과 RAG 동기화가 끝나면 완료된다.
 */
const createPhoto = async (id: string, input: PhotoInput): Promise<void> => {
  try {
    await setDoc(doc(getFirebaseDb(), COLLECTIONS.PHOTOS, id), {
      ...toDoc(input),
      createdAt: serverTimestamp(),
    });
  } catch {
    throw new Error("사진 저장에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG);
  await requestRagSync("photo", id);
};

/**
 * 사진 문서를 수정하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {string} id 수정할 사진 문서 ID.
 * @param {PhotoInput} input 교체할 사진 필드.
 * @returns {Promise<void>} 수정과 RAG 동기화가 끝나면 완료된다.
 */
const updatePhoto = async (id: string, input: PhotoInput): Promise<void> => {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.PHOTOS, id), toDoc(input));
  } catch {
    throw new Error("사진 수정에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG);
  await requestRagSync("photo", id);
};

/**
 * 사진을 삭제하고 모든 앨범의 사진·커버 참조를 한 배치에서 정리한다.
 *
 * @param {string} id 삭제할 사진 문서 ID.
 * @returns {Promise<void>} 배치 삭제와 RAG 동기화가 끝나면 완료된다.
 */
const deletePhoto = async (id: string): Promise<void> => {
  try {
    const albums = await getDocs(collection(getFirebaseDb(), COLLECTIONS.ALBUMS));
    const batch = writeBatch(getFirebaseDb());

    batch.delete(doc(getFirebaseDb(), COLLECTIONS.PHOTOS, id));
    albums.docs.forEach((albumDoc) => {
      const album = albumDoc.data() as Album;
      if (!album.photoIds?.includes(id) && album.coverPhotoId !== id) return;
      batch.update(albumDoc.ref, {
        ...removePhotoFromAlbum(
          {
            coverPhotoId: album.coverPhotoId ?? "",
            photoIds: album.photoIds ?? [],
          },
          id,
        ),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  } catch {
    throw new Error("사진 삭제에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG, ALBUMS_CACHE_TAG);
  await requestRagSync("photo", id);
};

/**
 * 드래그 정렬 결과에 맞춰 사진의 `order` 필드만 갱신한다.
 *
 * @param {string} id 순서를 바꿀 사진 문서 ID.
 * @param {number} order 저장할 정렬 순서.
 * @returns {Promise<void>} 순서 저장이 끝나면 완료된다.
 */
const updatePhotoOrder = async (id: string, order: number): Promise<void> => {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.PHOTOS, id), {
      order,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("순서 저장에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG);
};

/**
 * 사진의 공개 상태를 바꾸고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {string} id 상태를 바꿀 사진 문서 ID.
 * @param {boolean} published 공개 여부.
 * @returns {Promise<void>} 상태 저장과 RAG 동기화가 끝나면 완료된다.
 */
const setPhotoPublished = async (id: string, published: boolean): Promise<void> => {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.PHOTOS, id), {
      published,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("공개 상태 변경에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG);
  await requestRagSync("photo", id);
};

export {
  createPhoto,
  deletePhoto,
  getPhotoAdmin,
  listPhotosAdmin,
  newPhotoId,
  setPhotoPublished,
  updatePhoto,
  updatePhotoOrder,
};
export type { PhotoInput };
