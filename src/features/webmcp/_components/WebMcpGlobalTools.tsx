"use client";

import { useGlobalTools, type WebMcpProfile } from "@/features/webmcp/_hooks/use-global-tools";

/**
 * 전역 도구 등록만 담당하는 무표시 컴포넌트 — WebMcpTools 게이트가 dynamic import 한다.
 *
 * @param {{ profile: WebMcpProfile }} props
 * @param {WebMcpProfile} props.profile site config 최소 투영(name·tagline·bio).
 * @returns {null} 화면에 아무것도 그리지 않는다.
 */
const WebMcpGlobalTools = ({ profile }: { profile: WebMcpProfile }) => {
  useGlobalTools(profile);
  return null;
};

export { WebMcpGlobalTools };
