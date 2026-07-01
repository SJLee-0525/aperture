"use client";

import { useState } from "react";

/**
 * 좋아요 상태. P1: 로컬 optimistic 증가 전용(기억 안 함). P2: Firestore increment로 교체.
 * likes≥1이면 채움(전역 인기 반영). 사진이 바뀌면 LikeButton을 key로 리마운트해 재시드한다.
 */
const useLike = (initialLikes: number) => {
  const [likes, setLikes] = useState(initialLikes);
  const like = () => setLikes((count) => count + 1);
  return { likes, like, filled: likes >= 1 };
};

export { useLike };
