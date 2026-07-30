import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchPublishedMusicWorks } from "@/lib/firebase/firestore-rest";
import type { MusicWork } from "@/types/music";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬.
 *  mock 데이터는 이 시점에 동적 로드 — 실데이터 경로에서는 로드하지 않는다. */
const mockWorks = async (): Promise<MusicWork[]> => {
  const { MOCK_MUSIC_WORKS } = await import("@/mocks/music");
  return MOCK_MUSIC_WORKS.filter((work) => work.published).sort((a, b) => a.order - b.order);
};

/**
 * 공개 연주 목록 — published 필터 + order 정렬 완료 상태.
 * Firebase 설정 시 항상 실데이터(빈 컬렉션이면 빈 배열). mock 은 env 미설정일 때만.
 */
const getMusicWorks = async (): Promise<MusicWork[]> => {
  if (shouldUseMockContent()) return mockWorks();
  return fetchPublishedMusicWorks();
};

export { getMusicWorks };
