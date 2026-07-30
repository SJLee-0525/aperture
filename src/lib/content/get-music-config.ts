import { EMPTY_MUSIC_CONFIG } from "@/constants/empty-configs";
import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchMusicConfig } from "@/lib/firebase/firestore-rest";
import type { MusicConfig } from "@/types/music";

/**
 * site/music 설정 문서(소개·경력 타임라인). mock 은 오직 개발 모드·env 미설정일 때만
 * — 그 시점에 동적 로드해 실데이터 경로에서는 로드하지 않는다.
 * 실데이터 모드에서 문서 없음은 빈 설정, REST 오류는 ISR 보존을 위해 throw한다.
 */
const getMusicConfig = async (): Promise<MusicConfig> => {
  if (shouldUseMockContent()) return (await import("@/mocks/music")).MOCK_MUSIC_CONFIG;
  return (await fetchMusicConfig()) ?? EMPTY_MUSIC_CONFIG;
};

export { getMusicConfig };
