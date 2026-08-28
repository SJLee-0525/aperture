/**
 * SDK를 직접 import하지 않고 브라우저 Sentry의 모드와 수명주기를 관리한다(ADR-0004).
 *
 * 브라우저에서는 Sentry 클라이언트를 하나만 관리한다. 공개 트리(동의 게이트)와 관리자
 * 트리가 각자 초기화하면 먼저 적용된 Replay 설정이 다음 트리에 남는다. 이 모듈이
 * 현재 모드를 기억하고, 전환 요청을 직렬화해 "닫는 중에 다시 여는" 경쟁을 막는다.
 * 실제 `Sentry.init`/`close`는 dynamic import 되는 `init-browser-monitoring.ts`(별도
 * 청크)가 수행한다. 동의 전에는 그 청크를 내려받지 않는다.
 */

import { SENTRY_DSN } from "@/lib/monitoring/monitoring-dsn";

/** 브라우저 모니터링 트리 구분. 공개 트리만 Replay를 사용한다. */
type BrowserMonitoringMode = "public" | "admin";

/** 현재 초기화된 모드. 미초기화·철회 후에는 null이다. */
let currentMode: BrowserMonitoringMode | null = null;

/** 시작·중지 요청을 순서대로 실행하는 직렬화 체인. */
let queue: Promise<void> = Promise.resolve();

/**
 * 시작·중지 작업을 체인에 붙여 순서를 보장한다. 실패는 삼킨다.
 * 모니터링 초기화 실패가 사이트 동작을 깨는 역전을 만들지 않는다.
 *
 * @param operation - 직렬로 실행할 작업.
 * @returns 이 작업까지의 체인.
 */
const enqueue = (operation: () => Promise<void>): Promise<void> => {
  queue = queue.then(operation).catch(() => undefined);
  return queue;
};

/**
 * 요청한 모드로 모니터링을 시작한다. DSN 미설정이면 no-op(킬 스위치),
 * 같은 모드로 이미 초기화돼 있으면 아무것도 하지 않는다.
 *
 * @param mode - `public`(동의 후) 또는 `admin`.
 * @returns 시작 완료.
 */
const startBrowserMonitoring = (mode: BrowserMonitoringMode): Promise<void> =>
  enqueue(async () => {
    if (!SENTRY_DSN || currentMode === mode) return;
    const { initBrowserMonitoring } = await import("@/lib/monitoring/init-browser-monitoring");
    await initBrowserMonitoring(mode);
    currentMode = mode;
  });

/**
 * 모니터링을 중지하고 상태를 비운다. 동의 철회 시 호출된다.
 * 시작된 적이 없으면 no-op이다(SDK 청크를 새로 받지 않는다).
 *
 * @returns 중지 완료.
 */
const stopBrowserMonitoring = (): Promise<void> =>
  enqueue(async () => {
    if (currentMode == null) return;
    const { closeBrowserMonitoring } = await import("@/lib/monitoring/init-browser-monitoring");
    await closeBrowserMonitoring();
    currentMode = null;
  });

export { startBrowserMonitoring, stopBrowserMonitoring };
export type { BrowserMonitoringMode };
