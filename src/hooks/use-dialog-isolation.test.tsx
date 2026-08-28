// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { createRef } from "react";
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
    document.body.append(page, alreadyHidden, overlay);
    const overlayRef = createRef<HTMLElement>();
    overlayRef.current = overlay;

    const { rerender } = renderHook(({ active }) => useDialogIsolation(active, overlayRef), {
      initialProps: { active: true },
    });

    expect(page.inert).toBe(true);
    expect(overlay.inert).not.toBe(true);

    rerender({ active: false });
    expect(page.inert).not.toBe(true);
    expect(alreadyHidden.inert).toBe(true);
  });

  // 선택자로 첫 매치를 고르면 같은 마크업이 두 번 마운트됐을 때 다른 노드를 집어
  // dialog 가 자기 자신을 inert 로 만든다. ref 는 그 혼동이 없다.
  it("같은 표식을 가진 노드가 둘이어도 ref 가 가리키는 오버레이만 제외한다", () => {
    const decoy = document.createElement("div");
    const overlay = document.createElement("div");
    document.body.append(decoy, overlay);
    const overlayRef = createRef<HTMLElement>();
    overlayRef.current = overlay;

    renderHook(() => useDialogIsolation(true, overlayRef));

    expect(decoy.inert).toBe(true);
    expect(overlay.inert).not.toBe(true);
  });

  it("오버레이가 body 직속이 아니면 그것을 품은 조상을 제외한다", () => {
    const host = document.createElement("div");
    const overlay = document.createElement("div");
    host.append(overlay);
    const other = document.createElement("main");
    document.body.append(host, other);
    const overlayRef = createRef<HTMLElement>();
    overlayRef.current = overlay;

    renderHook(() => useDialogIsolation(true, overlayRef));

    expect(host.inert).not.toBe(true);
    expect(other.inert).toBe(true);
  });
});
