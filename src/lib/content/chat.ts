import { getContentSource, type ContentSource } from "@/lib/content/content-source";
import { getDevConfig } from "@/lib/content/dev";
import { getMusicConfig } from "@/lib/content/music";
import { getSite } from "@/lib/content/site";
import { fetchChatDevProjects } from "@/lib/firebase/public/dev";
import {
  fetchChatMusicAwards,
  fetchChatMusicMedia,
  fetchChatMusicWorks,
} from "@/lib/firebase/public/music";
import { fetchChatAlbums, fetchChatPhotos } from "@/lib/firebase/public/photo";
import type { Album } from "@/types/album";
import type { DevConfig, DevProject } from "@/types/dev";
import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";
import type { Photo } from "@/types/photo";
import type { SiteConfig } from "@/types/site";

type ChatPhoto = Pick<
  Photo,
  "id" | "title" | "camera" | "lens" | "place" | "tags" | "image" | "order" | "published"
>;
type ChatAlbum = Pick<Album, "id" | "title" | "subtitle" | "cover" | "order" | "published">;
type ChatDevProject = Pick<
  DevProject,
  "id" | "title" | "summary" | "position" | "techTags" | "cover" | "order" | "published"
>;
type ChatMusicWork = Pick<
  MusicWork,
  "id" | "title" | "performedAt" | "venue" | "program" | "poster" | "order" | "published"
>;
type ChatMusicAward = Pick<MusicAward, "id" | "year" | "name" | "place" | "order" | "published">;
type ChatMusicMedia = Pick<MusicMedia, "id" | "title" | "source" | "order" | "published">;

type ChatProfileData = {
  site: SiteConfig;
  devConfig: DevConfig;
  devProjects: ChatDevProject[];
  musicConfig: MusicConfig;
  musicWorks: ChatMusicWork[];
  musicAwards: ChatMusicAward[];
  musicMedia: ChatMusicMedia[];
  photos: ChatPhoto[];
  albums: ChatAlbum[];
};

const pickPublicFields = async (): Promise<
  Pick<
    ChatProfileData,
    "devProjects" | "musicWorks" | "musicAwards" | "musicMedia" | "photos" | "albums"
  >
> => {
  const [{ MOCK_DEV_PROJECTS }, music, { MOCK_PHOTOS }, { MOCK_ALBUMS }] = await Promise.all([
    import("@/mocks/dev"),
    import("@/mocks/music"),
    import("@/mocks/photos"),
    import("@/mocks/albums"),
  ]);

  return {
    devProjects: MOCK_DEV_PROJECTS,
    musicWorks: music.MOCK_MUSIC_WORKS,
    musicAwards: music.MOCK_MUSIC_AWARDS,
    musicMedia: music.MOCK_MUSIC_MEDIA,
    photos: MOCK_PHOTOS,
    albums: MOCK_ALBUMS,
  };
};

const getChatProfileData = async (options?: {
  freshPublicFields?: boolean;
  source?: ContentSource;
}): Promise<ChatProfileData> => {
  const queryOptions = options?.freshPublicFields ? { fresh: true } : undefined;
  const source = options?.source ?? getContentSource();
  const [site, devConfig, musicConfig, publicFields] = await Promise.all([
    getSite(),
    getDevConfig(),
    getMusicConfig(),
    source === "mock"
      ? pickPublicFields()
      : Promise.all([
          fetchChatDevProjects(queryOptions),
          fetchChatMusicWorks(queryOptions),
          fetchChatMusicAwards(queryOptions),
          fetchChatMusicMedia(queryOptions),
          fetchChatPhotos(queryOptions),
          fetchChatAlbums(queryOptions),
        ]).then(([devProjects, musicWorks, musicAwards, musicMedia, photos, albums]) => ({
          devProjects,
          musicWorks,
          musicAwards,
          musicMedia,
          photos,
          albums,
        })),
  ]);

  return { site, devConfig, musicConfig, ...publicFields };
};

export { getChatProfileData };
export type { ChatProfileData };
