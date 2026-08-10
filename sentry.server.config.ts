// Node 런타임 Sentry 초기화 — instrumentation.ts의 register()가 서버 기동 시 import 한다.
// 동의와 무관하게 항상 켠다(ADR-0004): 동의로 통제할 대상은 방문자 브라우저의 수집·저장이고,
// 서버 이벤트는 dataCollection 잠금 + scrubEvent로 방문자 식별자·본문을 담지 않는다.

import * as Sentry from "@sentry/nextjs";

import { SENTRY_DSN } from "@/lib/monitoring/monitoring-dsn";
import { MINIMAL_DATA_COLLECTION } from "@/lib/monitoring/data-collection";
import { resolveMonitoringEnvironment } from "@/lib/monitoring/monitoring-environment";
import { scrubEvent } from "@/lib/monitoring/scrub-event";

Sentry.init({
  dsn: SENTRY_DSN,

  // 로컬 개발·테스트 노이즈 차단 — 배포 빌드에서만 전송한다.
  enabled: process.env.NODE_ENV === "production",

  // Vercel 배포 환경(production·preview) 구분. NODE_ENV는 둘 다 "production"으로 뭉개진다.
  environment: resolveMonitoringEnvironment(process.env.VERCEL_ENV, process.env.NODE_ENV),

  // release 미지정 — 빌드 플러그인이 주입하는 SENTRY_RELEASE를 기본값으로 사용해
  // 3개 런타임과 소스맵의 릴리즈를 일치시킨다(ADR-0004).

  // 도입 목적은 오류 관측이다. 성능 추적은 무료 쿼터를 가장 빨리 소모하는 축이라 끈다.
  tracesSampleRate: 0,

  // 데이터 수집 잠금(ADR-0004) — dataCollection을 지정하는 순간 새 기본값(요청·응답 본문
  // 전체 수집)이 적용되므로 반드시 명시한다. httpBodies: []가 /api/chat 방문자 질문을 지킨다.
  dataCollection: MINIMAL_DATA_COLLECTION,

  // Firebase ID token(Authorization)·민감 쿼리(q·token·code)를 전송 직전에 한 번 더 제거.
  beforeSend: scrubEvent,
});

// Sentry 예약 태그 `runtime`(예: "node v24")과 충돌하지 않는 앱 분류 키를 사용한다.
Sentry.setTags({ app_runtime: "node", area: "server" });
