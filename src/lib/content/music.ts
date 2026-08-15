import { EMPTY_MUSIC_CONFIG } from "@/constants/empty-configs";
import { shouldUseMockContent } from "@/lib/content/content-source";
import {
  fetchMusicConfig,
  fetchPublishedMusicAwards,
  fetchPublishedMusicMedia,
  fetchPublishedMusicWorks,
} from "@/lib/supabase/public/music";

import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

const getMusicWorks = async (): Promise<MusicWork[]> => {
  if (!shouldUseMockContent()) return fetchPublishedMusicWorks();
  const { MOCK_MUSIC_WORKS } = await import("@/mocks/music");
  return MOCK_MUSIC_WORKS.filter((item) => item.published).sort((a, b) => a.order - b.order);
};

const getMusicAwards = async (): Promise<MusicAward[]> => {
  if (!shouldUseMockContent()) return fetchPublishedMusicAwards();
  const { MOCK_MUSIC_AWARDS } = await import("@/mocks/music");
  return MOCK_MUSIC_AWARDS.filter((item) => item.published).sort((a, b) => a.order - b.order);
};

const getMusicMedia = async (): Promise<MusicMedia[]> => {
  if (!shouldUseMockContent()) return fetchPublishedMusicMedia();
  const { MOCK_MUSIC_MEDIA } = await import("@/mocks/music");
  return MOCK_MUSIC_MEDIA.filter((item) => item.published).sort((a, b) => a.order - b.order);
};

const getMusicConfig = async (): Promise<MusicConfig> => {
  if (shouldUseMockContent()) return (await import("@/mocks/music")).MOCK_MUSIC_CONFIG;
  return (await fetchMusicConfig()) ?? EMPTY_MUSIC_CONFIG;
};

export { getMusicAwards, getMusicConfig, getMusicMedia, getMusicWorks };
