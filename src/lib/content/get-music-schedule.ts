import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchPublishedMusicSchedule, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_MUSIC_SCHEDULE } from "@/mocks/music";
import type { MusicSchedule } from "@/types/music";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬. */
const mockSchedule = (): MusicSchedule[] =>
  MOCK_MUSIC_SCHEDULE.filter((item) => item.published).sort((a, b) => a.order - b.order);

/** 공개 공연 일정 — published 필터 + order 정렬. Firebase 설정 시 실데이터, 아니면 mock. */
const getMusicSchedule = async (): Promise<MusicSchedule[]> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return mockSchedule();
  try {
    return await fetchPublishedMusicSchedule();
  } catch (error) {
    console.warn("[content] getMusicSchedule: Firestore REST 실패 — 빈 목록", error);
    return [];
  }
};

export { getMusicSchedule };
