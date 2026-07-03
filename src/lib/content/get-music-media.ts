import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchPublishedMusicMedia, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_MUSIC_MEDIA } from "@/mocks/music";
import type { MusicMedia } from "@/types/music";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬. */
const mockMedia = (): MusicMedia[] =>
  MOCK_MUSIC_MEDIA.filter((item) => item.published).sort((a, b) => a.order - b.order);

/** 공개 영상 목록 — published 필터 + order 정렬. Firebase 설정 시 실데이터, 아니면 mock. */
const getMusicMedia = async (): Promise<MusicMedia[]> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return mockMedia();
  try {
    return await fetchPublishedMusicMedia();
  } catch (error) {
    console.warn("[content] getMusicMedia: Firestore REST 실패 — 빈 목록", error);
    return [];
  }
};

export { getMusicMedia };
