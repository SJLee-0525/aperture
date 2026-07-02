"use client";

import { useState, useSyncExternalStore } from "react";

import { addLiked, hasLiked, removeLiked, subscribe } from "@/features/likes/liked-store";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { likePhoto } from "@/lib/firebase/likes";

/**
 * 좋아요 상태 — Firestore 익명 +1 영속화(아키텍처 원칙 #7, 유일한 무인증 쓰기).
 * optimistic 증가 → 실패 시 롤백. 이미 좋아요한 사진은 재요청 안 함(브라우저당 1회, 무료 한도 보호).
 * likes≥1이면 하트 채움(전역 인기 반영). 사진이 바뀌면 photoId key 로 리마운트해 재시드한다.
 * env 미설정(로컬 mock 모드)이면 네트워크 없이 로컬 optimistic 만.
 */
const useLike = (photoId: string, initialLikes: number) => {
  const [likes, setLikes] = useState(initialLikes);
  const liked = useSyncExternalStore(
    subscribe,
    () => hasLiked(photoId), // 클라이언트 스냅샷
    () => false, // 서버 스냅샷 — SSR 기본 미좋아요
  );

  const like = async () => {
    if (liked) return; // 브라우저당 1회

    setLikes((count) => count + 1); // optimistic
    addLiked(photoId); // localStorage 기록 → liked=true 재조정

    if (!isFirebaseConfigured()) return; // 로컬 mock 모드 — 로컬 증가로 끝

    try {
      await likePhoto(photoId);
    } catch {
      // 서버 반영 실패 → 롤백
      setLikes((count) => count - 1);
      removeLiked(photoId);
    }
  };

  return { likes, like, liked, filled: likes >= 1 };
};

export { useLike };
