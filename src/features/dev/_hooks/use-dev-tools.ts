"use client";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";

import { devProjectRoute, ROUTES } from "@/constants/routes";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { resolveTargetId } from "@/lib/webmcp/current-target";
import { clampToolText, formatToolItems } from "@/lib/webmcp/tool-output";
import {
  idProperty,
  limitProperty,
  numberProperty,
  objectSchema,
  stringProperty,
} from "@/lib/webmcp/tool-schemas";

import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { DevAward, DevProjectCardData } from "@/types/dev";

const LIST_TOOL: WebMcpToolDefinition = {
  name: "list_projects",
  description:
    "List dev projects, optionally filtered by tech stack tag (e.g. 'React.js') or year. " +
    "Returns each project's id, summary, and page path.",
  inputSchema: objectSchema({
    tech: stringProperty(
      "Tech stack name to filter by, e.g. 'React.js'. Not a blog tag. " +
        "Case-insensitive; the '.js' suffix is optional.",
    ),
    year: numberProperty("Only projects from this year."),
    limit: limitProperty(),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const GET_TOOL: WebMcpToolDefinition = {
  name: "get_project",
  description:
    "Get one project's summary, achievements (awards, metrics) and tech stack " +
    "without opening it. " +
    "Omit projectId to describe the project currently open in the detail modal. " +
    "Use open_project instead when the visitor should see the full detail.",
  inputSchema: objectSchema({
    projectId: idProperty(
      "Project id from list_projects results. Omit for the project already open.",
    ),
  }),
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
 * 기술 태그에서 대소문자와 `.js` 접미사 차이를 제거한다.
 * 에이전트는 "React" 라고 묻는데 데이터는 "React.js" 라 정확 일치만으로는 어긋난다(W5 평가).
 * React와 React Router처럼 다른 기술이 섞이지 않도록 정확히 비교한다.
 */
const LIST_AWARDS_TOOL: WebMcpToolDefinition = {
  name: "list_dev_awards",
  description: "List development awards with year and the career page path.",
  inputSchema: objectSchema({ limit: limitProperty() }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const normalizeTech = (value: string): string => value.trim().toLowerCase().replace(/\.js$/, "");

/**
 * 정규화한 기술 태그가 정확히 일치하는지 확인한다.
 *
 * @param tech 에이전트가 넘긴 기술 태그 인자.
 */
const matchesTech = (project: DevProjectCardData, tech: string): boolean => {
  const needle = normalizeTech(tech);
  return project.techTags.some((tag) => normalizeTech(tag) === needle);
};

/**
 * 개발 프로젝트 조회와 상세 열기를 제공하는 WebMCP 도구.
 *
 * @param projects 서버 투영 프로젝트 카드(techTags 포함).
 * @param select 상세 모달을 여는 함수.
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
    // 연도 인자는 숫자와 문자열을 모두 문자열로 바꿔 비교한다.
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
    const targetId = resolveTargetId(args.projectId, "project");
    if (!targetId) return "No project is open. Pass projectId, or open a project first.";
    const project = projects.find((entry) => entry.id === targetId);
    if (!project) return "No project matches that id.";
    return clampToolText(
      [
        `${pickText(project.title, lang)} (${project.year}) · ${pickText(project.category, lang)}`,
        pickText(project.summary, lang),
        // 검색 결과에 프로젝트 성과와 수상 내역을 포함한다.
        ...project.achievements.map((item) => `- ${pickText(item, lang)}`),
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

/**
 * /dev/career 수상 목록의 WebMCP 도구 — DevCareerView 안에서 마운트한다.
 *
 * 음악 수상만 도구를 갖고 개발 수상은 없어, 같은 개념을 에이전트가 한쪽에서만 볼 수
 * 있었다. 두 섹션의 도구 이름과 출력 형태를 맞춘다.
 *
 * @param awards 서버가 내려준 공개 수상 목록.
 */
const useDevAwardTools = (awards: DevAward[]): void => {
  const { lang } = useLang();

  useModelContextTool(LIST_AWARDS_TOOL, (args) => {
    if (awards.length === 0) return "No awards are published yet.";
    return formatToolItems(awards, args.limit, (award) =>
      // 장소가 빈 수상이 있어 " · · " 로 벌어지지 않게 빈 조각을 걸러 붙인다.
      [
        String(award.year),
        pickText(award.name, lang),
        pickText(award.place, lang),
        localizePath(lang, `${ROUTES.DEV_CAREER}?award=${award.id}`),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  });
};

export { useDevAwardTools, useDevTools };
