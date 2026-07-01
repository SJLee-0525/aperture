const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "YYYY·MM·DD · HH:MM" (디자인 촬영일시 포맷) */
const formatShotAt = (date: Date): string =>
  `${date.getFullYear()}·${pad(date.getMonth() + 1)}·${pad(date.getDate())} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;

export { formatShotAt };
