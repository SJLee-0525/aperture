import { compareByPublishedAtDesc } from "@/lib/content/article-order";
import { getContentSource, type ContentSource } from "@/lib/content/content-source";
import { getDevConfig } from "@/lib/content/dev";
import { getDevArticleTags } from "@/lib/content/dev-articles";
import { publishedInOrder } from "@/lib/content/mock-list";
import { getMusicConfig } from "@/lib/content/music";
import { getSite } from "@/lib/content/site";
import { fetchChatDevProjects } from "@/lib/supabase/public/dev";
import { fetchChatDevArticles } from "@/lib/supabase/public/dev-articles";
import {
  fetchChatMusicAwards,
  fetchChatMusicMedia,
  fetchChatMusicWorks,
} from "@/lib/supabase/public/music";
import { fetchChatAlbums, fetchChatPhotos } from "@/lib/supabase/public/photo";

import type { ChatDevProject } from "@/lib/supabase/public/dev";
import type { ChatDevArticle } from "@/lib/supabase/public/dev-articles";
import type { ChatMusicAward, ChatMusicMedia, ChatMusicWork } from "@/lib/supabase/public/music";
import type { ChatAlbum, ChatPhoto } from "@/lib/supabase/public/photo";
import type { DevConfig } from "@/types/dev";
import type { DevArticleTag } from "@/types/dev-article-tag";
import type { MusicConfig } from "@/types/music";
import type { SiteConfig } from "@/types/site";

// 투영 타입은 디코더와 같은 층(`lib/supabase/public/*`)에서 한 번만 선언한다.
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
  articles: ChatDevArticle[];
  /** 글에는 태그 id 만 저장된다. 라벨은 여기서 찾는다. */
  articleTags: DevArticleTag[];
};

const pickPublicFields = async (): Promise<
  Pick<
    ChatProfileData,
    "devProjects" | "musicWorks" | "musicAwards" | "musicMedia" | "photos" | "albums" | "articles"
  >
> => {
  const [{ MOCK_DEV_PROJECTS }, music, { MOCK_PHOTOS }, { MOCK_ALBUMS }, { MOCK_DEV_ARTICLES }] =
    await Promise.all([
      import("@/mocks/dev"),
      import("@/mocks/music"),
      import("@/mocks/photos"),
      import("@/mocks/albums"),
      import("@/mocks/dev-articles"),
    ]);

  return {
    devProjects: publishedInOrder(MOCK_DEV_PROJECTS),
    musicWorks: publishedInOrder(music.MOCK_MUSIC_WORKS),
    musicAwards: publishedInOrder(music.MOCK_MUSIC_AWARDS),
    musicMedia: publishedInOrder(music.MOCK_MUSIC_MEDIA),
    photos: publishedInOrder(MOCK_PHOTOS),
    albums: publishedInOrder(MOCK_ALBUMS),
    // 글은 order 가 아니라 발행일 정렬이라 공용 헬퍼를 쓰지 않는다.
    articles: MOCK_DEV_ARTICLES.filter(({ published }) => published)
      .map(({ id, slug, title, summary, cover, tags, publishedAt }) => ({
        id,
        slug,
        title,
        summary,
        cover,
        tags,
        publishedAt,
      }))
      .sort(compareByPublishedAtDesc),
  };
};

const getChatProfileData = async (options?: {
  freshPublicFields?: boolean;
  source?: ContentSource;
}): Promise<ChatProfileData> => {
  const queryOptions = options?.freshPublicFields ? { fresh: true } : undefined;
  const source = options?.source ?? getContentSource();
  const [site, devConfig, musicConfig, articleTags, publicFields] = await Promise.all([
    getSite(),
    getDevConfig(),
    getMusicConfig(),
    getDevArticleTags(),
    source === "mock"
      ? pickPublicFields()
      : Promise.all([
          fetchChatDevProjects(queryOptions),
          fetchChatMusicWorks(queryOptions),
          fetchChatMusicAwards(queryOptions),
          fetchChatMusicMedia(queryOptions),
          fetchChatPhotos(queryOptions),
          fetchChatAlbums(queryOptions),
          fetchChatDevArticles(queryOptions),
        ]).then(([devProjects, musicWorks, musicAwards, musicMedia, photos, albums, articles]) => ({
          devProjects,
          musicWorks,
          musicAwards,
          musicMedia,
          photos,
          albums,
          // live 는 PostgREST 쿼리(`published_at desc nullslast, id asc`)가 순서를 마쳐 온다.
          articles,
        })),
  ]);

  return { site, devConfig, musicConfig, articleTags, ...publicFields };
};

export { getChatProfileData };
export type { ChatDevArticle, ChatProfileData };
