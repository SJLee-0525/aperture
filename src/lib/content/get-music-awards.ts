import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchPublishedMusicAwards } from "@/lib/firebase/firestore-rest";
import type { MusicAward } from "@/types/music";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬.
 *  mock 데이터는 이 시점에 동적 로드 — 실데이터 경로에서는 로드하지 않는다. */
const mockAwards = async (): Promise<MusicAward[]> => {
  const { MOCK_MUSIC_AWARDS } = await import("@/mocks/music");
  return MOCK_MUSIC_AWARDS.filter((award) => award.published).sort((a, b) => a.order - b.order);
};

/** 공개 수상 목록 — published 필터 + order 정렬. Firebase 설정 시 실데이터, 아니면 mock. */
const getMusicAwards = async (): Promise<MusicAward[]> => {
  if (shouldUseMockContent()) return mockAwards();
  return fetchPublishedMusicAwards();
};

export { getMusicAwards };
