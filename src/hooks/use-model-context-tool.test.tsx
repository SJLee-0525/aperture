// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WebMcpExecute, WebMcpToolDefinition } from "@/lib/webmcp/model-context";

const adapter = vi.hoisted(() => ({
  registerWebMcpTool: vi.fn<
    (
      definition: import("@/lib/webmcp/model-context").WebMcpToolDefinition,
      execute: import("@/lib/webmcp/model-context").WebMcpExecute,
      signal: AbortSignal,
    ) => boolean
  >(() => true),
}));

vi.mock("@/lib/webmcp/model-context", () => ({
  registerWebMcpTool: adapter.registerWebMcpTool,
}));

import { useModelContextTool } from "./use-model-context-tool";

const DEFINITION: WebMcpToolDefinition = {
  name: "list_albums",
  description: "List published photo albums.",
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

describe("useModelContextTool", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("마운트당 1회만 등록한다 — 리렌더는 재등록을 만들지 않는다", () => {
    const { rerender } = renderHook(
      ({ execute }: { execute: WebMcpExecute }) => useModelContextTool(DEFINITION, execute),
      { initialProps: { execute: () => "one" } },
    );
    rerender({ execute: () => "two" });
    rerender({ execute: () => "three" });

    expect(adapter.registerWebMcpTool).toHaveBeenCalledTimes(1);
  });

  it("등록된 execute 는 항상 최신 클로저를 호출한다", async () => {
    const { rerender } = renderHook(
      ({ value }: { value: string }) => useModelContextTool(DEFINITION, () => value),
      { initialProps: { value: "first" } },
    );
    rerender({ value: "latest" });

    const captured = adapter.registerWebMcpTool.mock.calls[0]?.[1] as WebMcpExecute;
    await expect(Promise.resolve(captured({}))).resolves.toBe("latest");
  });

  it("unmount 시 등록 signal 을 abort 한다", () => {
    const { unmount } = renderHook(() => useModelContextTool(DEFINITION, () => "ok"));
    const signal = adapter.registerWebMcpTool.mock.calls[0]?.[2] as AbortSignal;

    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
