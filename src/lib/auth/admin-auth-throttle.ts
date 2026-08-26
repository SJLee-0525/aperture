import { headers } from "next/headers";

import { clientAddress } from "@/lib/rate-limit/client-address";
import {
  evalUpstashScript,
  resolveUpstashCredentials,
  type UpstashEnvironment,
} from "@/lib/rate-limit/upstash-counter";

/**
 * 관리자 인증 실패를 IP 단위로 세는 카운터.
 *
 * 미인증 요청 하나가 Supabase 로 아웃바운드를 만든다. `kid` 를 매번 바꾼 well-formed 토큰은
 * JWKS 캐시를 항상 미스로 만들어 원격 조회를 반복시킨다. 인증 우회는 아니지만 무료 티어
 * 쿼터와 함수 실행 시간이 그대로 소모된다.
 *
 * 실패만 센다. 정상 관리자는 카운터를 올리지 않으므로 자기 작업량으로 스스로를 막지 않는다.
 *
 * 공유 카운터가 없으면 통과시킨다. 챗은 반대로 자격증명이 없으면 프로덕션에서 요청을 막는데,
 * 그쪽은 방문자 트래픽이라 제한기가 없으면 호출량에 상한이 사라진다. 관리자 표면에서 같은
 * 선택을 하면 카운터 장애가 곧 관리자 잠김이 되고, 이 사이트의 관리자는 한 명뿐이다.
 */

/** 한 창 안에서 허용할 인증 실패 횟수. */
const FAILURE_LIMIT = 10;

/** 실패 카운터를 세는 창. */
const WINDOW_MS = 600_000;

/**
 * 현재 실패 수와 남은 창 시간을 함께 읽는다.
 *
 * `PTTL` 은 키가 없으면 -2 를 준다. 호출부가 `Math.max` 로 걸러 쓴다.
 */
const READ_SCRIPT = `
local count = tonumber(redis.call("GET", KEYS[1])) or 0
local ttl = redis.call("PTTL", KEYS[1])
return { count, ttl }
`;

/**
 * 실패 하나를 더한다.
 *
 * 증가와 만료를 한 스크립트에 담는다. 두 명령으로 나누면 첫 실패가 만료 설정 전에 끊겼을 때
 * 그 IP 의 카운터가 영구히 남는다.
 */
const RECORD_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return count
`;

type ThrottleOptions = {
  env?: UpstashEnvironment;
  fetcher?: typeof fetch;
  /** 테스트가 헤더를 직접 넣을 때 쓴다. 비우면 요청 헤더를 읽는다. */
  address?: string;
};

type AdminAuthThrottleState = { blocked: boolean; retryAfterSeconds: number };

const PASS: AdminAuthThrottleState = { blocked: false, retryAfterSeconds: 0 };

const failureKey = (address: string): string => `admin-auth:fail:v1:${address}`;

const resolveAddress = async (override?: string): Promise<string> =>
  override ?? clientAddress(await headers());

/**
 * 이 IP 가 인증 실패 상한을 넘겼는지 본다. 토큰 검증 전에 호출한다.
 *
 * 카운터를 읽지 못하면 통과시킨다.
 */
const checkAdminAuthThrottle = async (
  options: ThrottleOptions = {},
): Promise<AdminAuthThrottleState> => {
  const credentials = resolveUpstashCredentials(options.env ?? process.env);
  if (!credentials) return PASS;

  const outcome = await evalUpstashScript({
    credentials,
    script: READ_SCRIPT,
    keys: [failureKey(await resolveAddress(options.address))],
    args: [],
    timeoutMs: 1_000,
    fetcher: options.fetcher ?? fetch,
  });
  if (!outcome.ok || !Array.isArray(outcome.value)) return PASS;

  const count = Number(outcome.value[0]);
  const ttlMs = Number(outcome.value[1]);
  if (!Number.isFinite(count) || count < FAILURE_LIMIT) return PASS;

  return {
    blocked: true,
    retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttlMs, 0) / 1_000)),
  };
};

/**
 * 인증 실패 하나를 기록한다. 검증이 실패했을 때만 호출한다.
 *
 * 기록 실패는 요청 처리에 영향을 주지 않으며, 그만큼 상한 도달이 늦어진다.
 */
const recordAdminAuthFailure = async (options: ThrottleOptions = {}): Promise<void> => {
  const credentials = resolveUpstashCredentials(options.env ?? process.env);
  if (!credentials) return;

  await evalUpstashScript({
    credentials,
    script: RECORD_SCRIPT,
    keys: [failureKey(await resolveAddress(options.address))],
    args: [WINDOW_MS],
    timeoutMs: 1_000,
    fetcher: options.fetcher ?? fetch,
  });
};

export { checkAdminAuthThrottle, FAILURE_LIMIT, recordAdminAuthFailure, WINDOW_MS };
export type { AdminAuthThrottleState };
