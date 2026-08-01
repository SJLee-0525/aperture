// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { pushCurrentUrl, replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

describe("current URL navigation", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/photo");
  });

  it("replaceState 뒤에 search params 동기화 이벤트를 한 번 발생시킨다", () => {
    const onPopState = vi.fn();
    window.addEventListener("popstate", onPopState);

    replaceCurrentUrl("/photo?photo=p02");

    expect(window.location.search).toBe("?photo=p02");
    expect(onPopState).toHaveBeenCalledOnce();
    window.removeEventListener("popstate", onPopState);
  });

  it("pushState 뒤에도 search params 동기화 이벤트를 한 번 발생시킨다", () => {
    const onPopState = vi.fn();
    window.addEventListener("popstate", onPopState);

    pushCurrentUrl("/photo?photo=p02");

    expect(window.location.search).toBe("?photo=p02");
    expect(onPopState).toHaveBeenCalledOnce();
    window.removeEventListener("popstate", onPopState);
  });
});
