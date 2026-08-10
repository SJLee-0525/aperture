/**
 * 도구 inputSchema 공유 조각 — JSON Schema 를 손으로 반복 작성하지 않게 한다.
 * 파라미터 설명은 150자 이내 영어(secure-tools 문자 예산).
 */

/**
 * object 타입 스키마 — required 가 비면 키 자체를 넣지 않는다.
 *
 * @param {Record<string, unknown>} properties 파라미터명 → 프로퍼티 스키마.
 * @param {string[]} [required] 필수 파라미터명 목록.
 * @returns {Record<string, unknown>}
 */
const objectSchema = (
  properties: Record<string, unknown>,
  required?: string[],
): Record<string, unknown> => ({
  type: "object",
  properties,
  ...(required && required.length > 0 ? { required } : {}),
});

/**
 * string 프로퍼티 스키마.
 *
 * @param {string} description
 * @returns {Record<string, unknown>}
 */
const stringProperty = (description: string): Record<string, unknown> => ({
  type: "string",
  description,
});

/**
 * number 프로퍼티 스키마.
 *
 * @param {string} description
 * @returns {Record<string, unknown>}
 */
const numberProperty = (description: string): Record<string, unknown> => ({
  type: "number",
  description,
});

/**
 * enum 프로퍼티 스키마 — 허용값을 명시해 에이전트의 인자 오류를 줄인다.
 *
 * @param {string} description
 * @param {string[]} values 허용값 목록.
 * @returns {Record<string, unknown>}
 */
const enumProperty = (description: string, values: string[]): Record<string, unknown> => ({
  type: "string",
  description,
  enum: values,
});

/**
 * 목록 도구 공통 limit — 기본 8, 상한 20 (tool-output.clampLimit 과 짝).
 *
 * @returns {Record<string, unknown>}
 */
const limitProperty = (): Record<string, unknown> =>
  numberProperty("Maximum number of items to return. Defaults to 8, capped at 20.");

/**
 * 문서 id 프로퍼티 스키마 — 목록 도구 결과의 id 를 받는 상세·열기 도구용.
 *
 * @param {string} description
 * @returns {Record<string, unknown>}
 */
const idProperty = (description: string): Record<string, unknown> => stringProperty(description);

export { enumProperty, idProperty, limitProperty, numberProperty, objectSchema, stringProperty };
