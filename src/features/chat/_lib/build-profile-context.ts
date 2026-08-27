import { unstable_cache } from "next/cache";

import { buildScreenContextLookup } from "@/features/chat/_lib/resolve-chat-screen-context";

import { CHAT_PROFILE_CACHE_TAG, PUBLIC_CACHE_REVALIDATE_SECONDS } from "@/constants/cache";
import { albumRoute, devArticleRoute, devProjectRoute, ROUTES } from "@/constants/routes";
import { searchRagChunks } from "@/lib/ai/rag-search";
import { getChatProfileData } from "@/lib/content/chat";
import { getContentSource, type ContentSource } from "@/lib/content/content-source";
import { formatEventYMD } from "@/lib/format/format-date";
import { pickText } from "@/lib/i18n/pick-text";

import type { ProfileSection } from "@/features/chat/_lib/chat-intent";
import type { ChatProfileData } from "@/lib/content/chat";
import type { PhotoFilterVocabulary } from "@/lib/photo/filter-query";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { ImageMeta } from "@/types/image";
import type { Lang } from "@/types/lang";
import type { RagExclude, RagPrioritize, RagQuery, StoredRagChunkMeta } from "@/types/rag";

/**
 * PROFILE_CONTEXT 에 싣는 글 수. 목록은 발행일 내림차순이라 최근 글이 남는다.
 * 참조 카드 lookup 은 이 상한을 쓰지 않는다. 오래된 글도 카드로 나갈 수 있어야 한다.
 */
const ARTICLE_CONTEXT_LIMIT = 12;

const byOrder = <T extends { order: number }>(items: T[]) =>
  items
    .filter((item) => !("published" in item) || item.published === true)
    .toSorted((a, b) => a.order - b.order);

/**
 * 프로필 문맥의 한 덩어리. 문자열 구분자로 나누지 않는다.
 *
 * 블록 경계를 `"\n\n"` 에 맡기면 관리자가 소개 글에서 Enter 를 두 번 누른 순간 값 안에
 * 같은 구분자가 들어가 섹션이 그 자리에서 쪼개진다. 뒷조각은 `##` 로 시작하지 않으니
 * 필터가 통째로 버리고, 챗봇은 연락처나 프로젝트 목록을 모른다고 답한다.
 */
type ProfileBlock = { section: string; text: string };

/** 값의 개행을 눌러 담는다. 한 줄 = 한 항목이라는 형식을 관리자 입력이 깨지 않게 한다. */
const line = (label: string, value: string) =>
  value ? `${label}: ${value.replace(/\s*\n\s*/g, " ")}` : null;

const section = (title: string, lines: Array<string | null>): ProfileBlock => ({
  section: title,
  text: [`## ${title}`, ...lines.filter((item): item is string => Boolean(item))].join("\n"),
});

const preview = (image: ImageMeta | null | undefined): ChatReference["image"] => {
  const source = image?.thumbnail ?? image?.preview ?? image;
  return source?.url ? { url: source.url, width: source.w, height: source.h } : null;
};

