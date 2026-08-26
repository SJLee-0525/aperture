/**
 * 사이트가 벽시계 값을 해석하는 기준 타임존.
 *
 * EXIF 촬영일시와 공연일은 인스턴트가 아니라 촬영지·공연장의 벽시계 값이다. 저장은
 * 인스턴트로 하되 해석은 한 곳에 고정해야, 업로드한 기기와 보는 기기가 달라도 같은
 * 날짜·시각이 나온다. 서버와 브라우저가 같은 값을 쓰므로 SSR 과 hydration 도 갈리지 않는다.
 */
const SITE_TIME_ZONE = "Asia/Seoul";

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const PART_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * 인스턴트를 사이트 기준 타임존의 벽시계 값으로 읽는다.
 *
 * @param {Date} date 표시할 인스턴트.
 * @returns {WallClock} 사이트 타임존에서 본 연·월·일·시·분·초.
 */
const siteWallClock = (date: Date): WallClock => {
  const parts = PART_FORMATTER.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  // Intl 은 자정을 24 로 내는 구현이 있다. 날짜는 이미 다음 날이라 시각만 되돌린다.
  const hour = value("hour");
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: hour === 24 ? 0 : hour,
    minute: value("minute"),
    second: value("second"),
  };
};

/**
 * 벽시계 값을 사이트 기준 타임존의 인스턴트로 바꾼다.
 *
 * UTC 로 가정한 값이 그 타임존에서 몇 시로 보이는지 재서 차이만큼 되돌린다.
 * 업로드한 기기의 타임존과 무관하게 같은 EXIF 원문이 같은 인스턴트가 된다.
 *
 * @param {WallClock} wall 촬영지 기준 벽시계 값.
 * @returns {Date} 사이트 타임존으로 해석한 인스턴트.
 */
const instantFromSiteWallClock = (wall: WallClock): Date => {
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const seen = siteWallClock(new Date(guess));
  const seenUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, seen.second);
  return new Date(guess - (seenUtc - guess));
};

export { instantFromSiteWallClock, SITE_TIME_ZONE, siteWallClock };
export type { WallClock };
