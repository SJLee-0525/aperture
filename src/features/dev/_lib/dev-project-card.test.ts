import { describe, expect, it } from "vitest";

import { toDevProjectCard } from "@/features/dev/_lib/dev-project-card";
import { MOCK_DEV_PROJECTS } from "@/mocks/dev";

describe("toDevProjectCard", () => {
  it("목록에 필요한 필드만 투영하고 상세 필드는 직렬화하지 않는다", () => {
    const project = MOCK_DEV_PROJECTS[0];
    const card = toDevProjectCard(project);

    expect(card).toEqual({
      id: project.id,
      title: project.title,
      category: project.category,
      year: project.year,
      summary: project.summary,
      cover: project.cover,
      // WebMCP list_projects 의 기술 필터용 — 평면 문자열 배열이라 직렬화 부담이 작다.
      techTags: project.techTags,
    });
    expect(card).not.toHaveProperty("overview");
    expect(card).not.toHaveProperty("features");
    expect(card).not.toHaveProperty("troubleshooting");
    expect(card).not.toHaveProperty("images");
  });
});
