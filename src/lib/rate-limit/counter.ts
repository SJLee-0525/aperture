/**
 * 공유 카운터의 공통 어휘.
 *
 * `upstash-counter` 는 전송(EVAL 호출과 오류 분류)만 맡는다. "IP 창 안에서 세고 남은
 * TTL 을 초로 돌려준다", "UTC 날짜로 버킷을 나눈다" 같은 계수 규칙은 여기 있다.
 * 소비처마다 다시 쓰면 같은 규칙이 세 벌이 되고 한쪽만 고쳐도 티가 나지 않는다.
 */

/**
 * 카운터를 올리고 신규 키에만 만료를 건다.
 *
 * 증가와 만료를 한 스크립트에 담는다. 두 명령으로 나누면 첫 요청이 만료 설정 전에
 * 끊겼을 때 그 키가 영구히 남는다.
 */
const INCREMENT_WITH_EXPIRY_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return count
`;

/** 자정 직후 잔재가 남지 않을 만큼만 두는 하루 버킷 만료. */
const DAILY_KEY_TTL_MS = 172_800_000;

/**
 * 모든 인스턴스가 공유하는 UTC 날짜 키 조각. 서버 타임존이 달라도 같은 버킷을 쓴다.
 *
 * @param now 기준 시각(ms).
 * @returns `YYYY-MM-DD`.
 */
const utcDayBucket = (now: number): string => new Date(now).toISOString().slice(0, 10);

/**
 * 남은 밀리초를 `Retry-After` 초로 바꾼다. 0 초를 돌려주면 클라이언트가 즉시 재시도한다.
 *
 * @param remainingMs 남은 시간. 음수나 비수치는 0으로 본다.
 * @returns 1 이상의 정수 초.
 */
const retryAfterSeconds = (remainingMs: number): number =>
  Math.max(1, Math.ceil(Math.max(Number.isFinite(remainingMs) ? remainingMs : 0, 0) / 1_000));

/**
 * 환경변수에서 양의 정수 상한을 읽는다. 값이 없거나 형이 어긋나면 기본값이다.
 *
 * @param raw 환경변수 값.
 * @param fallback 형이 어긋날 때 쓸 값.
 * @returns 양의 정수.
 */
const positiveIntOr = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export {
  DAILY_KEY_TTL_MS,
  INCREMENT_WITH_EXPIRY_SCRIPT,
  positiveIntOr,
  retryAfterSeconds,
  utcDayBucket,
};
