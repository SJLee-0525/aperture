import { shouldUseMockContent } from "@/lib/content/content-source";

/**
 * mock/live 저장소 선택을 한 곳에 모은다.
 *
 * `shouldUseMockContent()` 는 **모듈 평가 시점이 아니라 첫 호출 시점**에 부른다 — 설정이
 * 없는 프로덕션에서 그 함수가 throw 하더라도 관리자 모듈 전체의 로드를 막지 않아야 한다.
 * 결과는 memoize 하므로 돌려받은 getter 를 hook 의존성 배열에 그대로 넣어도 매 렌더마다
 * 새 어댑터가 생기지 않는다. 콘텐츠 소스는 빌드 시 인라인되는 env 로 정해져 세션 중에
 * 바뀌지 않으니 첫 결과를 계속 써도 안전하다.
 *
 * @param {() => T} createMock mock 구현을 만드는 함수.
 * @param {() => T} createLive live(Supabase) 구현을 만드는 함수.
 * @returns {() => T} 현재 콘텐츠 소스에 맞는 저장소를 돌려주는 getter.
 */
const selectRepository = <T>(createMock: () => T, createLive: () => T): (() => T) => {
  let cached: T | null = null;
  return () => (cached ??= shouldUseMockContent() ? createMock() : createLive());
};

export { selectRepository };
