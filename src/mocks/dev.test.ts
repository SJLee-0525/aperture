import { describe, expect, it } from "vitest";

import { getDevProject, getDevProjects } from "@/lib/content/dev";

import { MOCK_DEV_CONFIG, MOCK_DEV_PROJECT_DETAILS, MOCK_DEV_PROJECTS } from "@/mocks/dev";

describe("개발 mock 연결", () => {
  it("모든 수상 프로젝트 ID가 조회 가능한 프로젝트를 가리킨다", () => {
    const publishedProjectIds = new Set(
      [...MOCK_DEV_PROJECTS, ...MOCK_DEV_PROJECT_DETAILS]
        .filter(({ published }) => published)
        .map(({ id }) => id),
    );

    expect(
      MOCK_DEV_CONFIG.awards.every(
        ({ projectId }) => !projectId || publishedProjectIds.has(projectId),
      ),
    ).toBe(true);
  });

  it("수상 상세 fixture는 공개 목록을 늘리지 않고 ID로 조회된다", async () => {
    const projects = await getDevProjects();
    const detailProjectIds = new Set(MOCK_DEV_PROJECT_DETAILS.map(({ id }) => id));

    expect(projects.every(({ id }) => !detailProjectIds.has(id))).toBe(true);
    await expect(getDevProject("recipedia")).resolves.toMatchObject({
      id: "recipedia",
      published: true,
    });
  });
});
