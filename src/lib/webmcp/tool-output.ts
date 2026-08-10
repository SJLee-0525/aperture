/**
 * WebMCP 도구 출력 직렬화 — 도구당 출력 1,500자 예산(secure-tools 권장치)을 강제한다.
 * 과도한 출력은 에이전트의 판단을 방해하므로 목록은 잘라내되, 조용한 절단 대신
 * `+N more` 로 남은 건수를 명시한다(plan 04 §5).
 */

const TOOL_OUTPUT_BUDGET = 1500;

const DEFAULT_LIST_LIMIT = 8;
const MAX_LIST_LIMIT = 20;

/** `+NNN more` 꼬리줄 몫을 예산에서 미리 빼 둔다. */
const LIST_TAIL_RESERVE = 16;

/**
 * limit 인자 정규화 — 잘못된 값이면 기본 8, 상한 20.
 * 스키마는 number 지만 에이전트가 "3" 같은 문자열 숫자를 보내는 위반이 흔해 함께 받는다.
 *
 * @param {unknown} raw 에이전트가 넘긴 limit 인자(검증 전).
 * @returns {number}
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
 * 목록 줄들을 예산 안에서 이어 붙인다 — 예산 도달 시 즉시 중단(early-exit)하고
 * 표시하지 못한 건수(totalCount 대비)를 `+N more` 로 알린다.
 *
 * @param {string[]} lines 이미 limit 로 잘린 표시 후보 줄들.
 * @param {number} totalCount 필터 후 전체 건수 — 생략 건수 계산의 기준.
 * @returns {string}
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
 * 목록 도구 공통 직렬화 — limit 클램프 → 줄 변환 → 예산 포맷을 한 번에.
 * 여섯 목록 도구가 같은 3종 세트를 반복하지 않게 한다(빈 목록 안내 문장은 도구별 책임).
 *
 * @template T
 * @param {T[]} items 필터까지 끝난 전체 항목.
 * @param {unknown} rawLimit 에이전트가 넘긴 limit 인자(검증 전).
 * @param {(item: T) => string} toLine 항목 → 한 줄 직렬화.
 * @returns {string}
 */
const formatToolItems = <T>(items: T[], rawLimit: unknown, toLine: (item: T) => string): string =>
  formatToolList(items.slice(0, clampLimit(rawLimit)).map(toLine), items.length);

/**
 * 단일 텍스트 출력의 예산 절단 — 넘치면 말줄임 문자로 끝을 표시한다.
 *
 * @param {string} text
 * @returns {string}
 */
const clampToolText = (text: string): string =>
  text.length <= TOOL_OUTPUT_BUDGET ? text : `${text.slice(0, TOOL_OUTPUT_BUDGET - 1)}…`;

export {
  clampLimit,
  clampToolText,
  formatToolItems,
  formatToolList,
  DEFAULT_LIST_LIMIT,
  TOOL_OUTPUT_BUDGET,
};
