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
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { db } from "@/lib/firebase/client";
import type { Album } from "@/types/album";

/** 앨범 쓰기 입력 — id 제외(선발급). */
type AlbumInput = Omit<Album, "id">;

const toAlbum = (id: string, data: DocumentData): Album => ({
  id,
  title: data.title ?? { ko: "", en: "" },
  subtitle: data.subtitle ?? { ko: "", en: "" },
  coverPhotoId: data.coverPhotoId ?? "",
  photoIds: data.photoIds ?? [],
  order: data.order ?? 0,
  published: data.published ?? false,
});

/** 새 앨범 문서 ID 선발급. */
const newAlbumId = (): string => doc(collection(db, COLLECTIONS.ALBUMS)).id;

/** 관리자 앨범 목록 — 초안 포함 전체, order 순. */
const listAlbumsAdmin = async (): Promise<Album[]> => {
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.ALBUMS), orderBy("order")));
    return snap.docs.map((d) => toAlbum(d.id, d.data()));
  } catch {
    throw new Error("앨범 목록을 불러오지 못했습니다.");
  }
};

const getAlbumAdmin = async (id: string): Promise<Album | null> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.ALBUMS, id));
    return snap.exists() ? toAlbum(snap.id, snap.data()) : null;
  } catch {
    throw new Error("앨범을 불러오지 못했습니다.");
  }
};

const createAlbum = async (id: string, input: AlbumInput): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.ALBUMS, id), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("앨범 저장에 실패했습니다.");
  }
  requestPublicRevalidate();
};

const updateAlbum = async (id: string, input: AlbumInput): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.ALBUMS, id), { ...input, updatedAt: serverTimestamp() });
  } catch {
    throw new Error("앨범 수정에 실패했습니다.");
  }
  requestPublicRevalidate();
};

/** 순서만 갱신 (dnd 정렬). */
const updateAlbumOrder = async (id: string, order: number): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.ALBUMS, id), { order, updatedAt: serverTimestamp() });
  } catch {
    throw new Error("순서 저장에 실패했습니다.");
  }
  requestPublicRevalidate();
};

const setAlbumPublished = async (id: string, published: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.ALBUMS, id), { published, updatedAt: serverTimestamp() });
  } catch {
    throw new Error("공개 상태 변경에 실패했습니다.");
  }
  requestPublicRevalidate();
};

/** 앨범 삭제 — 사진은 지우지 않는다(앨범은 참조만 보유). */
const deleteAlbum = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.ALBUMS, id));
  } catch {
    throw new Error("앨범 삭제에 실패했습니다.");
  }
  requestPublicRevalidate();
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
