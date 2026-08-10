// Edge 런타임 Sentry 초기화 — instrumentation.ts의 register()가 Edge 기동 시 import 한다.
// 이 저장소의 Edge 표면은 proxy.ts(루트 / 언어 협상)뿐이다. 정책은 서버 config와 동일하며
// 동의와 무관하게 항상 켠다(ADR-0004) — 근거는 sentry.server.config.ts 주석 참고.

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

  // release 미지정 — 빌드 플러그인 주입값 사용(ADR-0004).

  // 성능 추적은 끈다 — 도입 목적은 오류 관측이다.
  tracesSampleRate: 0,

  // 데이터 수집 잠금(ADR-0004) — 서버 config와 동일한 이유로 반드시 명시한다.
  dataCollection: MINIMAL_DATA_COLLECTION,

  // 언어 쿠키 등 요청 부속 정보가 이벤트에 실리지 않도록 전송 직전에 한 번 더 제거.
  beforeSend: scrubEvent,
});

// 이 저장소의 Edge 오류는 proxy 표면에서만 발생한다.
Sentry.setTags({ app_runtime: "edge", area: "proxy" });
