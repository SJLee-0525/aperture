"use client";

import { useEffect, useRef } from "react";

import {
  registerWebMcpTool,
  type WebMcpExecute,
  type WebMcpToolDefinition,
} from "@/lib/webmcp/model-context";

/**
 * WebMCP 도구 1개를 컴포넌트 수명에 묶는다 — 마운트 시 등록, unmount 시 abort 로 해제.
 *
 * `definition` 은 반드시 **모듈 레벨 상수**여야 한다(렌더마다 재생성 금지). 등록은
 * 마운트당 1회이고, 필터 상태·언어 등 변하는 값은 executeRef 를 거쳐 항상 최신
 * 클로저로 읽힌다 — 상태 변경마다 abort/재등록 churn 을 만들지 않는다.
 *
 * @param {WebMcpToolDefinition} definition 모듈 레벨 상수 도구 정의.
 * @param {WebMcpExecute} execute 실행 콜백 — 렌더마다 새로 만들어도 안전(ref 경유).
 * @returns {void}
 */
const useModelContextTool = (definition: WebMcpToolDefinition, execute: WebMcpExecute): void => {
  const executeRef = useRef(execute);
  useEffect(() => {
    executeRef.current = execute;
  });

  useEffect(() => {
    const controller = new AbortController();
    registerWebMcpTool(definition, (args) => executeRef.current(args), controller.signal);
    return () => controller.abort();
  }, [definition]);
};

export { useModelContextTool };
