import type { DevProject, DevProjectCardData } from "@/types/dev";

/** 전체 프로젝트에서 목록 렌더에 필요한 필드만 남겨 RSC 직렬화 크기를 줄인다. */
const toDevProjectCard = (project: DevProject): DevProjectCardData => ({
  id: project.id,
  title: project.title,
  category: project.category,
  year: project.year,
  summary: project.summary,
  cover: project.cover,
});

const toDevProjectCards = (projects: DevProject[]): DevProjectCardData[] =>
  projects.map(toDevProjectCard);

export { toDevProjectCard, toDevProjectCards };
