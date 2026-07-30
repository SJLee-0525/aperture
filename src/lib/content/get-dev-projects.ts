import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchPublishedDevProjects } from "@/lib/firebase/firestore-rest";
import type { DevProject } from "@/types/dev";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬.
 *  mock 데이터는 이 시점에 동적 로드 — 실데이터 경로에서는 로드하지 않는다. */
const mockProjects = async (): Promise<DevProject[]> => {
  const { MOCK_DEV_PROJECTS } = await import("@/mocks/dev");
  return MOCK_DEV_PROJECTS.filter((project) => project.published).sort((a, b) => a.order - b.order);
};

/**
 * 공개 프로젝트 목록 — published 필터 + order 정렬 완료 상태.
 * Firebase 설정 시 항상 실데이터(빈 컬렉션이면 빈 배열). mock 은 env 미설정일 때만.
 */
const getDevProjects = async (): Promise<DevProject[]> => {
  if (shouldUseMockContent()) return mockProjects();
  return fetchPublishedDevProjects();
};

export { getDevProjects };