const formatProfileContext = (data: ChatProfileData, lang: Lang): ProfileBlock[] => {
  const tagById = new Map(data.site.tags.map((tag) => [tag.id, pickText(tag, lang)]));
  const articleTagById = new Map(data.articleTags.map((tag) => [tag.id, pickText(tag, lang)]));
  const publicProjects = byOrder(data.devProjects);
  const publicWorks = byOrder(data.musicWorks);
  const publicAwards = byOrder(data.musicAwards);
  const publicMedia = byOrder(data.musicMedia);
  const publicPhotos = byOrder(data.photos);
  const publicAlbums = byOrder(data.albums);

  return [
    { section: HEADER_SECTION, text: "# PROFILE_CONTEXT" },
    section("Profile", [
      line("Name", pickText(data.site.name, lang)),
      line("Tagline", pickText(data.site.tagline, lang)),
      line("Introduction", pickText(data.site.landingLead, lang)),
      line("Photography bio", pickText(data.site.bio, lang)),
      `Contact page: ${ROUTES.CONTACT}`,
      ...data.site.links.map((link) => `Public link: ${link.label} — ${link.href}`),
    ]),
    section("Development", [
      line("Introduction", pickText(data.devConfig.heroLead, lang)),
      line(
        "Stack",
        data.devConfig.stack
          .map((group) => `${group.category}: ${group.items.map((item) => item.name).join(", ")}`)
          .join("; "),
      ),
      ...data.devConfig.timeline.map(
        (entry) =>
          `Career: ${entry.period} — ${pickText(entry.title, lang)} / ${pickText(entry.role, lang)} / ${pickText(entry.desc, lang)}`,
      ),
      ...data.devConfig.education.map(
        (entry) => `Education: ${entry.period} — ${pickText(entry.title, lang)}`,
      ),
      ...data.devConfig.awards.map(
        (award) =>
          `Award: ${award.year} — ${pickText(award.name, lang)} / ${pickText(award.place, lang)} / ${pickText(award.description, lang)}`,
      ),
      ...publicProjects.map(
        (project) =>
          `Project: ${pickText(project.title, lang)} | ${pickText(project.summary, lang)} | role: ${pickText(project.position, lang)} | tech: ${project.techTags.join(", ")} | url: ${devProjectRoute(project.id)}`,
      ),
      // 본문은 넣지 않는다. 전문은 RAG 청크가 맡는다. 여기 있어야 하는 이유는 mock 모드에
      // 벡터 검색이 없고, 참조 카드를 만들려면 모델이 글의 경로를 볼 수 있어야 하기 때문이다.
      // 목록 전체를 실으면 프롬프트가 글 수를 따라 커지므로 최근 글까지만 넣는다.
      // 참조 카드는 문서 ID 로 조회한다. 글 주소는 slug 라 다른 섹션과 달리 ID 를 따로 적는다.
      ...data.articles
        .slice(0, ARTICLE_CONTEXT_LIMIT)
        .map(
          (article) =>
            `Article: ${pickText(article.title, lang)} | ${pickText(article.summary, lang)} | tags: ${article.tags
              .map((id) => articleTagById.get(id) ?? id)
              .join(
                ", ",
              )} | published: ${article.publishedAt ? article.publishedAt.toISOString().slice(0, 10) : "-"} | id: ${article.id} | url: ${devArticleRoute(article.slug)}`,
        ),
    ]),
    section("Music", [
      line("Introduction", pickText(data.musicConfig.intro, lang)),
      ...data.musicConfig.career.map(
        (entry) => `Career: ${entry.period} — ${pickText(entry.title, lang)}`,
      ),
      ...data.musicConfig.education.map(
        (entry) => `Education: ${entry.period} — ${pickText(entry.title, lang)}`,
      ),
      ...publicWorks.map(
        (work) =>
          `Performance: ${pickText(work.title, lang)} | ${work.performedAt.toISOString().slice(0, 10)} | ${pickText(work.venue, lang)} | program: ${work.program.join(", ")} | url: ${ROUTES.MUSIC}?work=${encodeURIComponent(work.id)}`,
      ),
      ...publicAwards.map(
        (award) =>
          `Award: ${award.year} — ${pickText(award.name, lang)} / ${award.place} | url: ${ROUTES.MUSIC_CAREER}?award=${encodeURIComponent(award.id)}`,
      ),
      ...publicMedia.map(
        (item) =>
          `Media: ${pickText(item.title, lang)} — ${pickText(item.source, lang)} | url: ${ROUTES.MUSIC_MEDIA}`,
      ),
    ]),
    section("Photography", [
      `Work page: ${ROUTES.PHOTO}`,
      `Albums page: ${ROUTES.PHOTO_ALBUMS}`,
      `Map page: ${ROUTES.PHOTO_MAP}`,
      ...publicAlbums.map(
        (album) =>
          `Album: ${pickText(album.title, lang)} — ${pickText(album.subtitle, lang)} | url: ${albumRoute(album.id)}`,
      ),
      ...publicPhotos.map((photo) =>
        [
          `Photo: ${pickText(photo.title, lang)}`,
          photo.camera ? `camera: ${photo.camera}` : null,
          photo.lens ? `lens: ${photo.lens}` : null,
          `place: ${pickText(photo.place, lang)}`,
          `tags: ${photo.tags.map((id) => tagById.get(id) ?? id).join(", ")}`,
          `url: ${ROUTES.PHOTO}?photo=${encodeURIComponent(photo.id)}`,
        ]
          .filter(Boolean)
          .join(" | "),
      ),
    ]),
  ];
};

/** 섹션 필터가 항상 남기는 머리글 블록. 프롬프트가 문맥의 시작을 이 줄로 식별한다. */
const HEADER_SECTION = "__header__";

const PROFILE_SECTION_TITLES: Record<ProfileSection, string> = {
  profile: "Profile",
  development: "Development",
  music: "Music",
  photography: "Photography",
};

/**
 * 의도 분류가 고른 섹션만 남긴다. 블록 배열을 다루므로 값 안의 개행이 경계에 영향을 주지 않는다.
 *
 * @param {ProfileBlock[]} blocks 전체 프로필 블록.
 * @param {ProfileSection[]} sections 남길 섹션.
 * @returns {ProfileBlock[]} 머리글과 선택된 섹션.
 */
