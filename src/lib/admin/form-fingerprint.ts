/**
 * 폼 값이 저장 이후 바뀌었는지 비교할 지문을 만든다.
 *
 * Date 는 JSON 직렬화가 ISO 문자열이라 그대로 비교되고, 키 순서는 폼이 스프레드로
 * 갱신해도 유지되므로 얕은 비교보다 오탐이 적다.
 */
const formFingerprint = (value: unknown): string => JSON.stringify(value);

export { formFingerprint };
