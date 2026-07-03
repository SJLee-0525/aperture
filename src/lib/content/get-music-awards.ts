import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchPublishedMusicAwards, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_MUSIC_AWARDS } from "@/mocks/music";
import type { MusicAward } from "@/types/music";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬. */
const mockAwards = (): MusicAward[] =>
  MOCK_MUSIC_AWARDS.filter((award) => award.published).sort((a, b) => a.order - b.order);

/** 공개 수상 목록 — published 필터 + order 정렬. Firebase 설정 시 실데이터, 아니면 mock. */
const getMusicAwards = async (): Promise<MusicAward[]> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return mockAwards();
  try {
    return await fetchPublishedMusicAwards();
  } catch (error) {
    console.warn("[content] getMusicAwards: Firestore REST 실패 — 빈 목록", error);
    return [];
  }
};

export { getMusicAwards };
