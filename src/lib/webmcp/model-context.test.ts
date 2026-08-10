// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { isWebMcpSupported, registerWebMcpTool, type WebMcpToolDefinition } from "./model-context";

type RegisteredTool = WebMcpToolDefinition & {
  execute: (args: Record<string, unknown>) => Promise<string>;
};

const DEFINITION: WebMcpToolDefinition = {
  name: "list_albums",
  description: "List published photo albums.",
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

/** jsdom document 에 스펙 형태의 modelContext 를 주입한다. */
const installModelContext = () => {
  const registerTool = vi.fn();
  (document as Document & { modelContext?: unknown }).modelContext = { registerTool };
  return registerTool;
};

const uninstallModelContext = () => {
  delete (document as Document & { modelContext?: unknown }).modelContext;
  delete (navigator as Navigator & { modelContext?: unknown }).modelContext;
};

describe("model-context 어댑터", () => {
  afterEach(() => {
    uninstallModelContext();
    window.history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  it("modelContext 가 없으면 지원 false + 등록 no-op", () => {
    expect(isWebMcpSupported()).toBe(false);
    const registered = registerWebMcpTool(DEFINITION, () => "ok", new AbortController().signal);
    expect(registered).toBe(false);
  });

  it("Chrome 149 의 구 진입점(navigator.modelContext)도 지원한다", () => {
    const registerTool = vi.fn();
    (navigator as Navigator & { modelContext?: unknown }).modelContext = { registerTool };

    expect(isWebMcpSupported()).toBe(true);
    expect(registerWebMcpTool(DEFINITION, () => "ok", new AbortController().signal)).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(1);
  });

  it("document 진입점이 있으면 구 진입점보다 우선한다", () => {
    const documentRegister = installModelContext();
    const navigatorRegister = vi.fn();
    (navigator as Navigator & { modelContext?: unknown }).modelContext = {
      registerTool: navigatorRegister,
    };

    registerWebMcpTool(DEFINITION, () => "ok", new AbortController().signal);
    expect(documentRegister).toHaveBeenCalledTimes(1);
    expect(navigatorRegister).not.toHaveBeenCalled();
  });

  it("스펙 형태(정의 + execute + signal)로 등록을 전달한다", () => {
    const registerTool = installModelContext();
    const signal = new AbortController().signal;

    expect(isWebMcpSupported()).toBe(true);
    expect(registerWebMcpTool(DEFINITION, () => "ok", signal)).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(1);

    const [tool, options] = registerTool.mock.calls[0] as [RegisteredTool, { signal: AbortSignal }];
    expect(tool).toMatchObject(DEFINITION);
    expect(typeof tool.execute).toBe("function");
    expect(options.signal).toBe(signal);
  });

  it("execute 결과를 문자열로 정규화한다 — null 은 빈 문자열, 예외는 안내 문장", async () => {
    const registerTool = installModelContext();

    registerWebMcpTool(DEFINITION, () => "done", new AbortController().signal);
    registerWebMcpTool(DEFINITION, () => null, new AbortController().signal);
    registerWebMcpTool(
      DEFINITION,
      () => {
        throw new Error("boom");
      },
      new AbortController().signal,
    );

    const [ok, nul, thrown] = registerTool.mock.calls.map((call) => call[0] as RegisteredTool);
    await expect(ok.execute({})).resolves.toBe("done");
    await expect(nul.execute({})).resolves.toBe("");
    await expect(thrown.execute({})).resolves.toBe(
      "Tool failed. Try again or navigate the site manually.",
    );
  });

  it("어댑터 반환점에서 1,500자 예산을 일괄 강제한다", async () => {
    const registerTool = installModelContext();

    registerWebMcpTool(DEFINITION, () => "y".repeat(4000), new AbortController().signal);

    const [tool] = registerTool.mock.calls[0] as [RegisteredTool];
    const clamped = await tool.execute({});
    expect(clamped.length).toBe(1500);
    expect(clamped.endsWith("…")).toBe(true);
  });

  it("등록의 동기 예외·Promise rejection 을 흡수한다 — effect 로 새지 않는다", async () => {
    const throwing = vi.fn(() => {
      throw new Error("duplicate tool name");
    });
    (document as Document & { modelContext?: unknown }).modelContext = { registerTool: throwing };
    expect(registerWebMcpTool(DEFINITION, () => "ok", new AbortController().signal)).toBe(false);

    const rejecting = vi.fn(() => Promise.reject(new Error("schema rejected")));
    (document as Document & { modelContext?: unknown }).modelContext = { registerTool: rejecting };
    expect(registerWebMcpTool(DEFINITION, () => "ok", new AbortController().signal)).toBe(true);
    // rejection 이 unhandled 로 새면 vitest 가 테스트를 실패시킨다 — microtask 를 비워 확인.
    await Promise.resolve();
    expect(rejecting).toHaveBeenCalledTimes(1);
  });

  it("/admin 경로에서는 지원 브라우저라도 등록하지 않는다", () => {
    const registerTool = installModelContext();
    window.history.replaceState(null, "", "/admin/photos");

    expect(registerWebMcpTool(DEFINITION, () => "ok", new AbortController().signal)).toBe(false);
    expect(registerTool).not.toHaveBeenCalled();
  });
});
