/**
 * 브라우저 Sentry를 초기화하는 유일한 클라이언트 모듈.
 *
 * 이 파일은 동의 뒤에만 `browser-monitoring.ts`(컨트롤러)가 dynamic import 하는 별도
 * 청크다. 여기 외의 클라이언트 코드가 `@sentry/nextjs`를 값으로 import 하면 동의
 * 게이팅이 깨진다(ADR-0004). 직접 호출하지 말고 항상 컨트롤러를 거친다. 모드 전환과
 * 중복 초기화 방지는 컨트롤러의 책임이다.
 */

import * as Sentry from "@sentry/nextjs";

import { setLoadedSentry } from "@/instrumentation-client";
import { MINIMAL_DATA_COLLECTION } from "@/lib/monitoring/data-collection";
import { resolveMonitoringEnvironment } from "@/lib/monitoring/monitoring-environment";
import { SENTRY_DSN } from "@/lib/monitoring/monitoring-dsn";
import { scrubBreadcrumb, scrubEvent, scrubReplayEvent } from "@/lib/monitoring/scrub-event";

import type { BrowserMonitoringMode } from "@/lib/monitoring/browser-monitoring";

/**
 * 모드별 Sentry 클라이언트를 초기화한다. 기존 클라이언트가 있으면 flush 후 교체한다.
 *
 * - `public`: 오류 세션만 Replay 녹화. 공개 콘텐츠는 노출하되 입력값과 챗봇 패널
 *   (방문자 질문이 렌더되는 영역)은 가린다.
 * - `admin`: Replay를 사용하지 않아 로그인 폼과 미공개 초안을 녹화하지 않는다.
 *   `area:admin` 태그로 공개 이슈와 분리한다.
 *
 * @param {BrowserMonitoringMode} mode - 초기화할 트리 구분.
 * @returns {Promise<void>} 초기화 완료.
 */
const initBrowserMonitoring = async (mode: BrowserMonitoringMode): Promise<void> => {
  if (Sentry.getClient()) {
    await stopReplayRecording();
    await Sentry.close();
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // 로컬 개발 오류는 전송하지 않는다. 배포 빌드에서만 활성화한다.
    enabled: process.env.NODE_ENV === "production",

    // Vercel이 자동 노출하는 NEXT_PUBLIC_VERCEL_ENV(production·preview·development).
    // 서버 전용 VERCEL_ENV는 클라이언트 번들에 인라인되지 않아 쓸 수 없다.
    environment: resolveMonitoringEnvironment(
      process.env.NEXT_PUBLIC_VERCEL_ENV,
      process.env.NODE_ENV,
    ),

    // release를 직접 지정하지 않는다. 빌드 플러그인이 주입하는 SENTRY_RELEASE를 사용해
    // 3개 런타임과 소스맵의 릴리즈를 일치시킨다(ADR-0004).

    // 도입 목적은 오류 관측이다. 성능 추적은 무료 쿼터를 가장 빨리 소모하는 축이라 끈다.
    tracesSampleRate: 0,

    // 상시 세션 녹화는 하지 않고, 오류가 발생한 세션만 남긴다.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: mode === "public" ? 1 : 0,

    // 데이터 수집 잠금(ADR-0004). SDK가 허용하는 모든 범주를 명시적으로 최소화한다.
    // URL query는 SDK 단계에서 끄고, 이벤트·Replay URL도 별도로 정제한다.
    dataCollection: MINIMAL_DATA_COLLECTION,

    integrations:
      mode === "public"
        ? [
            Sentry.replayIntegration({
              // 화면 대부분이 공개 콘텐츠라 전면 마스킹하면 재생본이 무의미해진다.
              maskAllText: false,
              // 연락 폼·검색어·로그인 입력값은 마스킹한다.
              maskAllInputs: true,
              blockAllMedia: false,
              // 방문자가 입력한 질문이 렌더되는 챗봇 패널은 통째로 가린다.
              block: ["[data-chat-panel]"],
              // Replay는 ErrorEvent와 별도 스트림이라 URL을 여기서 다시 정제한다.
              beforeAddRecordingEvent: scrubReplayEvent,
            }),
          ]
        : [],

    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });

  // Sentry 예약 태그 `runtime`과 충돌하지 않는 앱 분류 키를 서버 이벤트와 공유한다.
  Sentry.setTags({ app_runtime: "browser", area: mode });

  setLoadedSentry(Sentry);
};

/**
 * Replay 리스너와 버퍼를 명시적으로 중지하고 탭 세션 식별자를 제거한다.
 * `Sentry.close()`는 클라이언트 전송만 비활성화하며 Replay teardown을 수행하지 않는다.
 *
 * @returns {Promise<void>} Replay 정리 완료.
 */
const stopReplayRecording = async (): Promise<void> => {
  const replay = Sentry.getReplay();
  if (replay) {
    await replay.stop({ flush: false });
  }
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem("sentryReplaySession");
  }
};

/**
 * 현재 클라이언트를 flush 후 닫고 포워더를 비운다. 동의 철회·모드 전환 시 호출된다.
 *
 * @returns {Promise<void>} 종료 완료.
 */
const closeBrowserMonitoring = async (): Promise<void> => {
  setLoadedSentry(null);
  await stopReplayRecording();
  await Sentry.close();
};

export { closeBrowserMonitoring, initBrowserMonitoring };
