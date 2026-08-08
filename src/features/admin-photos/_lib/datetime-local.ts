/** Date ↔ <input type="datetime-local"> 문자열 변환 (로컬 타임존 기준). */

/**
 * Date → "YYYY-MM-DDTHH:mm" (datetime-local value).
 *
 * @param {Date} date
 * @returns {string}
 */
const toDatetimeLocal = (date: Date): string => {
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

/**
 * datetime-local 문자열 → Date (빈 값이면 현재 시각).
 *
 * @param {string} value
 * @returns {Date}
 */
const fromDatetimeLocal = (value: string): Date => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export { fromDatetimeLocal, toDatetimeLocal };