const selectProfileBlocks = (
  blocks: ProfileBlock[],
  sections: ProfileSection[],
): ProfileBlock[] => {
  const titles = new Set(sections.map((name) => PROFILE_SECTION_TITLES[name]));
  return blocks.filter(
    (block) => block.section === HEADER_SECTION || titles.has(block.section),
  );
};

/** 프롬프트에 실을 문자열로 합친다. 블록을 문자열로 되돌리는 곳은 여기 하나다. */
const renderProfileBlocks = (blocks: ProfileBlock[]): string =>
  blocks.map((block) => block.text).join("\n\n");

/**
 * 사진 링크의 query를 검증할 공개 태그, 카메라, 사진 id를 만든다.
 *
 * @param {ChatProfileData} data 공개 채팅 데이터.
 * @returns {PhotoFilterVocabulary} 사진 링크 검증용 어휘.
 */
const formatLinkVocabulary = (data: ChatProfileData): PhotoFilterVocabulary => {
  const publicPhotos = byOrder(data.photos);
  return {
    tags: data.site.tags,
    cameras: [...new Set(publicPhotos.map((photo) => photo.camera.trim()).filter(Boolean))],
    photoIds: publicPhotos.map((photo) => photo.id),
  };
};

const formatProfileReferences = (data: ChatProfileData, lang: Lang): ChatReference[] => [
  ...byOrder(data.photos).map((photo) => ({
    type: "photo" as const,
    id: photo.id,
    title: pickText(photo.title, lang),
    subtitle: pickText(photo.place, lang),
    href: `${ROUTES.PHOTO}?photo=${encodeURIComponent(photo.id)}`,
    image: preview(photo.image),
  })),
  ...byOrder(data.musicWorks).map((work) => ({
    type: "music" as const,
    id: work.id,
    title: pickText(work.title, lang),
    subtitle: pickText(work.venue, lang),
    href: `${ROUTES.MUSIC}?work=${encodeURIComponent(work.id)}`,
    image: preview(work.poster),
  })),
  ...byOrder(data.devProjects).map((project) => ({
    type: "project" as const,
    id: project.id,
    title: pickText(project.title, lang),
    subtitle: pickText(project.summary, lang),
    href: devProjectRoute(project.id),
    image: preview(project.cover),
  })),
  // 글 목록은 이미 발행일 순으로 정렬돼 있다(`getChatProfileData`). 블로그에는 `order` 가 없다.
  ...data.articles.map((article) => ({
    type: "article" as const,
    id: article.id,
    title: pickText(article.title, lang),
    // 카드에는 부제 한 줄뿐이라 발행일과 요약을 한 자리에 담는다.
    subtitle: article.publishedAt
      ? `${formatEventYMD(article.publishedAt)} · ${pickText(article.summary, lang)}`
      : pickText(article.summary, lang),
    href: devArticleRoute(article.slug),
    image: preview(article.cover),
  })),
];

const buildProfileSnapshot = unstable_cache(
  async (lang: Lang, source: ContentSource) => {
    const data = await getChatProfileData({ source });
    return {
      context: formatProfileContext(data, lang),
      references: formatProfileReferences(data, lang),
      screenLookup: buildScreenContextLookup(data, lang),
      linkVocabulary: formatLinkVocabulary(data),
      // 글 화면 문맥은 URL 의 slug 와 문서 ID 를 맞춰 봐야 한다. mock 검증이 쓰는 대조표다.
      articleSlugById: Object.fromEntries(
        data.articles.map((article) => [article.id, article.slug]),
      ),
    };
  },
  // 반환 구조나 공개 projection이 바뀌면 이 키의 버전도 올린다.
  // v5: shotAt·exif·achievements projection + 화면 문맥 screenLookup 추가.
  // v6: 링크 검증용 linkVocabulary 추가.
  // v7: 블로그 글 projection · article 참조 카드 · article 화면 문맥 추가.
  // v8: 글 목록 상한(최근 12건) · 글 줄에 문서 ID 표기.
  // v9: context 가 문자열에서 섹션 블록 배열로 바뀜.
  ["chat-profile-context-v9-content-source"],
  { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS, tags: [CHAT_PROFILE_CACHE_TAG] },
);

/** 요청 안에서 공유하는 언어별 프로필 스냅샷. */
type ProfileSnapshot = Awaited<ReturnType<typeof buildProfileSnapshot>>;

/**
 * 캐시된 언어별 프로필 스냅샷을 읽는다.
 *
 * @param {Lang} lang 프로필을 표시할 언어.
 * @param {ContentSource} source mock 또는 live 콘텐츠 소스.
 * @returns {Promise<ProfileSnapshot>} 캐시된 프로필 스냅샷.
 */
