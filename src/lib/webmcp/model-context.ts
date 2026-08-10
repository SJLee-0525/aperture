/**
 * WebMCP 스펙 접점 — `document.modelContext` 를 만지는 유일한 파일 (ADR-0003).
 *
 * 진입점이 이미 `navigator.modelContext` → `document.modelContext` 로 한 번 옮겨간
 * 오리진 트라이얼 API 라, 스펙이 또 바뀌면 이 파일만 고친다. 훅과 도구 정의는
 * 여기서 export 하는 타입·함수만 본다. 미지원 브라우저·SSR 에서는 전 구간 no-op.
 */

import { clampToolText } from "@/lib/webmcp/tool-output";

/** 도구의 부작용 힌트 — 조회 도구는 readOnlyHint true, UI 상태(필터·모달) 변경 도구는 false. */
type WebMcpToolAnnotations = {
  readOnlyHint: boolean;
  untrustedContentHint: boolean;
};

/** 도구 정의 — name ≤30자·description ≤500자 영어(secure-tools 문자 예산). 모듈 레벨 상수로 선언한다. */
type WebMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: WebMcpToolAnnotations;
};

/** 도구 실행 — 문자열 결과를 반환한다. 페이지 이동을 유발하면 null. */
type WebMcpExecute = (args: Record<string, unknown>) => string | null | Promise<string | null>;

/** 스펙 형태(내부 전용) — Chrome 문서 기준 execute 는 문자열을 resolve 한다. */
type SpecModelContext = {
  registerTool(
    tool: WebMcpToolDefinition & {
      execute: (args: Record<string, unknown>) => Promise<string>;
    },
    options?: { signal?: AbortSignal },
  ): void | Promise<void>;
};

/**
 * 스펙 진입점 조회 — SSR·미지원 브라우저에서는 null.
 *
 * @returns {SpecModelContext | null}
 */
const specModelContext = (): SpecModelContext | null => {
  if (typeof document === "undefined") return null;
  return (document as Document & { modelContext?: SpecModelContext }).modelContext ?? null;
};

/**
 * WebMCP 지원 여부 — dynamic import 게이트(WebMcpTools)가 사용한다.
 *
 * @returns {boolean}
 */
const isWebMcpSupported = (): boolean => specModelContext() !== null;

/** 예외를 스펙으로 전파하지 않는다 — 에이전트에게 다음 행동이 보이는 문장으로 대체. */
const TOOL_FAILURE_MESSAGE = "Tool failed. Try again or navigate the site manually.";

/**
 * 도구 등록 — 등록되면 true, no-op 이면 false.
 * `/admin` 가드를 여기(모든 등록의 단일 통과점)에 둔다. admin 은 로케일 밖 경로라
 * 프리픽스 스트립이 필요 없고, 공개 트리 컴포넌트는 /admin 이동 시 반드시 unmount
 * 되므로 등록 시점 1회 검사로 충분하다.
 *
 * 등록 실패(권한·중복 이름·스키마 거부)도 여기서 흡수한다 — 스펙의 동기 예외와 Promise
 * rejection 이 React effect 오류·unhandled rejection 으로 새면 프로그레시브 인핸스먼트가 깨진다.
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
    // 개별 도구가 놓친 출력도 어댑터 반환점에서 1,500자 예산을 일괄 강제한다(완료 기준 §11).
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
