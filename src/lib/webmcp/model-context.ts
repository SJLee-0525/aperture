/**
 * WebMCP API 접근을 한곳에 모은 어댑터.
 *
 * 훅과 도구는 이 파일이 내보내는 타입과 함수만 사용한다. 미지원 브라우저와 SSR에서는
 * 아무 작업도 하지 않는다.
 */

import { clampToolText } from "@/lib/webmcp/tool-output";

/** 조회 도구는 true, UI 상태를 바꾸는 도구는 false로 표시한다. */
type WebMcpToolAnnotations = {
  readOnlyHint: boolean;
  untrustedContentHint: boolean;
};

/** 이름과 설명 길이 제한을 따르는 WebMCP 도구 정의. */
type WebMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: WebMcpToolAnnotations;
};

/** 도구 실행 결과. 페이지를 이동하면 null을 반환한다. */
type WebMcpExecute = (args: Record<string, unknown>) => string | null | Promise<string | null>;

/** 현재 Chrome 구현에 맞춘 내부 WebMCP 타입. */
type SpecModelContext = {
  registerTool(
    tool: WebMcpToolDefinition & {
      execute: (args: Record<string, unknown>) => Promise<string>;
    },
    options?: { signal?: AbortSignal },
  ): void | Promise<void>;
};

/**
 * WebMCP 진입점을 찾는다. SSR과 미지원 브라우저에서는 null이다.
 *
 * @returns {SpecModelContext | null}
 */
const specModelContext = (): SpecModelContext | null => {
  if (typeof document === "undefined") return null;
  return (
    (document as Document & { modelContext?: SpecModelContext }).modelContext ??
    // Chrome 버전에 따라 navigator 또는 document에 노출되므로 두 진입점을 확인한다.
    (navigator as Navigator & { modelContext?: SpecModelContext }).modelContext ??
    null
  );
};

/**
 * WebMCP 지원 여부 — dynamic import 게이트(WebMcpTools)가 사용한다.
 *
 * @returns {boolean}
 */
const isWebMcpSupported = (): boolean => specModelContext() !== null;

/** 예외를 에이전트가 이해할 수 있는 오류 문자열로 바꾼다. */
const TOOL_FAILURE_MESSAGE = "Tool failed. Try again or navigate the site manually.";

/**
 * WebMCP 도구를 등록한다. 등록을 시도하면 true, 건너뛰면 false다.
 * `/admin` 가드를 여기(모든 등록의 단일 통과점)에 둔다. admin 은 로케일 밖 경로라
 * 프리픽스 스트립이 필요 없고, 공개 트리 컴포넌트는 /admin 이동 시 반드시 unmount
 * 되므로 등록 시점 1회 검사로 충분하다.
 *
 * 등록 실패는 React effect 밖으로 전파하지 않는다.
 *
 * @param {WebMcpToolDefinition} definition 모듈 레벨 상수로 선언된 도구 정의.
 * @param {WebMcpExecute} execute 도구 실행 콜백 — 문자열(또는 null) 결과를 반환.
 * @param {AbortSignal} signal abort 시 등록 해제.
 * @returns {boolean} 등록을 시도했는지 여부(no-op 이면 false).
 */
const registerWebMcpTool = (
  definition: WebMcpToolDefinition,
  execute: WebMcpExecute,
  signal: AbortSignal,
): boolean => {
  const context = specModelContext();
  if (!context) return false;
  if (window.location.pathname.startsWith("/admin")) return false;

  try {
    // 모든 도구 출력에 1,500자 제한을 적용한다.
    const result = context.registerTool(
      {
        ...definition,
        execute: async (args) => {
          try {
            return clampToolText((await execute(args ?? {})) ?? "");
          } catch {
            return TOOL_FAILURE_MESSAGE;
          }
        },
      },
      { signal },
    );
    void Promise.resolve(result).catch(() => {});
  } catch {
    return false;
  }
  return true;
};

export { isWebMcpSupported, registerWebMcpTool };
export type { WebMcpExecute, WebMcpToolDefinition };
