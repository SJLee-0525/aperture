import type { DevProject, DevProjectCardData } from "@/types/dev";

/**
 * 전체 프로젝트에서 목록 렌더에 필요한 필드만 남겨 RSC 직렬화 크기를 줄인다.
 *
 * @param {DevProject} project
 * @returns {DevProjectCardData}
 */
const toDevProjectCard = (project: DevProject): DevProjectCardData => ({
  id: project.id,
  title: project.title,
  category: project.category,
  year: project.year,
  summary: project.summary,
  cover: project.cover,
  techTags: project.techTags,
  achievements: project.achievements,
});

const toDevProjectCards = (projects: DevProject[]): DevProjectCardData[] =>
  projects.map(toDevProjectCard);

/**
 * 지정한 순서대로 프로젝트 카드를 만든다. 글의 연관 프로젝트 목록이 쓴다.
 * 공개 목록에 없는 프로젝트(비공개·삭제)는 빠진다.
 *
 * @param ids 화면에 놓을 순서.
 * @param projects 공개 프로젝트 전체.
 */
const toDevProjectCardsByIds = (
  ids: readonly string[],
  projects: DevProject[],
): DevProjectCardData[] => {
  const cardById = new Map(toDevProjectCards(projects).map((card) => [card.id, card]));
  return ids.map((id) => cardById.get(id)).filter((card) => card !== undefined);
};

export { toDevProjectCard, toDevProjectCards, toDevProjectCardsByIds };
