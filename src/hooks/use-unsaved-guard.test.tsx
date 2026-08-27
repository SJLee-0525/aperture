// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

const Guarded = ({ dirty }: { dirty: boolean }) => {
  useUnsavedGuard(dirty);
  return null;
};

const fireBeforeUnload = (): boolean => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("useUnsavedGuard", () => {
  afterEach(cleanup);

  it("dirty 가 아니면 이탈을 막지 않는다", () => {
    render(<Guarded dirty={false} />);

    expect(fireBeforeUnload()).toBe(false);
  });

  it("dirty 이면 브라우저 확인창 조건인 preventDefault 를 부른다", () => {
    render(<Guarded dirty />);

    expect(fireBeforeUnload()).toBe(true);
  });

  it("dirty 가 풀리면 리스너를 걷는다", () => {
    const view = render(<Guarded dirty />);
    view.rerender(<Guarded dirty={false} />);

    expect(fireBeforeUnload()).toBe(false);
  });

  it("언마운트하면 리스너가 남지 않는다", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    render(<Guarded dirty />).unmount();

    expect(remove).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    remove.mockRestore();
    expect(fireBeforeUnload()).toBe(false);
  });
});
