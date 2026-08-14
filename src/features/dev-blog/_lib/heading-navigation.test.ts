// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { navigateToHeading, restoreScroll } from "@/features/dev-blog/_lib/heading-navigation";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("@/lib/navigation/replace-current-url", () => ({
  pushCurrentUrl: (href: string) => mocks.push(href),
}));

describe("navigateToHeading", () => {
  beforeEach(() => {
    document.body.innerHTML = '<h2 id="why">왜</h2>';
    window.history.replaceState({}, "", "/ko/dev/articles/a1");
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
  });

  afterEach(() => {
    mocks.push.mockClear();
    vi.restoreAllMocks();
  });

  it("이동 전에 지금 스크롤 위치를 현재 기록에 남긴다", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    Object.defineProperty(window, "scrollY", { value: 820, configurable: true });

    navigateToHeading("why");

    expect(replaceState).toHaveBeenCalledWith(expect.objectContaining({ scrollY: 820 }), "");
    expect(mocks.push).toHaveBeenCalledWith("/ko/dev/articles/a1#why");
  });

  it("대상 제목에 포커스를 옮겨 낭독기가 새 절부터 읽게 한다", () => {
    navigateToHeading("why");

    const heading = document.getElementById("why");
    expect(heading?.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(heading);
  });

  it("없는 id 는 주소를 바꾸지 않는다", () => {
    navigateToHeading("does-not-exist");

    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe("restoreScroll", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
  });

  it("저장한 위치가 있을 때만 되돌린다", () => {
    expect(restoreScroll({ state: { scrollY: 640 } } as PopStateEvent)).toBe(true);
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 640 }));
  });

  it("새로 만든 기록에는 손대지 않는다", () => {
    // 목차 이동이 만든 entry 에는 scrollY 가 없다 — 앞으로 가기가 엉뚱한 곳으로 튀지 않게 한다.
    expect(restoreScroll({ state: null } as PopStateEvent)).toBe(false);
    expect(restoreScroll({ state: {} } as PopStateEvent)).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("복원한 위치는 entry 에서 지운다 — 합성 popstate 가 같은 값으로 되감지 못한다", () => {
    window.history.replaceState({ scrollY: 640, routing: "keep" }, "");

    expect(restoreScroll({ state: { scrollY: 640 } } as PopStateEvent)).toBe(true);
    expect(window.history.state).toEqual({ routing: "keep" });
  });
});
