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

import { COLLECTIONS } from "@/constants/collections";
import { firestoreCollectionCacheTag } from "@/constants/cache";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { db } from "@/lib/firebase/client";
import { removePhotoFromAlbum } from "@/lib/firebase/remove-photo-from-album";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

const PHOTOS_CACHE_TAG = firestoreCollectionCacheTag(COLLECTIONS.PHOTOS);
const ALBUMS_CACHE_TAG = firestoreCollectionCacheTag(COLLECTIONS.ALBUMS);

/** 사진 쓰기 입력 — 문서 id는 저장 필드에서 제외한다. */
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

/** Firestore 문서 → Photo (Timestamp → Date). 누락 필드는 안전 기본값으로 채운다. */
const toPhoto = (id: string, data: DocumentData): Photo => ({
  id,
  title: data.title ?? { ko: "", en: "" },
  shotAt: data.shotAt instanceof Timestamp ? data.shotAt.toDate() : new Date(data.shotAt ?? 0),
  camera: data.camera ?? "",
  lens: data.lens ?? "",
  exif: { ...EMPTY_EXIF, ...(data.exif ?? {}) },
  fileName: data.fileName ?? undefined,
  dimensions: data.dimensions ?? { w: 0, h: 0 },
  aspectRatio: data.aspectRatio ?? 1,
  place: data.place ?? { ko: "", en: "" },
  coords: data.coords ?? null,
  tags: data.tags ?? [],
  image: data.image,
  order: data.order ?? 0,
  published: data.published ?? false,
});

/** Photo 입력 → Firestore 저장 형태 (Date → Timestamp). */
const toDoc = (input: PhotoInput) => ({
  ...input,
  shotAt: Timestamp.fromDate(input.shotAt),
  updatedAt: serverTimestamp(),
});

/** 새 사진 문서 ID 선발급 — Storage 경로(photos/{id}) 확정에 필요. */
const newPhotoId = (): string => doc(collection(db, COLLECTIONS.PHOTOS)).id;

/** 관리자 사진 목록 — 초안 포함 전체, order 순. */
const listPhotosAdmin = async (): Promise<Photo[]> => {
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.PHOTOS), orderBy("order")));
    return snap.docs.map((d) => toPhoto(d.id, d.data()));
  } catch {
    throw new Error("사진 목록을 불러오지 못했습니다.");
  }
};

const getPhotoAdmin = async (id: string): Promise<Photo | null> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.PHOTOS, id));
    return snap.exists() ? toPhoto(snap.id, snap.data()) : null;
  } catch {
    throw new Error("사진을 불러오지 못했습니다.");
  }
};

/** 생성 — createdAt/updatedAt은 서버 시간으로 기록한다. */
const createPhoto = async (id: string, input: PhotoInput): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.PHOTOS, id), {
      ...toDoc(input),
      createdAt: serverTimestamp(),
    });
  } catch {
    throw new Error("사진 저장에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG);
  await requestRagSync("photo", id);
};

/** 수정 — createdAt은 건드리지 않는다. */
const updatePhoto = async (id: string, input: PhotoInput): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PHOTOS, id), toDoc(input));
  } catch {
    throw new Error("사진 수정에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG);
  await requestRagSync("photo", id);
};

const deletePhoto = async (id: string): Promise<void> => {
  try {
    const albums = await getDocs(collection(db, COLLECTIONS.ALBUMS));
    const batch = writeBatch(db);

    batch.delete(doc(db, COLLECTIONS.PHOTOS, id));
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

/** 순서만 갱신 (dnd 정렬) — 전체 입력 없이 order 필드만. */
const updatePhotoOrder = async (id: string, order: number): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PHOTOS, id), { order, updatedAt: serverTimestamp() });
  } catch {
    throw new Error("순서 저장에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG);
};

/** 공개 여부만 토글. */
const setPhotoPublished = async (id: string, published: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PHOTOS, id), { published, updatedAt: serverTimestamp() });
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
