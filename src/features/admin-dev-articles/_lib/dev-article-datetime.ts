/**
 * `<input type="datetime-local">` 과 Date 사이의 변환.
 *
 * 이 입력은 UTC 가 아니라 브라우저의 지역 시각을 문자열로 주고받는다. 관리자가 적은 값이
 * 그대로 발행 시각이 돼야 하므로 UTC 변환(`toISOString`)을 쓰지 않고 지역 시각 필드로 다룬다.
 */

/**
 * 두 자리로 맞춘다.
 *
 * @param value 월·일·시·분 값.
 * @returns 앞을 0으로 채운 두 자리 문자열.
 */
const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * Date 를 입력 값으로 바꾼다.
 *
 * @param date 발행 시각. 초안이면 null.
 * @returns `YYYY-MM-DDTHH:mm`. 값이 없으면 빈 문자열.
 */
const toDateTimeLocalValue = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return "";
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
};

/**
 * 입력 값을 Date 로 바꾼다.
 *
 * @param value `YYYY-MM-DDTHH:mm` 형식의 입력 값.
 * @returns 지역 시각으로 해석한 Date. 비었거나 형식이 어긋나면 null.
 */
const fromDateTimeLocalValue = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  // 생성자는 0–99년을 1900년대로 옮긴다. 적힌 연도를 그대로 쓰도록 되돌린다.
  date.setFullYear(year);
  // 2026-02-30 처럼 존재하지 않는 날짜는 다른 달로 넘어간다. 되돌려 확인한다.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

export { fromDateTimeLocalValue, toDateTimeLocalValue };
