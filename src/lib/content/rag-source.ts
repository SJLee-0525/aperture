import { EMPTY_DEV_CONFIG, EMPTY_MUSIC_CONFIG, EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  fetchDevConfig,
  fetchPublishedDevProjects,
  toDevConfig,
  toDevProject,
} from "@/lib/supabase/public/dev";
import {
  fetchDevArticleTags,
  fetchPublishedDevArticles,
  toDevArticle,
} from "@/lib/supabase/public/dev-articles";
import {
  fetchMusicConfig,
  fetchPublishedMusicAwards,
  fetchPublishedMusicMedia,
  fetchPublishedMusicWorks,
  toMusicAward,
  toMusicConfig,
  toMusicMedia,
  toMusicWork,
} from "@/lib/supabase/public/music";
import {
  fetchPublishedAlbums,
  fetchPublishedPhotos,
  toAlbum,
  toPhoto,
} from "@/lib/supabase/public/photo";
import { fetchSiteConfig, toSiteConfig } from "@/lib/supabase/public/site";
import { fetchRowAsUser } from "@/lib/supabase/public/transport";

import type { CollectionId } from "@/constants/collections";
import type { RagSyncTarget } from "@/types/rag";

/**
 * 동기화는 방금 저장된 원본을 읽어야 하므로 ISR Data Cache 를 우회한다 —
 * 관리자 저장 직후의 재검증(requestPublicRevalidate)은 300ms 디바운스 fire-and-forget 이라
 * 캐시 경유 읽기는 무효화보다 먼저 실행되는 경주에서 항상 질 수 있다.
 */
const FRESH = { fresh: true } as const;

const targetCollection: Partial<Record<RagSyncTarget["sourceType"], CollectionId>> = {
  photo: "photos",
  album: "albums",
  project: "devProjects",
  musicWork: "musicWorks",
  musicAward: "musicAwards",
  musicMedia: "musicMedia",
  siteConfig: "site",
  devConfig: "site",
  musicConfig: "site",
  article: "devArticles",
};

/**
 * 관리자 access token 으로 타깃 원본을 초안 포함해 읽는다. 인가는 RLS 가 한다 —
 * 발행 취소된 문서도 읽어야 stale 청크 삭제 판정이 가능하다.
 */
const fetchAdminTarget = async (target: RagSyncTarget, idToken: string) => {
  const collection = targetCollection[target.sourceType];
  if (!isSupabaseConfigured() || !collection) return null;
  return fetchRowAsUser(collection, target.sourceId, idToken);
};

const getRagSourceData = async () => {
  const [
    site,
    devConfig,
    musicConfig,
    devProjects,
    musicWorks,
    musicAwards,
    musicMedia,
    photos,
    albums,
    devArticles,
    devArticleTags,
  ] = await Promise.all([
    fetchSiteConfig(FRESH),
    fetchDevConfig(FRESH),
    fetchMusicConfig(FRESH),
    fetchPublishedDevProjects(FRESH),
    fetchPublishedMusicWorks(FRESH),
    fetchPublishedMusicAwards(FRESH),
    fetchPublishedMusicMedia(FRESH),
    fetchPublishedPhotos(FRESH),
    fetchPublishedAlbums(FRESH),
    fetchPublishedDevArticles(FRESH),
    fetchDevArticleTags(FRESH),
  ]);
  if (!site || !devConfig || !musicConfig)
    throw new Error("공개 포트폴리오 설정을 불러오지 못했습니다.");
  return {
    site,
    devConfig,
    musicConfig,
    devProjects,
    musicWorks,
    musicAwards,
    musicMedia,
    photos,
    albums,
    devArticles,
    devArticleTags,
  };
};

type RagSourceData = Awaited<ReturnType<typeof getRagSourceData>>;

/**
 * 타깃 원본을 공개 fetcher 와 같은 toX 디코더로 정규화한다 — 증분 경로가 raw 디코드를
 * 그대로 쓰면 구형 문서(평문 troubleshooting, id 없는 award)에서 전체 경로와 청크가 어긋나거나 깨진다.
 *
 * @param {RagSyncTarget} target
 * @param {string} idToken
 * @returns {Promise<RagSourceData>}
 */
const getRagSourceDataForTarget = async (
  target: RagSyncTarget,
  idToken: string,
): Promise<RagSourceData> => {
  if (target.sourceType === "photoTags") {
    const [site, photos] = await Promise.all([fetchSiteConfig(FRESH), fetchPublishedPhotos(FRESH)]);
    return {
      site: site ?? EMPTY_SITE_CONFIG,
      devConfig: EMPTY_DEV_CONFIG,
      musicConfig: EMPTY_MUSIC_CONFIG,
      devProjects: [],
      musicWorks: [],
      musicAwards: [],
      musicMedia: [],
      photos,
      albums: [],
      devArticles: [],
      devArticleTags: [],
    };
  }
  const [raw, site] = await Promise.all([
    fetchAdminTarget(target, idToken),
    target.sourceType === "photo" ? fetchSiteConfig(FRESH) : Promise.resolve(null),
  ]);
  const base: RagSourceData = {
    site: site ?? EMPTY_SITE_CONFIG,
    devConfig: EMPTY_DEV_CONFIG,
    musicConfig: EMPTY_MUSIC_CONFIG,
    devProjects: [],
    musicWorks: [],
    musicAwards: [],
    musicMedia: [],
    photos: [],
    albums: [],
    devArticles: [],
    devArticleTags: [],
  };
  if (!raw) return base;
  if (target.sourceType === "siteConfig") return { ...base, site: toSiteConfig(raw) };
  if (target.sourceType === "devConfig") return { ...base, devConfig: toDevConfig(raw) };
  if (target.sourceType === "musicConfig") return { ...base, musicConfig: toMusicConfig(raw) };
  if (raw.published !== true) return base;
  const id = target.sourceId;
  if (target.sourceType === "project") return { ...base, devProjects: [toDevProject(id, raw)] };
  if (target.sourceType === "musicWork") return { ...base, musicWorks: [toMusicWork(id, raw)] };
  if (target.sourceType === "musicAward") return { ...base, musicAwards: [toMusicAward(id, raw)] };
  if (target.sourceType === "musicMedia") return { ...base, musicMedia: [toMusicMedia(id, raw)] };
  if (target.sourceType === "photo") return { ...base, photos: [toPhoto(id, raw)] };
  // 태그 라벨은 글 문서에 없다. 청크 텍스트에 라벨을 넣으려면 사전을 함께 읽어야 한다.
  if (target.sourceType === "article") {
    return {
      ...base,
      devArticles: [toDevArticle(id, raw)],
      devArticleTags: await fetchDevArticleTags(FRESH),
    };
  }
  return { ...base, albums: [toAlbum(id, raw)] };
};

export { getRagSourceData, getRagSourceDataForTarget };
export type { RagSourceData };
