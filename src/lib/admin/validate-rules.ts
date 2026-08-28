import type { AdminFieldName, FieldIssue } from "@/lib/admin/field-issue";
import type { LocalizedText } from "@/types/localized";

/**
 * 여섯 엔티티 폼이 공유하는 검증 규칙.
 *
 * 규칙 자체는 폼마다 한두 개뿐이라 각자 적어도 짧다. 문제는 같은 규칙이 여섯 벌이면
 * 문구와 필드 이름도 여섯 벌이 되는 것이다. 한 곳에서 고치면 여섯이 함께 바뀐다.
 *
 * 각 함수는 통과하면 `null` 을 돌려준다. 호출부가 화면 순서대로 모아
 * `issues` 배열을 만든다 — 첫 항목이 제출 실패 시 포커스를 받는다.
 */

/**
 * 이중언어 필드의 한국어 값을 요구한다. 저장 조건이 ko 기준이다.
 *
 * @param field 화면 컨트롤에 붙은 이름.
 * @param value 검사할 값.
 * @param label 문구에 들어갈 항목 이름. "제목" → "제목(한국어)을 입력하세요."
 */
const requireKoText = (
  field: AdminFieldName,
  value: LocalizedText,
  label: string,
): FieldIssue | null =>
  value.ko.trim() ? null : { field, message: `${label}(한국어)을 입력하세요.` };

/**
 * 값이 있는 날짜를 요구한다.
 *
 * epoch 는 디코더와 폼이 "값 없음" 에 쓰는 표현이다. 목록 정렬이 이 값을 기준으로 한다.
 */
const requireDate = (field: AdminFieldName, value: Date, label: string): FieldIssue | null =>
  value.getTime() === 0 || Number.isNaN(value.getTime())
    ? { field, message: `${label}을 입력하세요.` }
    : null;

/** 양의 정수 연도를 요구한다. 폼이 문자열 상태로 들고 있어 여기서 파싱한다. */
const requireYear = (field: AdminFieldName, value: string, label: string): FieldIssue | null => {
  const year = Number(value);
  return value.trim() && Number.isInteger(year) && year > 0
    ? null
    : { field, message: `${label}를 입력하세요.` };
};

/** 항목을 하나 이상 요구한다. */
const requireAny = (
  field: AdminFieldName,
  values: readonly unknown[],
  message: string,
): FieldIssue | null => (values.length > 0 ? null : { field, message });

/** 값이 있는 문자열을 요구한다. 업로드가 끝나지 않은 이미지처럼 URL 이 빈 경우를 잡는다. */
const requireValue = (field: AdminFieldName, value: string, message: string): FieldIssue | null =>
  value ? null : { field, message };

/** 화면 순서대로 넘긴 결과에서 통과한 것을 걸러 낸다. */
const collectIssues = (...results: (FieldIssue | null)[]): FieldIssue[] =>
  results.filter((issue): issue is FieldIssue => issue !== null);

export { collectIssues, requireAny, requireDate, requireKoText, requireValue, requireYear };
