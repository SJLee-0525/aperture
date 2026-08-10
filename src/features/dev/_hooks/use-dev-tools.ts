"use client";

import { devProjectRoute } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";
import {
  idProperty,
  limitProperty,
  numberProperty,
  objectSchema,
  stringProperty,
} from "@/lib/webmcp/tool-schemas";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { clampToolText, formatToolItems } from "@/lib/webmcp/tool-output";

import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { DevProjectCardData } from "@/types/dev";

const LIST_TOOL: WebMcpToolDefinition = {
  name: "list_projects",
  description:
    "List dev projects, optionally filtered by tech stack tag (e.g. 'React') or year. " +
    "Returns each project's id, summary, and page path.",
  inputSchema: objectSchema({
    tech: stringProperty("Tech tag to filter by, matched case-insensitively (e.g. 'React')."),
    year: numberProperty("Only projects from this year."),
    limit: limitProperty(),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const GET_TOOL: WebMcpToolDefinition = {
  name: "get_project",
  description:
    "Get one project's summary and tech stack without opening it. " +
    "Use open_project instead when the visitor should see the full detail.",
  inputSchema: objectSchema({ projectId: idProperty("Project id from list_projects results.") }, [
    "projectId",
  ]),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const OPEN_TOOL: WebMcpToolDefinition = {
  name: "open_project",
  description: "Open one project in the detail modal so the visitor can see it.",
  inputSchema: objectSchema({ projectId: idProperty("Project id from list_projects results.") }, [
    "projectId",
  ]),
  annotations: { readOnlyHint: false, untrustedContentHint: false },
};

/**
 * 기술 태그 매칭 — 대소문자 무시 정확 일치(부분 일치는 "React"↔"React Native" 혼동을 만든다).
 *
 * @param {DevProjectCardData} project
 * @param {string} tech 에이전트가 넘긴 기술 태그 인자.
 * @returns {boolean}
 */
const matchesTech = (project: DevProjectCardData, tech: string): boolean => {
  const needle = tech.trim().toLowerCase();
  return project.techTags.some((tag) => tag.toLowerCase() === needle);
};

/**
 * /dev/projects 의 WebMCP 도구 3종 — DevProjectsView 안(useQueryModal 곁)에서 마운트한다.
 * open_project 는 뷰의 `select` 를 그대로 호출해 화면 클릭과 같은 경로(?project= 딥링크)로 연다.
 *
 * @param {DevProjectCardData[]} projects 서버 투영 프로젝트 카드(techTags 포함).
 * @param {(id: string | null) => void} select useQueryModal 의 select — 상세 모달 열기.
 * @returns {void}
 */
const useDevTools = (projects: DevProjectCardData[], select: (id: string | null) => void): void => {
  const { lang } = useLang();

  useModelContextTool(LIST_TOOL, (args) => {
    let matched = projects;
    if (typeof args.tech === "string" && args.tech.trim()) {
      const tech = args.tech;
      matched = matched.filter((project) => matchesTech(project, tech));
      if (matched.length === 0) {
        const known = [...new Set(projects.flatMap((project) => project.techTags))];
        return `No projects use "${tech}". Known tech tags: ${known.join(", ")}.`;
      }
    }
    // year 는 데이터상 문자열("2025") — 숫자·문자열 인자를 모두 받아 문자열로 비교한다.
    if (typeof args.year === "number" || (typeof args.year === "string" && args.year.trim())) {
      const year = String(args.year);
      matched = matched.filter((project) => project.year === year);
    }
    if (matched.length === 0) return "No projects match.";

    return formatToolItems(
      matched,
      args.limit,
      (project) =>
        `${pickText(project.title, lang)} (${project.year}) · ${pickText(project.category, lang)} · ` +
        `${project.id} · ${localizePath(lang, devProjectRoute(project.id))}`,
    );
  });

  useModelContextTool(GET_TOOL, (args) => {
    const project = projects.find((entry) => entry.id === args.projectId);
    if (!project) return "No project matches that id.";
    return clampToolText(
      [
        `${pickText(project.title, lang)} (${project.year}) · ${pickText(project.category, lang)}`,
        pickText(project.summary, lang),
        `Tech: ${project.techTags.join(", ")}`,
        localizePath(lang, devProjectRoute(project.id)),
      ].join("\n"),
    );
  });

  useModelContextTool(OPEN_TOOL, (args) => {
    const project = projects.find((entry) => entry.id === args.projectId);
    if (!project) return "No project matches that id.";
    select(project.id);
    return `Opened project "${pickText(project.title, lang)}".`;
  });
};

export { useDevTools };
