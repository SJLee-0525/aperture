import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchPublishedMusicWorks, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_MUSIC_WORKS } from "@/mocks/music";
import type { MusicWork } from "@/types/music";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬. */
const mockWorks = (): MusicWork[] =>
  MOCK_MUSIC_WORKS.filter((work) => work.published).sort((a, b) => a.order - b.order);

/**
 * 공개 연주 목록 — published 필터 + order 정렬 완료 상태.
 * Firebase 설정 시 항상 실데이터(빈 컬렉션이면 빈 배열). mock 은 env 미설정일 때만.
 */
const getMusicWorks = async (): Promise<MusicWork[]> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return mockWorks();
  try {
    return await fetchPublishedMusicWorks();
  } catch (error) {
    console.warn("[content] getMusicWorks: Firestore REST 실패 — 빈 목록", error);
    return [];
  }
};

export { getMusicWorks };
