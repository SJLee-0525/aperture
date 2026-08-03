import { EMPTY_DEV_CONFIG, EMPTY_MUSIC_CONFIG, EMPTY_SITE_CONFIG } from "@/constants/empty-configs";

import { fetchPublishedDevProjects, fetchDevConfig } from "@/lib/firebase/public/dev";
import {
  fetchMusicConfig,
  fetchPublishedMusicAwards,
  fetchPublishedMusicMedia,
  fetchPublishedMusicWorks,
} from "@/lib/firebase/public/music";
import { fetchPublishedAlbums, fetchPublishedPhotos } from "@/lib/firebase/public/photo";
import { fetchSiteConfig } from "@/lib/firebase/public/site";

import type { RagSyncTarget } from "@/types/rag";

type RestValue = Record<string, unknown>;
const decodeValue = (value: RestValue | undefined): unknown => {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value)
    return decodeFields((value.mapValue as { fields?: Record<string, RestValue> }).fields ?? {});
  if ("arrayValue" in value)
    return ((value.arrayValue as { values?: RestValue[] }).values ?? []).map(decodeValue);
  return null;
};
const decodeFields = (fields: Record<string, RestValue>) =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));

const targetCollection: Partial<Record<RagSyncTarget["sourceType"], string>> = {
  photo: "photos",
  album: "albums",
  project: "devProjects",
  musicWork: "musicWorks",
  musicAward: "musicAwards",
  musicMedia: "musicMedia",
  siteConfig: "site",
  devConfig: "site",
  musicConfig: "site",
};

const fetchAdminTarget = async (target: RagSyncTarget, idToken: string) => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const collection = targetCollection[target.sourceType];
  if (!projectId || !apiKey || !collection) return null;
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(target.sourceId)}?key=${encodeURIComponent(apiKey)}`,
    { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`RAG 원본 조회 실패 (${response.status})`);
  const payload = (await response.json()) as { fields?: Record<string, RestValue> };
  return decodeFields(payload.fields ?? {});
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
  ] = await Promise.all([
    fetchSiteConfig(),
    fetchDevConfig(),
    fetchMusicConfig(),
    fetchPublishedDevProjects(),
    fetchPublishedMusicWorks(),
    fetchPublishedMusicAwards(),
    fetchPublishedMusicMedia(),
    fetchPublishedPhotos(),
    fetchPublishedAlbums(),
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
  };
};

const getRagSourceDataForTarget = async (
  target: RagSyncTarget,
  idToken: string,
): Promise<RagSourceData> => {
  if (target.sourceType === "photoTags") {
    const [site, photos] = await Promise.all([fetchSiteConfig(), fetchPublishedPhotos()]);
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
    } as RagSourceData;
  }
  const [raw, site] = await Promise.all([
    fetchAdminTarget(target, idToken),
    target.sourceType === "photo" ? fetchSiteConfig() : Promise.resolve(null),
  ]);
  const published = raw?.published === true;
  const item: Record<string, unknown> | null = raw ? { id: target.sourceId, ...raw } : null;
  if (target.sourceType === "musicWork" && item && typeof item.performedAt === "string") {
    item.performedAt = new Date(item.performedAt);
  }
  return {
    site: target.sourceType === "siteConfig" && raw ? raw : (site ?? EMPTY_SITE_CONFIG),
    devConfig: target.sourceType === "devConfig" && raw ? raw : EMPTY_DEV_CONFIG,
    musicConfig: target.sourceType === "musicConfig" && raw ? raw : EMPTY_MUSIC_CONFIG,
    devProjects: target.sourceType === "project" && published && item ? [item] : [],
    musicWorks: target.sourceType === "musicWork" && published && item ? [item] : [],
    musicAwards: target.sourceType === "musicAward" && published && item ? [item] : [],
    musicMedia: target.sourceType === "musicMedia" && published && item ? [item] : [],
    photos: target.sourceType === "photo" && published && item ? [item] : [],
    albums: target.sourceType === "album" && published && item ? [item] : [],
  } as unknown as RagSourceData;
};

export { getRagSourceData, getRagSourceDataForTarget };
export type RagSourceData = Awaited<ReturnType<typeof getRagSourceData>>;
