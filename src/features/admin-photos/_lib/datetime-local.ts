/** Date ↔ <input type="datetime-local"> 문자열 변환 (로컬 타임존 기준). */

/**
 * Date → "YYYY-MM-DDTHH:mm" (datetime-local value).
 */
const toDatetimeLocal = (date: Date): string => {
  // epoch 는 디코더가 "값 없음"에 쓰는 표현이다. 날짜로 그려 주면 관리자가 그것을
  // 실제 촬영일로 읽고, 저장 경계는 같은 값을 저장하지 않아 화면과 결과가 갈린다.
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

/**
 * datetime-local 문자열 → Date. 빈 값은 "값 없음"이라 epoch 로 돌려주고,
 * 저장 경계가 그 키를 빼서 원래의 결측을 보존한다.
 */
const fromDatetimeLocal = (value: string): Date => {
  if (!value) return new Date(0);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export { fromDatetimeLocal, toDatetimeLocal };
