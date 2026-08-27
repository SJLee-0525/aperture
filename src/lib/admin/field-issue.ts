/** 검증 실패 한 건. `field` 는 폼이 입력에 붙이는 이름이고 화면 순서와 같아야 한다. */
type FieldIssue = {
  field: string;
  message: string;
};

/**
 * 첫 오류 필드로 포커스를 옮긴다.
 *
 * 오류 문구를 저장 버튼 위에만 그리면 문제의 입력이 화면 최상단, 문구가 최하단에 남아
 * 마우스 사용자도 어느 칸이 비었는지 스크롤로 되짚어야 한다.
 *
 * @param form 검증한 폼 요소.
 * @param issues 검증 결과. 비어 있으면 아무것도 하지 않는다.
 * @returns 포커스를 옮겼으면 true.
 */
const focusFirstIssue = (form: HTMLFormElement | null, issues: FieldIssue[]): boolean => {
  const first = issues[0];
  if (!form || !first) return false;
  // 선택자 문자열 대신 dataset 을 비교한다. 필드 이름에 점이 들어가고 CSS.escape 는
  // 모든 실행 환경에 있지 않다.
  const control = [...form.querySelectorAll<HTMLElement>("[data-field]")].find(
    (element) => element.dataset.field === first.field,
  );
  if (!control) return false;
  control.focus();
  return true;
};

/** 필드 이름으로 오류 문구를 찾는다. 없으면 undefined 라 AdminField 가 오류를 그리지 않는다. */
const issueFor = (issues: FieldIssue[], field: string): string | undefined =>
  issues.find((issue) => issue.field === field)?.message;

export { focusFirstIssue, issueFor };
export type { FieldIssue };
