/**
 * 검증 결과가 가리킬 수 있는 필드 이름.
 *
 * 이 이름은 세 곳이 공유한다 — 검증기가 내고, 폼이 `AdminField field=` 로 컨트롤에 붙이고,
 * `issueFor` 가 문구를 찾는다. 문자열로 두면 셋 중 하나만 달라져도 저장이 조용히 막히고
 * 화면에는 아무 표시가 남지 않는다. 유니온으로 좁혀 `tsc` 가 그 어긋남을 잡게 한다.
 *
 * 이중언어 필드는 `LocalizedFieldPair` 가 한국어 쪽에 `{어간}.ko` 를 붙인다.
 */
type AdminFieldName =
  | "title.ko"
  | "name.ko"
  | "image"
  | "photoIds"
  | "performedAt"
  | "year";

/** 이중언어 쌍이 화면에 붙이는 어간. 검증기는 `.ko` 를 붙인 이름을 낸다. */
type AdminFieldStem = "title" | "name";

/** 검증 실패 한 건. `field` 는 폼이 입력에 붙이는 이름이고 화면 순서와 같아야 한다. */
type FieldIssue = {
  field: AdminFieldName;
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
const issueFor = (issues: FieldIssue[], field: AdminFieldName): string | undefined =>
  issues.find((issue) => issue.field === field)?.message;

export { focusFirstIssue, issueFor };
export type { AdminFieldName, AdminFieldStem, FieldIssue };