const loadProfileSnapshot = (lang: Lang, source: ContentSource): Promise<ProfileSnapshot> =>
  buildProfileSnapshot(lang, source);

const appendRagChunks = (blocks: ProfileBlock[], chunks: StoredRagChunkMeta[]): ProfileBlock[] => {
  if (chunks.length === 0) return blocks;
  return [
    ...blocks,
    section(
      "Highly Relevant Portfolio Context (Vector Search)",
      chunks.map((item) => `[${item.sourceType}:${item.sourceId}] ${item.text}`),
    ),
  ];
};

/**
 * RAG 로그에 실을 질의 정보.
 *
 * 프로덕션에서는 질의 원문을 남기지 않는다. 개인정보처리방침이 고지한 호스팅 로그 항목은
 * IP, 요청 시각, 요청 경로, 사용자 에이전트뿐이고 방문자가 챗에 적은 내용은 그 목록에 없다.
 * 검색 누락은 `chunks=0` 빈도로 탐지하고, 어떤 질의였는지는 개발 환경에서 재현해 확인한다.
 */
const ragQueryLogFields = (query: RagQuery): string =>
  process.env.NODE_ENV === "production"
    ? `queryLen=${query.text.length} keywordCount=${query.keywords?.length ?? 0}`
    : `query=${JSON.stringify(query.text)} keywords=${JSON.stringify(query.keywords ?? [])}`;

/**
 * 캐시된 프로필에서 필요한 섹션을 고르고 관련 RAG 청크를 덧붙인다.
 *
 * @param {() => Promise<ProfileSnapshot>} getSnapshot 요청 안에서 공유하는 스냅샷 로더.
 * @param {ProfileSection[] | undefined} sections 답변에 필요한 프로필 섹션.
 * @param {RagQuery | undefined} query 벡터 검색에 사용할 질의.
 * @param {AbortSignal | undefined} signal 요청 취소 신호.
 * @param {RagPrioritize | undefined} prioritize 방문자가 열어 둔 원본. 그 청크를 먼저 채운다.
 * @returns {Promise<string>} provider에 전달할 프로필 문맥.
 */
const buildProfileContextFromSnapshot = async (
  getSnapshot: () => Promise<ProfileSnapshot>,
  sections?: ProfileSection[],
  query?: RagQuery,
  signal?: AbortSignal,
  prioritize?: RagPrioritize,
  exclude?: RagExclude,
): Promise<string> => {
  const source = getContentSource();
  const blocks = (await getSnapshot()).context;
  // 벡터 검색 결과가 없어도 섹션 요약은 유지한다.
  const selected = sections?.length ? selectProfileBlocks(blocks, sections) : blocks;

  if (source === "live" && sections?.length && query?.text) {
    try {
      const relevant = await searchRagChunks(query, sections, signal, { prioritize, exclude });
      // chunks=0과 우선 검색 대상을 Vercel 로그에 남겨 검색 누락을 확인한다.
      console.info(
        `[chat-rag] sections=${sections.join(",")} ${ragQueryLogFields(query)} prioritize=${prioritize ? `${prioritize.sourceType}:${prioritize.sourceId}` : "none"} exclude=${exclude ? `${exclude.sourceType}:${exclude.sourceId}` : "none"} chunks=${relevant.length}`,
      );
      return renderProfileBlocks(appendRagChunks(selected, relevant));
    } catch (error) {
      console.warn("RAG vector search failed during context build:", error);
    }
  }

  return renderProfileBlocks(selected);
};

const resolveReferencesWithRefresh = async (
  requested: ChatReferenceRequest[],
  cachedReferences: ChatReference[],
  loadFreshReferences?: () => Promise<ChatReference[]>,
): Promise<ChatReference[]> => {
  const requestedKeys = requested.map(({ type, id }) => `${type}:${id}`);
  let available = new Map(
    cachedReferences.map((reference) => [`${reference.type}:${reference.id}`, reference]),
  );
  if (loadFreshReferences && requestedKeys.some((key) => !available.has(key))) {
    available = new Map(
      (await loadFreshReferences()).map((reference) => [
        `${reference.type}:${reference.id}`,
        reference,
      ]),
    );
  }
  const seen = new Set<string>();

  return requested.slice(0, 3).flatMap((reference) => {
    const key = `${reference.type}:${reference.id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const resolved = available.get(key);
    return resolved ? [resolved] : [];
  });
};

export {
  appendRagChunks,
  buildProfileContextFromSnapshot,
  formatLinkVocabulary,
  formatProfileContext,
  formatProfileReferences,
  loadProfileSnapshot,
  renderProfileBlocks,
  resolveReferencesWithRefresh,
  selectProfileBlocks,
};
export type { ProfileBlock, ProfileSnapshot };
