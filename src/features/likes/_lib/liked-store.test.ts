// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@/constants/storage-keys";
import { addLiked, hasLiked, removeLiked, subscribe } from "@/features/likes/_lib/liked-store";

describe("liked-store", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("좋아요한 사진 id를 localStorage에 저장하고 조회한다", () => {
    addLiked("photo-1");

    expect(hasLiked("photo-1")).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEYS.LIKED_PHOTOS)).toBe('["photo-1"]');
  });

  it("기존 좋아요를 보존하면서 중복 없이 사진을 추가한다", () => {
    window.localStorage.setItem(STORAGE_KEYS.LIKED_PHOTOS, '["photo-1"]');

    addLiked("photo-2");
    addLiked("photo-1");

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.LIKED_PHOTOS) ?? "[]")).toEqual([
      "photo-1",
      "photo-2",
    ]);
  });

  it("선택한 사진만 좋아요 목록에서 제거한다", () => {
    window.localStorage.setItem(STORAGE_KEYS.LIKED_PHOTOS, '["photo-1","photo-2"]');

    removeLiked("photo-1");

    expect(hasLiked("photo-1")).toBe(false);
    expect(hasLiked("photo-2")).toBe(true);
  });

  it("손상된 localStorage 값은 빈 좋아요 목록으로 취급한다", () => {
    window.localStorage.setItem(STORAGE_KEYS.LIKED_PHOTOS, "{invalid");

    expect(hasLiked("photo-1")).toBe(false);
  });

  it("localStorage 쓰기가 불가능해도 좋아요 동작에서 오류를 던지지 않는다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("storage unavailable");
    });

    expect(() => addLiked("photo-1")).not.toThrow();
  });

  it("같은 탭의 추가·제거와 다른 탭의 storage 변경을 구독자에게 알린다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    addLiked("photo-1");
    removeLiked("photo-1");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.LIKED_PHOTOS,
        newValue: '["photo-2"]',
      }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));

    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it("구독 해제 후에는 변경을 알리지 않는다", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();

    addLiked("photo-1");
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.LIKED_PHOTOS }));

    expect(listener).not.toHaveBeenCalled();
  });
});
