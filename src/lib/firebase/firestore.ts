import {
  Timestamp,
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
import { db } from "@/lib/firebase/client";
import type { Photo } from "@/types/photo";

/** 사진 쓰기 입력 — id(선발급)·likes(항상 0 생성) 제외. */
type PhotoInput = Omit<Photo, "id" | "likes">;

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
  likes: data.likes ?? 0,
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

/** 생성 — likes 는 항상 0(Rules delta 가드 전제), createdAt/updatedAt 서버시간. */
const createPhoto = async (id: string, input: PhotoInput): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.PHOTOS, id), {
      ...toDoc(input),
      likes: 0,
      createdAt: serverTimestamp(),
    });
  } catch {
    throw new Error("사진 저장에 실패했습니다.");
  }
};

/** 수정 — likes·createdAt 은 건드리지 않는다. */
const updatePhoto = async (id: string, input: PhotoInput): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PHOTOS, id), toDoc(input));
  } catch {
    throw new Error("사진 수정에 실패했습니다.");
  }
};

const deletePhoto = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.PHOTOS, id));
  } catch {
    throw new Error("사진 삭제에 실패했습니다.");
  }
};

export { createPhoto, deletePhoto, getPhotoAdmin, listPhotosAdmin, newPhotoId, updatePhoto };
export type { PhotoInput };
