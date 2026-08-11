"use client";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";
import { idProperty, limitProperty, objectSchema, stringProperty } from "@/lib/webmcp/tool-schemas";
import { formatYMD } from "@/lib/format/format-date";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { resolveTargetId } from "@/lib/webmcp/current-target";
import { clampToolText, formatToolItems } from "@/lib/webmcp/tool-output";

import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { MusicAward, MusicWork } from "@/types/music";

const LIST_WORKS_TOOL: WebMcpToolDefinition = {
  name: "list_music_works",
  description:
    "List piano performances (recitals, concertos, galas), optionally filtered by category. " +
    "Returns each performance's id, date, and page path.",
  inputSchema: objectSchema({
    category: stringProperty("Category to filter by, e.g. 'recital' or '리사이틀'."),
    limit: limitProperty(),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const GET_WORK_TOOL: WebMcpToolDefinition = {
  name: "get_music_work",
  description:
    "Get one performance's program, venue, and ticket link. " +
    "Omit workId to describe the performance currently open in the detail modal.",
  inputSchema: objectSchema({
    workId: idProperty("Work id from list_music_works results. Omit for the one already open."),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const LIST_AWARDS_TOOL: WebMcpToolDefinition = {
  name: "list_music_awards",
  description: "List piano competition awards with year and the career page path.",
  inputSchema: objectSchema({ limit: limitProperty() }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

/**
 * 공연 일시 — 화면(MusicWorksView)과 같은 formatYMD 로 직렬화한다.
 * toISOString 은 UTC 변환이라 로컬 자정으로 저장된 공연일이 하루 전으로 밀린다(KST 기준).
 *
 * @param {MusicWork} work
 * @returns {string}
 */
const dateOf = (work: MusicWork): string => formatYMD(work.performedAt);

/**
 * 카테고리 매칭 — 표시 언어와 무관하게 ko·en 어느 라벨로도 부분 일치를 허용한다
 * (에이전트가 영어로 물어도 한국어 데이터에 닿아야 한다). pickText 대조는 두지 않는다 —
 * 반환값이 항상 ko 또는 en 이라 앞 두 조건의 부분집합이다.
 *
 * @param {MusicWork} work
 * @param {string} category 에이전트가 넘긴 카테고리 인자.
 * @returns {boolean}
 */
const matchesCategory = (work: MusicWork, category: string): boolean => {
  const needle = category.trim().toLowerCase();
  return (
    work.category.ko.toLowerCase().includes(needle) ||
    work.category.en.toLowerCase().includes(needle)
  );
};

/**
 * /music 연주 목록의 WebMCP 도구 2종 — MusicWorksView 안에서 마운트한다.
 *
 * @param {MusicWork[]} works 서버가 내려준 공개 연주 목록.
 * @returns {void}
 */
const useMusicWorkTools = (works: MusicWork[]): void => {
  const { lang } = useLang();

  useModelContextTool(LIST_WORKS_TOOL, (args) => {
    // 빈 카탈로그를 카테고리 불일치로 가장하지 않도록 게시 여부를 먼저 검사한다.
    if (works.length === 0) return "No performances are published yet.";

    let matched = works;
    if (typeof args.category === "string" && args.category.trim()) {
      const category = args.category;
      matched = matched.filter((work) => matchesCategory(work, category));
      if (matched.length === 0) return `No performances match category "${category}".`;
    }

    return formatToolItems(
      matched,
      args.limit,
      (work) =>
        `${pickText(work.title, lang)} · ${pickText(work.subtitle, lang)} · ${dateOf(work)} · ` +
        `${work.id} · ${localizePath(lang, `${ROUTES.MUSIC}?work=${work.id}`)}`,
    );
  });

  useModelContextTool(GET_WORK_TOOL, (args) => {
    const targetId = resolveTargetId(args.workId, "work");
    if (!targetId) return "No performance is open. Pass workId, or open one first.";
    const work = works.find((entry) => entry.id === targetId);
    if (!work) return "No performance matches that id.";
    const lines = [
      `${pickText(work.title, lang)} · ${pickText(work.subtitle, lang)}`,
      `${dateOf(work)} ${work.time} · ${pickText(work.venue, lang)} · ${pickText(work.category, lang)}`,
      work.program.length > 0 ? `Program: ${work.program.join(" / ")}` : "",
      work.ticketUrl ? `Tickets: ${work.ticketUrl}` : "",
      localizePath(lang, `${ROUTES.MUSIC}?work=${work.id}`),
    ].filter(Boolean);
    return clampToolText(lines.join("\n"));
  });
};

/**
 * /music/career 수상 목록의 WebMCP 도구 — MusicCareerView 안에서 마운트한다.
 *
 * @param {MusicAward[]} awards 서버가 내려준 공개 수상 목록.
 * @returns {void}
 */
const useMusicAwardTools = (awards: MusicAward[]): void => {
  const { lang } = useLang();

  useModelContextTool(LIST_AWARDS_TOOL, (args) => {
    if (awards.length === 0) return "No awards are published yet.";
    return formatToolItems(
      awards,
      args.limit,
      (award) =>
        `${award.year} · ${pickText(award.name, lang)} · ${award.place} · ` +
        localizePath(lang, `${ROUTES.MUSIC_CAREER}?award=${award.id}`),
    );
  });
};

export { useMusicAwardTools, useMusicWorkTools };
