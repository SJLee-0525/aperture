import { describe, expect, it } from "vitest";

import { MOCK_DEV_CONFIG, MOCK_DEV_PROJECTS } from "@/mocks/dev";

describe("개발 mock 연결", () => {
  it("모든 수상 프로젝트 ID가 공개 프로젝트를 가리킨다", () => {
    const publishedProjectIds = new Set(
      MOCK_DEV_PROJECTS.filter(({ published }) => published).map(({ id }) => id),
    );

    expect(
      MOCK_DEV_CONFIG.awards.every(
        ({ projectId }) => !projectId || publishedProjectIds.has(projectId),
      ),
    ).toBe(true);
  });
});
