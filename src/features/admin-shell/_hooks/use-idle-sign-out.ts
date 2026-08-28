"use client";

import { useEffect, useRef } from "react";

/**
 * 아무 조작도 없이 이 시간이 지나면 로그아웃한다.
 *
 * 관리자 토큰은 localStorage 에 있고 CSP 가 아직 `script-src 'unsafe-inline'` 을 허용한다.
 * XSS 가 한 번 성립하면 refresh token 까지 나가고, 그 계정은 RLS 상 전 테이블 쓰기 권한이다.
 * nonce 전환은 정적 우선 렌더와 충돌해 미뤘으므로, 토큰이 브라우저에 놓여 있는 시간을 줄여
 * 노출 창을 좁힌다. 자리를 비운 공용 브라우저에도 같은 효과가 있다.
 */
const IDLE_LIMIT_MS = 1_800_000;

/** 사용자가 아직 화면에 있다고 볼 수 있는 이벤트. 수동 스크롤과 입력만 센다. */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "visibilitychange"] as const;

/**
 * 관리자 화면이 유휴 상태로 방치되면 로그아웃한다.
 *
 * @param onIdle 유휴 시간이 지났을 때 실행할 로그아웃 절차.
 * @param idleLimitMs 테스트가 대기 시간을 줄일 때 쓴다.
 */
const useIdleSignOut = (onIdle: () => void, idleLimitMs: number = IDLE_LIMIT_MS): void => {
  // 콜백이 바뀔 때마다 타이머를 다시 걸면 유휴 시계가 초기화된다. effect 는 대기 시간에만
  // 의존하게 두고, 최신 콜백은 커밋 이후에 갈아 끼운다.
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    let timer = window.setTimeout(() => onIdleRef.current(), idleLimitMs);

    const restart = () => {
      // 탭이 백그라운드로 갈 때는 시계를 되돌리지 않는다. 그 상태가 곧 방치다.
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => onIdleRef.current(), idleLimitMs);
    };

    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, restart);
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, restart);
    };
  }, [idleLimitMs]);
};

export { useIdleSignOut };
