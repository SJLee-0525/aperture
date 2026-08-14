"use client";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";

import { ROUTES } from "@/constants/routes";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { loadSearchIndex } from "@/lib/search/load-search-index";
import { rankDocuments } from "@/lib/search/rank-documents";
import { clampToolText, formatToolItems } from "@/lib/webmcp/tool-output";
import {
  enumProperty,
  limitProperty,
  objectSchema,
  stringProperty,
} from "@/lib/webmcp/tool-schemas";

import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { SearchSection } from "@/types/search";
import type { SiteConfig } from "@/types/site";

/** 전역 도구에 필요한 site config 필드. */
type WebMcpProfile = Pick<SiteConfig, "name" | "tagline" | "bio">;

/**
 * 섹션별 진입 경로와 주요 하위 페이지.
 * 수상 경력을 물었을 때 `/music/career` 를 몰라 검색만 아홉 번 두드린 사례가 있었다
 * (W5 평가 3-10). 페이지 스코프 도구는 그 페이지에서만 등록되므로, 어디로 가야 하는지는
 * 전역 도구가 알려주는 수밖에 없다.
 */
const SECTION_ROUTES: Record<SearchSection, Array<{ label: string; path: string }>> = {
  photo: [
    { label: "photos", path: ROUTES.PHOTO },
    { label: "albums", path: ROUTES.PHOTO_ALBUMS },
    { label: "shooting locations", path: ROUTES.PHOTO_MAP },
    { label: "about", path: ROUTES.PHOTO_ABOUT },
  ],
  music: [
    { label: "performances", path: ROUTES.MUSIC },
    { label: "career and awards", path: ROUTES.MUSIC_CAREER },
    { label: "videos", path: ROUTES.MUSIC_MEDIA },
    { label: "about", path: ROUTES.MUSIC_ABOUT },
  ],
  dev: [
    { label: "projects", path: ROUTES.DEV_PROJECTS },
    { label: "career and tech stack", path: ROUTES.DEV_CAREER },
    { label: "blog", path: ROUTES.DEV_ARTICLES },
    { label: "about", path: ROUTES.DEV },
  ],
};

/**
 * 지원하는 섹션 인자만 반환한다.
 *
 * @param {unknown} value 에이전트가 넘긴 section 인자(검증 전).
 * @returns {value is SearchSection}
 */
const isSearchSection = (value: unknown): value is SearchSection =>
  value === "photo" || value === "music" || value === "dev";

const SEARCH_TOOL: WebMcpToolDefinition = {
  name: "search_portfolio",
  description:
    "Search all published portfolio content (photography, music performances, dev projects, " +
    "blog posts) by keyword. Returns matching items with the page path to visit. Blog posts " +
    "are part of the dev section and appear as 'dev/blog'.",
  inputSchema: objectSchema(
    {
      query: stringProperty("Keyword to search for. Korean and English both work."),
      section: enumProperty("Restrict results to one section.", ["photo", "music", "dev"]),
      limit: limitProperty(),
    },
    ["query"],
  ),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const PROFILE_TOOL: WebMcpToolDefinition = {
  name: "get_profile",
  description:
    "Get a short profile of Sungjoon Lee (photographer, pianist, frontend developer) and a " +
    "map of the site: every page of each section plus the contact page. Use this to find " +
    "which page holds what before navigating.",
  inputSchema: objectSchema({
    section: enumProperty("Focus on one section, or use 'all' for the full profile.", [
      "photo",
      "music",
      "dev",
      "all",
    ]),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

/**
 * 사이트 검색과 경로 이동을 제공하는 전역 WebMCP 도구.
 * 도구 결과와 화면 결과가 구조적으로 일치한다. 반환 경로는 항상 현재 로케일 프리픽스를
 * 유지한다(프리픽스 없는 경로는 308/307 판정을 타며 방문자 언어를 바꿔놓는다 — ADR-0002).
 *
 * @param {WebMcpProfile} profile 공개 레이아웃이 내려주는 site config 최소 투영.
 * @returns {void}
 */
const useGlobalTools = (profile: WebMcpProfile): void => {
  const { lang } = useLang();

  useModelContextTool(SEARCH_TOOL, async (args) => {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    if (!query) return "Provide a query string to search.";

    const documents = await loadSearchIndex().catch(() => null);
    if (!documents) return "Search index is unavailable right now. Try again later.";

    const section = isSearchSection(args.section) ? args.section : null;
    const pool = section ? documents.filter((document) => document.section === section) : documents;
    // 화면 검색과 같은 랭킹 함수를 사용한다.
    const ranked = rankDocuments(pool, query);
    if (ranked.length === 0) return `No results for "${query}".`;

    return formatToolItems(ranked, args.limit, (document) => {
      // subsection 이 없으면 섹션 하나가 종류를 다 설명한다. 글만 프로젝트와 같은 dev 섹션을 쓴다.
      const kind = document.subsection
        ? `${document.section}/${document.subsection}`
        : document.section;
      return `${pickText(document.title, lang)} · ${kind} · ${localizePath(lang, document.href)}`;
    });
  });

  useModelContextTool(PROFILE_TOOL, (args) => {
    const section = isSearchSection(args.section) ? args.section : null;
    const sectionLines = (section ? [section] : (Object.keys(SECTION_ROUTES) as SearchSection[]))
      .map(
        (key) =>
          `${key} — ` +
          SECTION_ROUTES[key]
            .map((page) => `${page.label}: ${localizePath(lang, page.path)}`)
            .join(", "),
      )
      .join("\n");
    // 연락 경로는 섹션 필터와 관계없이 항상 포함한다.
    // 에이전트가 /contact 로 가는 길을 어디서도 알 수 없었다(W5 평가).
    return clampToolText(
      `${pickText(profile.name, lang)} — ${pickText(profile.tagline, lang)}\n` +
        `${pickText(profile.bio, lang)}\n${sectionLines}\n` +
        `contact: ${localizePath(lang, ROUTES.CONTACT)}`,
    );
  });
};

export { useGlobalTools };
export type { WebMcpProfile };
