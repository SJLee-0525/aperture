import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchPublishedDevProjects, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_DEV_PROJECTS } from "@/mocks/dev";
import type { DevProject } from "@/types/dev";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬. */
const mockProjects = (): DevProject[] =>
  MOCK_DEV_PROJECTS.filter((project) => project.published).sort((a, b) => a.order - b.order);

/**
 * 공개 프로젝트 목록 — published 필터 + order 정렬 완료 상태.
 * Firebase 설정 시 항상 실데이터(빈 컬렉션이면 빈 배열). mock 은 env 미설정일 때만.
 */
const getDevProjects = async (): Promise<DevProject[]> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return mockProjects();
  try {
    return await fetchPublishedDevProjects();
  } catch (error) {
    console.warn("[content] getDevProjects: Firestore REST 실패 — 빈 목록", error);
    return [];
  }
};

export { getDevProjects };
