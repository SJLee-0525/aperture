// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDialog } from "@/hooks/use-dialog";
import { isScrollLockFixingBody } from "@/hooks/use-scroll-lock";

type Options = Parameters<typeof useDialog>[1];

const Overlay = ({
  open,
  options,
  onTop,
}: {
  open: boolean;
  options?: Options;
  onTop?: (value: boolean) => void;
}) => {
  const { panelRef, overlayRef, isTopLayer, mounted } = useDialog(open, options);
  onTop?.(isTopLayer);
  if (!open || !mounted) return null;
  return (
    <div ref={overlayRef} data-testid="overlay">
      <div ref={panelRef} role="dialog" aria-modal="true">
        <button type="button">닫기</button>
      </div>
    </div>
  );
};

afterEach(cleanup);

describe("useDialog", () => {
  it("열릴 때만 배경 스크롤을 잠근다", () => {
    const view = render(<Overlay open={false} />);
    expect(document.body.style.overflow).not.toBe("hidden");

    view.rerender(<Overlay open />);
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(<Overlay open={false} />);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("scrollLock 옵션을 그대로 통과시킨다", () => {
    render(<Overlay open options={{ scrollLock: { fixBodyOnMobile: false } }} />);

    // 오버레이마다 모바일 처리가 달라 인터페이스를 좁히지 않는다.
    expect(isScrollLockFixingBody()).toBe(false);
  });

  it("Escape 를 넘기면 최상위일 때 부른다", () => {
    const onEscape = vi.fn();
    render(<Overlay open options={{ escape: onEscape }} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("escape:false 여도 최상위 판정은 받는다", () => {
    // 자기 리스너를 가진 오버레이도 같은 stack 에서 순서를 받아야 겹칠 때 맞는다.
    const tops: boolean[] = [];
    render(<Overlay open options={{ escape: false }} onTop={(value) => tops.push(value)} />);

    expect(tops.at(-1)).toBe(true);
  });

  it("겹치면 위 오버레이만 Escape 를 소비한다", () => {
    const below = vi.fn();
    const above = vi.fn();
    render(
      <>
        <Overlay open options={{ escape: below }} />
        <Overlay open options={{ escape: above }} />
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(above).toHaveBeenCalledTimes(1);
    expect(below).not.toHaveBeenCalled();
  });

  it("isolate 를 켜야 나머지 body 를 격리한다", () => {
    const sibling = document.createElement("div");
    document.body.append(sibling);

    const view = render(<Overlay open options={{ isolate: true }} />);
    expect(sibling.inert).toBe(true);

    view.unmount();
    expect(Boolean(sibling.inert)).toBe(false);
    sibling.remove();
  });

  it("isolate 를 끄면 격리하지 않는다", () => {
    const sibling = document.createElement("div");
    document.body.append(sibling);

    render(<Overlay open />);

    // 전면 스크림이 있는 모달은 스크림이 클릭을 막아 격리가 겹친다.
    expect(Boolean(sibling.inert)).toBe(false);
    sibling.remove();
  });
});
