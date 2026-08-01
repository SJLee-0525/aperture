import { unstable_cache } from "next/cache";

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { albumRoute, devProjectRoute, ROUTES } from "@/constants/routes";
import { getChatProfileData } from "@/lib/content/get-chat-profile-data";
import { pickText } from "@/lib/i18n/pick-text";
import type { ChatProfileData } from "@/lib/content/get-chat-profile-data";
import type { ChatReference, ChatReferenceRequest } from "@/types/chat";
import type { ImageMeta } from "@/types/image";
import type { Lang } from "@/types/lang";

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
  const tagById = new Map(data.site.tags.map((tag) => [tag.id, lang === "ko" ? tag.ko : tag.en]));
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
      ...publicPhotos.map(
        (photo) =>
          `Photo: ${pickText(photo.title, lang)} | place: ${pickText(photo.place, lang)} | tags: ${photo.tags.map((id) => tagById.get(id) ?? id).join(", ")} | url: ${ROUTES.PHOTO}?photo=${encodeURIComponent(photo.id)}`,
      ),
    ]),
  ].join("\n\n");
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
  async (lang: Lang) => {
    const data = await getChatProfileData();
    return {
      context: formatProfileContext(data, lang),
      references: formatProfileReferences(data, lang),
    };
  },
  ["chat-profile-context-v2"],
  { revalidate: 3_600, tags: [CHAT_PROFILE_CACHE_TAG] },
);

const buildProfileContext = async (lang: Lang): Promise<string> =>
  (await buildProfileSnapshot(lang)).context;

const resolveProfileReferences = async (
  requested: ChatReferenceRequest[],
  lang: Lang,
): Promise<ChatReference[]> => {
  const available = new Map(
    (await buildProfileSnapshot(lang)).references.map((reference) => [
      `${reference.type}:${reference.id}`,
      reference,
    ]),
  );
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
  buildProfileContext,
  formatProfileContext,
  formatProfileReferences,
  resolveProfileReferences,
};
