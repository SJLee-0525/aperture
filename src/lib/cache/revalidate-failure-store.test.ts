// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@/constants/storage-keys";
import {
  clearRevalidateFailure,
  readRevalidateFailure,
  recordRevalidateFailure,
  subscribeRevalidateFailure,
} from "@/lib/cache/revalidate-failure-store";

afterEach(() => {
  localStorage.clear();
});

describe("revalidate-failure-store", () => {
  it("실패한 대상과 사유를 남긴다", () => {
    recordRevalidateFailure({
      tags: ["firestore:devArticles"],
      paths: ["/ko/dev/articles/a"],
      reason: "Unauthorized",
    });

    const failure = readRevalidateFailure();
    expect(failure?.tags).toEqual(["firestore:devArticles"]);
    expect(failure?.paths).toEqual(["/ko/dev/articles/a"]);
    expect(failure?.reason).toBe("Unauthorized");
  });

  it("연속 실패는 대상을 합쳐 한 번에 다시 시도할 수 있게 한다", () => {
    recordRevalidateFailure({ tags: ["firestore:photos"], paths: [], reason: "1차" });
    recordRevalidateFailure({
      tags: ["firestore:photos", "firestore:devArticles"],
      paths: ["/ko/dev/articles/a"],
      reason: "2차",
    });

    const failure = readRevalidateFailure();
    // 같은 태그가 두 번 들어가면 재시도가 같은 무효화를 두 번 보낸다.
    expect(failure?.tags).toEqual(["firestore:photos", "firestore:devArticles"]);
    expect(failure?.paths).toEqual(["/ko/dev/articles/a"]);
    expect(failure?.reason).toBe("2차");
  });

  it("재시도가 성공하면 기록이 사라진다", () => {
    recordRevalidateFailure({ tags: ["firestore:photos"], paths: [], reason: "실패" });
    clearRevalidateFailure();

    expect(readRevalidateFailure()).toBeNull();
  });

  it("기록이 바뀌면 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRevalidateFailure(listener);

    recordRevalidateFailure({ tags: ["firestore:photos"], paths: [], reason: "실패" });
    expect(listener).toHaveBeenCalledTimes(1);

    clearRevalidateFailure();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    recordRevalidateFailure({ tags: ["firestore:albums"], paths: [], reason: "실패" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("깨진 값은 없는 것으로 본다", () => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE, "{not json");
    expect(readRevalidateFailure()).toBeNull();

    localStorage.setItem(STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE, JSON.stringify({ tags: "x" }));
    expect(readRevalidateFailure()).toBeNull();
  });
});
