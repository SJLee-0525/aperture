"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { isWebMcpSupported } from "@/lib/webmcp/model-context";

import type { WebMcpProfile } from "@/features/webmcp/_hooks/use-global-tools";

/** 지원 브라우저에서만 로드하는 도구 등록 청크 — 미지원 방문자 비용은 이 게이트 몇 줄뿐. */
const WebMcpGlobalTools = dynamic(
  () => import("./WebMcpGlobalTools").then((m) => m.WebMcpGlobalTools),
  { ssr: false },
);

/** 지원 여부는 세션 동안 불변 — 구독할 변화가 없어 no-op unsubscribe 를 돌려준다. */
const subscribeNothing = () => () => {};

/**
 * WebMCP 기능 감지 게이트 — `document.modelContext` 가 있을 때만 전역 도구 청크를
 * dynamic import 한다(AnalyticsConsentProvider 의 동의 게이트와 같은 패턴).
 * 서버 스냅샷은 항상 false 라 SSR 마크업이 변하지 않고, 클라이언트 스냅샷이
 * 기능 감지를 대신한다. WebMCP 는 순수 프로그레시브 인핸스먼트다.
 *
 * @param props.profile 전역 도구에 전달할 site config 최소 투영.
 */
const WebMcpTools = ({ profile }: { profile: WebMcpProfile }) => {
  const supported = useSyncExternalStore(subscribeNothing, isWebMcpSupported, () => false);
  return supported ? <WebMcpGlobalTools profile={profile} /> : null;
};

export { WebMcpTools };
