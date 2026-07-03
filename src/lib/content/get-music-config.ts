import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchMusicConfig, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_MUSIC_CONFIG } from "@/mocks/music";
import type { MusicConfig } from "@/types/music";

/**
 * site/music 설정 문서(히어로·연락처). 문서가 없으면(첫 배포 전) mock 시드로 폴백 —
 * get-site 와 동일 패턴(단일 config 문서라 mock 시드 허용, 리스트와 달리 혼재 문제 없음).
 */
const getMusicConfig = async (): Promise<MusicConfig> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return MOCK_MUSIC_CONFIG;
  try {
    return (await fetchMusicConfig()) ?? MOCK_MUSIC_CONFIG;
  } catch (error) {
    console.warn("[content] getMusicConfig: Firestore REST 실패 — mock 폴백", error);
    return MOCK_MUSIC_CONFIG;
  }
};

export { getMusicConfig };
