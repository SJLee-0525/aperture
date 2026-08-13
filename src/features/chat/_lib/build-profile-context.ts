import { unstable_cache } from "next/cache";

import { buildScreenContextLookup } from "@/features/chat/_lib/resolve-chat-screen-context";

import { CHAT_PROFILE_CACHE_TAG, PUBLIC_CACHE_REVALIDATE_SECONDS } from "@/constants/cache";
import { albumRoute, devProjectRoute, ROUTES } from "@/constants/routes";
import { searchRagChunks } from "@/lib/ai/rag-search";
import { getChatProfileData } from "@/lib/content/chat";
import { getContentSource, type ContentSource } from "@/lib/content/content-source";
import { pickText } from "@/lib/i18n/pick-text";

import type { ProfileSection } from "@/features/chat/_lib/chat-intent";
import type { ChatProfileData } from "@/lib/content/chat";
import type { PhotoFilterVocabulary } from "@/lib/photo-filter-query";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { ImageMeta } from "@/types/image";
import type { Lang } from "@/types/lang";
import type { RagQuery, StoredRagChunkMeta } from "@/types/rag";

const byOrder = <T extends { order: number }>(items: T[]) =>
  items
    .filter((item) => !("published" in item) || item.published === true)
    .toSorted((a, b) => a.order - b.order);

const line = (label: string, value: string) => (value ? `${label}: ${value}` : null);
const section = (title: string, lines: Array<string | null>) =>
  [`## ${title}`, ...lines.filter((item): item is string => Boolean(item))].join("\n");

const preview = (image: ImageMeta | null | undefined): ChatReference["image"] => {
  const source = image?.thumbnail ?? image?.preview ?? image;
  return source?.url ? { url: source.url, width: source.w, height: source.h } : null;
};

const formatProfileContext = (data: ChatProfileData, lang: Lang): string => {
  const tagById = new Map(data.site.tags.map((tag) => [tag.id, pickText(tag, lang)]));
  const publicProjects = byOrder(data.devProjects);
  const publicWorks = byOrder(data.musicWorks);
  const publicAwards = byOrder(data.musicAwards);
  const publicMedia = byOrder(data.musicMedia);
  const publicPhotos = byOrder(data.photos);
  const publicAlbums = byOrder(data.albums);

  return [
    "# PROFILE_CONTEXT",
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
  ].join("\n\n");
};

const PROFILE_SECTION_TITLES: Record<ProfileSection, string> = {
  profile: "Profile",
  development: "Development",
  music: "Music",
  photography: "Photography",
};

const selectFormattedProfileContext = (context: string, sections: ProfileSection[]): string => {
  const headings = new Set(
    sections.map((sectionName) => `## ${PROFILE_SECTION_TITLES[sectionName]}`),
  );
  return context
    .split("\n\n")
    .filter(
      (block) => block.startsWith("# PROFILE_CONTEXT") || headings.has(block.split("\n")[0] ?? ""),
    )
    .join("\n\n");
};

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
];

const buildProfileSnapshot = unstable_cache(
  async (lang: Lang, source: ContentSource) => {
    const data = await getChatProfileData({ source });
    return {
      context: formatProfileContext(data, lang),
      references: formatProfileReferences(data, lang),
      screenLookup: buildScreenContextLookup(data, lang),
      linkVocabulary: formatLinkVocabulary(data),
    };
  },
  // 반환 구조나 공개 projection이 바뀌면 이 키의 버전도 올린다.
  // v5: shotAt·exif·achievements projection + 화면 문맥 screenLookup 추가.
  // v6: 링크 검증용 linkVocabulary 추가.
  ["chat-profile-context-v6-content-source"],
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

const appendRagChunks = (baseContext: string, chunks: StoredRagChunkMeta[]): string => {
  if (chunks.length === 0) return baseContext;
  return `${baseContext}\n\n${section(
    "Highly Relevant Portfolio Context (Vector Search)",
    chunks.map((item) => `[${item.sourceType}:${item.sourceId}] ${item.text}`),
  )}`;
};

/**
 * 캐시된 프로필에서 필요한 섹션을 고르고 관련 RAG 청크를 덧붙인다.
 *
 * @param {() => Promise<ProfileSnapshot>} getSnapshot 요청 안에서 공유하는 스냅샷 로더.
 * @param {ProfileSection[] | undefined} sections 답변에 필요한 프로필 섹션.
 * @param {RagQuery | undefined} query 벡터 검색에 사용할 질의.
 * @param {AbortSignal | undefined} signal 요청 취소 신호.
 * @returns {Promise<string>} provider에 전달할 프로필 문맥.
 */
const buildProfileContextFromSnapshot = async (
  getSnapshot: () => Promise<ProfileSnapshot>,
  sections?: ProfileSection[],
  query?: RagQuery,
  signal?: AbortSignal,
): Promise<string> => {
  const source = getContentSource();
  const context = (await getSnapshot()).context;
  // 벡터 검색 결과가 없어도 섹션 요약은 유지한다.
  const formatted = sections?.length ? selectFormattedProfileContext(context, sections) : context;

  if (source === "live" && sections?.length && query?.text) {
    try {
      const relevant = await searchRagChunks(query, sections, signal);
      // chunks=0을 Vercel 로그에 남겨 검색 누락을 확인한다.
      console.info(
        `[chat-rag] sections=${sections.join(",")} query=${JSON.stringify(query.text)} keywords=${JSON.stringify(query.keywords ?? [])} chunks=${relevant.length}`,
      );
      return appendRagChunks(formatted, relevant);
    } catch (error) {
      console.warn("RAG vector search failed during context build:", error);
    }
  }

  return formatted;
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
  resolveReferencesWithRefresh,
  selectFormattedProfileContext,
};
export type { ProfileSnapshot };
