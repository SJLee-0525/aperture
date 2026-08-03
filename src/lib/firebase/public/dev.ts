import { COLLECTIONS, SITE_DEV_DOC } from "@/constants/collections";

import { normalizeDevAwards } from "@/lib/firebase/normalize-dev-awards";
import { normalizeTroubleshooting } from "@/lib/firebase/normalize-troubleshooting";
import {
  fetchDocument,
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  runQuery,
} from "@/lib/firebase/public/transport";
import { asText } from "@/lib/i18n/as-text";

import type { DevConfig, DevProject } from "@/types/dev";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

type ChatDevProject = Pick<
  DevProject,
  "id" | "title" | "summary" | "position" | "techTags" | "cover" | "order" | "published"
>;

const toDevProject = (id: string, data: Record<string, unknown>): DevProject => ({
  id,
  title: asText(data.title),
  category: asText(data.category),
  year: (data.year as string) ?? "",
  period: asText(data.period),
  position: asText(data.position),
  summary: asText(data.summary),
  overview: asText(data.overview),
  features: (data.features as LocalizedText[]) ?? [],
  roles: (data.roles as LocalizedText[]) ?? [],
  troubleshooting: normalizeTroubleshooting(data.troubleshooting),
  achievements: (data.achievements as LocalizedText[]) ?? [],
  techTags: (data.techTags as string[]) ?? [],
  links: (data.links as SiteLink[]) ?? [],
  cover: (data.cover as ImageMeta | null) ?? null,
  images: (data.images as ImageMeta[]) ?? [],
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const fetchPublishedDevProjects = async (): Promise<DevProject[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.DEV_PROJECTS))).map(({ id, data }) =>
    toDevProject(id, data),
  );

const fetchDevConfig = async (): Promise<DevConfig | null> => {
  const data = await fetchDocument(COLLECTIONS.SITE, SITE_DEV_DOC, "dev config");
  if (!data) return null;
  return {
    heroLead: asText(data.heroLead),
    interview: (data.interview as DevConfig["interview"]) ?? [],
    stack: (data.stack as DevConfig["stack"]) ?? [],
    education: (data.education as DevConfig["education"]) ?? [],
    timeline: (data.timeline as DevConfig["timeline"]) ?? [],
    awards: normalizeDevAwards(data.awards),
  };
};

const fetchChatDevProjects = async (options?: { fresh?: boolean }): Promise<ChatDevProject[]> =>
  (
    await runQuery(
      projectedPublishedOrderedQuery(COLLECTIONS.DEV_PROJECTS, [
        "title",
        "summary",
        "position",
        "techTags",
        "cover",
        "order",
        "published",
      ]),
      options,
    )
  ).map(({ id, data }) => {
    const project = toDevProject(id, data);
    return {
      id: project.id,
      title: project.title,
      summary: project.summary,
      position: project.position,
      techTags: project.techTags,
      cover: project.cover,
      order: project.order,
      published: project.published,
    };
  });

export { fetchChatDevProjects, fetchDevConfig, fetchPublishedDevProjects };
