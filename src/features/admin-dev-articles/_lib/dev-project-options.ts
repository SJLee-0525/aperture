import { getDevProjectRepository } from "@/lib/admin/dev-project-repository";

import type { LocalizedText } from "@/types/localized";

/** 연관 프로젝트 선택지 한 개. 초안 프로젝트도 고를 수 있게 공개 여부를 함께 준다. */
type DevProjectOption = { id: string; title: LocalizedText; published: boolean };

/**
 * 연관 프로젝트 선택지를 읽는다.
 *
 * 공개 getter(`lib/content/dev.ts`)는 서버에서 도는 데다 공개 글만 주므로 쓰지 않는다.
 * 관리자는 아직 공개하지 않은 프로젝트도 골라 둘 수 있어야 하고(글을 먼저 쓰고 프로젝트를
 * 나중에 공개하는 순서가 있다), 대신 발행 조건 검사가 공개 상태를 확인한다.
 * mock/live 분기는 프로젝트 repository 가 이미 갖고 있어 여기서 다시 가르지 않는다.
 *
 * @returns 초안을 포함한 전체 프로젝트. 실패하면 빈 목록으로
 *   두지 않고 오류를 올려 폼이 "불러오지 못함"을 보여 준다.
 */
const loadDevProjectOptions = async (): Promise<DevProjectOption[]> =>
  (await getDevProjectRepository().list()).map(({ id, title, published }) => ({
    id,
    title,
    published,
  }));

export { loadDevProjectOptions };
export type { DevProjectOption };
