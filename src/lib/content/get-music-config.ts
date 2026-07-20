import { EMPTY_MUSIC_CONFIG } from "@/constants/empty-configs";
import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchMusicConfig, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_MUSIC_CONFIG } from "@/mocks/music";
import type { MusicConfig } from "@/types/music";

/**
 * site/music 설정 문서(소개·경력 타임라인). mock 은 오직 개발 모드·env 미설정일 때만.
 * 실데이터 모드에선 문서 없음·REST 오류 시 **빈 설정** — mock 문구 노출 방지(get-site 와 동일 정책).
 */
const getMusicConfig = async (): Promise<MusicConfig> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return MOCK_MUSIC_CONFIG;
  try {
    return (await fetchMusicConfig()) ?? EMPTY_MUSIC_CONFIG;
  } catch (error) {
    console.warn("[content] getMusicConfig: Firestore REST 실패 — 빈 설정", error);
    return EMPTY_MUSIC_CONFIG;
  }
};

export { getMusicConfig };
