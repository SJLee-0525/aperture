// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePhotoPanelSheet } from "@/features/photo-detail/_hooks/use-photo-panel-sheet";

import type { TouchEvent, UIEvent, WheelEvent } from "react";

/** `<aside>` 대역. 훅이 읽는 것은 scrollTop 과 scrollTo 뿐이다. */
const panel = (scrollTop = 0) => {
  const node = document.createElement("aside");
  Object.defineProperty(node, "scrollTop", { value: scrollTop, writable: true });
  node.scrollTo = vi.fn();
  return node;
};

const touch = (target: HTMLElement, clientY: number | null) =>
  ({
    currentTarget: target,
    touches: clientY == null ? [] : [{ clientY }],
  }) as unknown as TouchEvent<HTMLElement>;

const scroll = (target: HTMLElement) => ({ currentTarget: target }) as UIEvent<HTMLElement>;
const wheel = (target: HTMLElement, deltaY: number) =>
  ({ currentTarget: target, deltaY }) as WheelEvent<HTMLElement>;

/** 훅을 렌더하고 panelRef 에 대역을 붙인다. 접기·펴기가 그 노드를 쓴다. */
const mount = (node: HTMLElement) => {
  const view = renderHook(() => usePhotoPanelSheet());
  act(() => {
    (view.result.current.panelProps.ref as { current: HTMLElement | null }).current = node;
  });
  return view;
};

afterEach(cleanup);

describe("펼치는 입력 셋", () => {
  it("스크롤이 8px 를 넘으면 펼친다", () => {
    const node = panel(9);
    const { result } = mount(node);

    act(() => result.current.panelProps.onScroll(scroll(node)));

    expect(result.current.expanded).toBe(true);
  });

  it("8px 이하 스크롤은 펼치지 않는다", () => {
    const node = panel(8);
    const { result } = mount(node);

    act(() => result.current.panelProps.onScroll(scroll(node)));

    expect(result.current.expanded).toBe(false);
  });

  it("위로 8px 넘게 스와이프하면 펼친다", () => {
    const node = panel();
    const { result } = mount(node);

    act(() => result.current.panelProps.onTouchStart(touch(node, 300)));
    act(() => result.current.panelProps.onTouchMove(touch(node, 291)));

    expect(result.current.expanded).toBe(true);
  });

  it("아래로 굴린 휠이 8px 를 넘으면 펼친다", () => {
    const node = panel();
    const { result } = mount(node);

    act(() => result.current.panelProps.onWheel(wheel(node, 5)));
    expect(result.current.expanded).toBe(false);

    act(() => result.current.panelProps.onWheel(wheel(node, 5)));
    expect(result.current.expanded).toBe(true);
  });

  it("방향이 바뀌면 누적을 버리고 다시 센다", () => {
    // 위아래로 흔드는 동안 조금씩 쌓인 값으로 펼쳐지면 의도하지 않은 전환이 된다.
    const node = panel();
    const { result } = mount(node);

    act(() => result.current.panelProps.onWheel(wheel(node, 7)));
    act(() => result.current.panelProps.onWheel(wheel(node, -3)));
    act(() => result.current.panelProps.onWheel(wheel(node, 7)));

    expect(result.current.expanded).toBe(false);
  });
});

describe("접는 입력 셋", () => {
  const expand = (node: HTMLElement, result: { current: ReturnType<typeof usePhotoPanelSheet> }) => {
    act(() => result.current.toggleExpanded());
    expect(result.current.expanded).toBe(true);
  };

  it("최상단에서 56px 를 넘게 당기면 접는다", () => {
    const node = panel();
    const { result } = mount(node);
    expand(node, result);

    act(() => result.current.panelProps.onTouchStart(touch(node, 100)));
    act(() => result.current.panelProps.onTouchMove(touch(node, 157)));

    expect(result.current.expanded).toBe(false);
  });

  it("56px 이하로 당기면 그대로 둔다", () => {
    const node = panel();
    const { result } = mount(node);
    expand(node, result);

    act(() => result.current.panelProps.onTouchStart(touch(node, 100)));
    act(() => result.current.panelProps.onTouchMove(touch(node, 156)));

    expect(result.current.expanded).toBe(true);
  });

  it("최상단이 아니면 당겨도 접지 않는다", () => {
    // 본문을 읽다가 위로 스크롤하는 동작이 패널을 닫아 버리면 안 된다.
    const node = panel(40);
    const { result } = mount(node);
    expand(node, result);

    act(() => result.current.panelProps.onTouchStart(touch(node, 100)));
    act(() => result.current.panelProps.onTouchMove(touch(node, 300)));

    expect(result.current.expanded).toBe(true);
  });

  it("최상단에서 역방향 휠이 80px 를 넘으면 접는다", () => {
    const node = panel();
    const { result } = mount(node);
    expand(node, result);

    act(() => result.current.panelProps.onWheel(wheel(node, -50)));
    expect(result.current.expanded).toBe(true);

    act(() => result.current.panelProps.onWheel(wheel(node, -40)));
    expect(result.current.expanded).toBe(false);
  });

  it("최상단에 닿기 전의 역스크롤은 누적하지 않는다", () => {
    const node = panel(40);
    const { result } = mount(node);
    expand(node, result);

    act(() => result.current.panelProps.onWheel(wheel(node, -200)));

    expect(result.current.expanded).toBe(true);
  });

  it("손잡이 버튼은 상태를 뒤집는다", () => {
    const node = panel();
    const { result } = mount(node);

    act(() => result.current.toggleExpanded());
    expect(result.current.expanded).toBe(true);

    act(() => result.current.toggleExpanded());
    expect(result.current.expanded).toBe(false);
  });
});

describe("크롬 표시", () => {
  it("접으면 사진 위 크롬을 다시 보여 준다", () => {
    // 펼친 동안 숨긴 크롬이 접힌 뒤에도 숨어 있으면 이동 버튼을 찾을 수 없다.
    const node = panel();
    const { result } = mount(node);

    act(() => result.current.toggleChrome());
    expect(result.current.chromeVisible).toBe(false);

    act(() => result.current.toggleExpanded());
    act(() => result.current.toggleExpanded());

    expect(result.current.chromeVisible).toBe(true);
  });

  it("이미 접혀 있으면 collapse 가 아무 일도 하지 않는다", () => {
    const node = panel();
    const { result } = mount(node);

    act(() => result.current.toggleChrome());
    act(() => result.current.collapse());

    expect(result.current.chromeVisible).toBe(false);
  });

  it("사진이 바뀌면 펼침과 크롬을 기본 상태로 되돌린다", () => {
    const node = panel();
    const { result } = mount(node);

    act(() => result.current.toggleExpanded());
    act(() => result.current.toggleChrome());
    act(() => result.current.reset());

    expect(result.current.expanded).toBe(false);
    expect(result.current.chromeVisible).toBe(true);
  });
});
