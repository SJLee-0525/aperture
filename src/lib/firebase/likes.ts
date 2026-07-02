import { doc, increment, updateDoc } from "firebase/firestore";

import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/lib/firebase/client";

/**
 * 익명 좋아요 +1 — 이 프로젝트 유일의 무인증 쓰기(아키텍처 원칙 #7).
 * Rules 가 delta(+1)·likes 필드 단독·published 를 강제하므로 클라는 increment(1)만 보낸다.
 */
const likePhoto = async (photoId: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.PHOTOS, photoId), { likes: increment(1) });
};

export { likePhoto };
