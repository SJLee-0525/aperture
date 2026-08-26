import { siteWallClock } from "@/lib/format/site-time-zone";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * EXIF 촬영일시 → "YYYY·MM·DD · HH:MM" (디자인 촬영일시 포맷).
 *
 * 촬영일시는 촬영지의 벽시계 값이라 보는 사람의 타임존으로 환산할 대상이 아니다.
 * 사이트 기준 타임존으로 고정해, 유럽에서 열어도 업로드할 때와 같은 값이 나온다.
 *
 * @param {Date} date
 * @returns {string}
 */
const formatShotAt = (date: Date): string => {
  const wall = siteWallClock(date);
  return (
    `${wall.year}·${pad(wall.month)}·${pad(wall.day)} · ${pad(wall.hour)}:${pad(wall.minute)}`
  );
};

/**
 * 공연일·발행일 → "YYYY.MM.DD".
 *
 * 공연일은 공연장의 벽시계 값이고 발행일도 사이트가 정한 날짜다. 사이트 기준 타임존으로
 * 고정해야 서버 렌더와 hydration 이 같은 날짜를 내고, 방문자 위치로 하루가 어긋나지 않는다.
 *
 * @param {Date} date
 * @returns {string}
 */
const formatEventYMD = (date: Date): string => {
  const wall = siteWallClock(date);
  return `${wall.year}.${pad(wall.month)}.${pad(wall.day)}`;
};

/**
 * 관리자 저장·수정 시각 → "YYYY·MM·DD · HH:MM" (보는 기기의 로컬 타임존).
 *
 * "방금 저장했다"는 피드백은 관리자의 손목시계와 맞아야 한다. 벽시계성 날짜와 달리
 * 이 값은 인스턴트이므로 고정 타임존으로 바꾸지 않는다.
 *
 * @param {Date} date
 * @returns {string}
 */
const formatLocalTimestamp = (date: Date): string =>
  `${date.getFullYear()}·${pad(date.getMonth() + 1)}·${pad(date.getDate())} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * 관리자 저장·수정 날짜 → "YYYY.MM.DD" (보는 기기의 로컬 타임존).
 *
 * @param {Date} date
 * @returns {string}
 */
const formatLocalYMD = (date: Date): string =>
  `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;

export { formatEventYMD, formatLocalTimestamp, formatLocalYMD, formatShotAt };
