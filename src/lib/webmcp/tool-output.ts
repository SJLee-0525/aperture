/**
 * WebMCP 도구 출력을 1,500자 안에서 직렬화한다.
 * 목록을 줄이면 `+N more`로 생략한 항목 수를 표시한다.
 */

const TOOL_OUTPUT_BUDGET = 1500;

const DEFAULT_LIST_LIMIT = 8;
const MAX_LIST_LIMIT = 20;

/** `+NNN more` 표시를 위해 남겨 둘 문자 수. */
const LIST_TAIL_RESERVE = 16;

/**
 * limit 인자를 기본 8, 최대 20 범위로 정규화한다.
 * 스키마는 number 지만 에이전트가 "3" 같은 문자열 숫자를 보내는 위반이 흔해 함께 받는다.
 *
 * @param raw 에이전트가 넘긴 limit 인자(검증 전).
 */
const clampLimit = (raw: unknown): number => {
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : Number.NaN;
  const value = Math.floor(parsed);
  if (!Number.isFinite(value) || value < 1) return DEFAULT_LIST_LIMIT;
  return Math.min(value, MAX_LIST_LIMIT);
};

/**
 * 목록 줄을 문자 제한 안에서 이어 붙이고
 * 표시하지 못한 건수(totalCount 대비)를 `+N more` 로 알린다.
 *
 * @param lines 이미 limit 로 잘린 표시 후보 줄들.
 * @param totalCount 필터 후 전체 건수 — 생략 건수 계산의 기준.
 */
const formatToolList = (lines: string[], totalCount: number): string => {
  const included: string[] = [];
  let length = 0;
  for (const line of lines) {
    const next = length + line.length + (included.length > 0 ? 1 : 0);
    if (next > TOOL_OUTPUT_BUDGET - LIST_TAIL_RESERVE) break;
    included.push(line);
    length = next;
  }
  const omitted = totalCount - included.length;
  const body = included.join("\n");
  if (omitted <= 0) return body;
  return included.length > 0 ? `${body}\n+${omitted} more` : `+${omitted} more`;
};

/**
 * 목록 제한, 줄 변환, 문자 제한을 차례로 적용한다.
 *
 * @template T
 * @param items 필터까지 끝난 전체 항목.
 * @param rawLimit 에이전트가 넘긴 limit 인자(검증 전).
 * @param toLine 항목을 한 줄로 바꾸는 함수.
 */
const formatToolItems = <T>(items: T[], rawLimit: unknown, toLine: (item: T) => string): string =>
  formatToolList(items.slice(0, clampLimit(rawLimit)).map(toLine), items.length);

/**
 * 개수에 맞는 단수형 또는 복수형 단위를 반환한다.
 *
 * @param singular 단수형 단위. 복수형은 기본 s 를 붙인다.
 * @param [plural] 불규칙 복수형이 필요할 때만.
 */
const countLabel = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * 단일 텍스트가 제한을 넘으면 말줄임표를 붙여 자른다.
 */
const clampToolText = (text: string): string =>
  text.length <= TOOL_OUTPUT_BUDGET ? text : `${text.slice(0, TOOL_OUTPUT_BUDGET - 1)}…`;

export {
  clampLimit,
  clampToolText,
  countLabel,
  formatToolItems,
  formatToolList,
  DEFAULT_LIST_LIMIT,
  TOOL_OUTPUT_BUDGET,
};
