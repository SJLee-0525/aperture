/**
 * 상세 도구의 대상 해석 — 에이전트가 id 를 생략하면 현재 열린 모달을 대상으로 삼는다.
 *
 * 상세 모달은 URL query 가 단일 출처다(`?photo=`·`?work=`·`?project=`). id 를 필수로 두면
 * "이 사진 어디서 찍었어?" 같은 발화에서 에이전트가 대화 기록의 낡은 id 를 채워 넣어
 * 엉뚱한 항목을 답하게 된다(W5 평가에서 실제 발생). 화면 상태를 도구가 직접 읽어 막는다.
 *
 * @param {unknown} raw 에이전트가 넘긴 id 인자(검증 전).
 * @param {string} queryKey 모달 딥링크 query key — "photo" · "work" · "project".
 * @returns {string | null} 인자 우선, 없으면 현재 열린 항목의 id, 둘 다 없으면 null.
 */
const resolveTargetId = (raw: unknown, queryKey: string): string | null => {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(queryKey);
};

export { resolveTargetId };
