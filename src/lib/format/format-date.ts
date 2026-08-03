const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "YYYY·MM·DD · HH:MM" (디자인 촬영일시 포맷) */
const formatShotAt = (date: Date): string =>
  `${date.getFullYear()}·${pad(date.getMonth() + 1)}·${pad(date.getDate())} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Date → "YYYY.MM.DD" (공연일자 등 로케일 무관 표기 — 공개·관리자 공용) */
const formatYMD = (date: Date): string =>
  `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;

export { formatShotAt, formatYMD };
