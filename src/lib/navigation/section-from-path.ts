import { SECTION_BY_PREFIX, DEFAULT_SECTION } from "@/constants/sections";
import { stripLangPrefix } from "@/lib/i18n/locale-path";

import type { SectionId } from "@/constants/sections";

/**
 * 현재 경로가 속한 섹션을 판별한다. 섹션 액센트와 모바일 탭 세트가 이 값을 쓴다.
 *
 * 공개 경로는 `/ko`·`/en` 프리픽스를 달고 오므로 벗겨낸 뒤 매칭한다.
 * 판정은 `constants/` 가 아니라 여기 있다 — 로케일 규칙을 아는 함수라
 * 상수 모듈이 `lib/i18n` 을 역방향으로 참조하게 된다.
 *
 * @param {string} pathname 로케일 프리픽스를 포함할 수 있는 경로.
 * @returns {SectionId} 매칭된 섹션. 없으면 랜딩.
 */
const sectionFromPath = (pathname: string): SectionId => {
  const bare = stripLangPrefix(pathname);
  return (
    SECTION_BY_PREFIX.find(({ prefix }) => bare === prefix || bare.startsWith(`${prefix}/`))
      ?.section ?? DEFAULT_SECTION
  );
};

export { sectionFromPath };
