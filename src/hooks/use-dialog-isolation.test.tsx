// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useDialogIsolation } from "@/hooks/use-dialog-isolation";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe("useDialogIsolation", () => {
  it("dialog 외 body 콘텐츠를 inert 처리하고 닫힐 때 원래 상태를 복원한다", () => {
    const page = document.createElement("main");
    const alreadyHidden = document.createElement("aside");
    alreadyHidden.inert = true;
    const overlay = document.createElement("div");
    overlay.dataset.testDialog = "true";
    document.body.append(page, alreadyHidden, overlay);

    const { rerender } = renderHook(
      ({ active }) => useDialogIsolation(active, "[data-test-dialog]"),
      { initialProps: { active: true } },
    );

    expect(page.inert).toBe(true);
    expect(overlay.inert).not.toBe(true);

    rerender({ active: false });
    expect(page.inert).not.toBe(true);
    expect(alreadyHidden.inert).toBe(true);
  });
});
