import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchPublishedMusicMedia } from "@/lib/firebase/firestore-rest";
import type { MusicMedia } from "@/types/music";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬.
 *  mock 데이터는 이 시점에 동적 로드 — 실데이터 경로에서는 로드하지 않는다. */
const mockMedia = async (): Promise<MusicMedia[]> => {
  const { MOCK_MUSIC_MEDIA } = await import("@/mocks/music");
  return MOCK_MUSIC_MEDIA.filter((item) => item.published).sort((a, b) => a.order - b.order);
};

/** 공개 영상 목록 — published 필터 + order 정렬. Firebase 설정 시 실데이터, 아니면 mock. */
const getMusicMedia = async (): Promise<MusicMedia[]> => {
  if (shouldUseMockContent()) return mockMedia();
  return fetchPublishedMusicMedia();
};

export { getMusicMedia };
