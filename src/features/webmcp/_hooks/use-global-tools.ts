"use client";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";
import {
  enumProperty,
  limitProperty,
  objectSchema,
  stringProperty,
} from "@/lib/webmcp/tool-schemas";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { loadSearchIndex } from "@/lib/search/load-search-index";
import { rankDocuments } from "@/lib/search/rank-documents";
import { clampToolText, formatToolItems } from "@/lib/webmcp/tool-output";

import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { SearchSection } from "@/types/search";
import type { SiteConfig } from "@/types/site";

/** 전역 도구가 쓰는 site config 최소 투영 — 레이아웃이 이미 내려주는 필드만. */
type WebMcpProfile = Pick<SiteConfig, "name" | "tagline" | "bio">;

/** 섹션별 대표 진입 경로 — 랜딩 허브와 같은 목적지(개발은 프로젝트가 대표 콘텐츠). */
const SECTION_ROUTES: Record<SearchSection, string> = {
  photo: ROUTES.PHOTO,
  music: ROUTES.MUSIC,
  dev: ROUTES.DEV_PROJECTS,
};

/**
 * 섹션 인자 검증 — 미지의 값은 "필터 없음"으로 조용히 처리한다.
 *
 * @param {unknown} value 에이전트가 넘긴 section 인자(검증 전).
 * @returns {value is SearchSection}
 */
const isSearchSection = (value: unknown): value is SearchSection =>
  value === "photo" || value === "music" || value === "dev";

const SEARCH_TOOL: WebMcpToolDefinition = {
  name: "search_portfolio",
  description:
    "Search all published portfolio content (photography, music performances, dev projects) " +
    "by keyword. Returns matching items with the page path to visit.",
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
    "Get a short profile of Sungjoon Lee (photographer, pianist, frontend developer), " +
    "the entry path of each portfolio section, and the contact page path.",
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
 * 전역 WebMCP 도구 2종 — 검색은 헤더 자동완성·/search 와 같은 인덱스와 채점기를 재사용해
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
    // 자동완성·/search 와 같은 공유 랭킹(rank-documents) — 도구용 재구현 금지.
    const ranked = rankDocuments(pool, query);
    if (ranked.length === 0) return `No results for "${query}".`;

    return formatToolItems(
      ranked,
      args.limit,
      (document) =>
        `${pickText(document.title, lang)} · ${document.section} · ${localizePath(lang, document.href)}`,
    );
  });

  useModelContextTool(PROFILE_TOOL, (args) => {
    const section = isSearchSection(args.section) ? args.section : null;
    const sectionLines = (section ? [section] : (Object.keys(SECTION_ROUTES) as SearchSection[]))
      .map((key) => `${key}: ${localizePath(lang, SECTION_ROUTES[key])}`)
      .join("\n");
    // 연락 경로는 섹션 필터와 무관하게 항상 붙인다 — 다른 페이지에서 "연락하고 싶어" 라고 하면
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
