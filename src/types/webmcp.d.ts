/**
 * WebMCP 선언형 API 타입 확장 — 스펙 타입이 아직 TS lib 에 없다.
 *
 * React 19 는 소문자 미인식 속성을 DOM 에 그대로 전달하므로 런타임 처리는 필요 없고,
 * JSX 타입 에러만 모듈 확장으로 해소한다. 스펙이 정식 채택되면 이 파일을 제거한다.
 */

import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 원본 인터페이스의 제네릭 시그니처와 일치해야 병합된다.
  interface FormHTMLAttributes<T> {
    /** WebMCP 선언형 도구 이름 (≤30자 영어). */
    toolname?: string;
    /** WebMCP 선언형 도구 설명 (≤500자 영어). */
    tooldescription?: string;
    /** 에이전트 호출 시 자동 제출 — 이 저장소에서는 사용 금지(ADR-0003, 캡차·사람 확인). */
    toolautosubmit?: boolean;
  }
}

declare global {
  interface SubmitEvent {
    /** AI 에이전트가 트리거한 제출이면 true. */
    agentInvoked?: boolean;
    /** 도구 결과를 모델에 반환한다 (선언형 API) — 스펙 계약은 Promise 다. */
    respondWith?(response: Promise<unknown>): void;
  }
}
