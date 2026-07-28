// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@/constants/storage-keys";
import { LikeButton } from "@/features/likes/_components/LikeButton";

const firebase = vi.hoisted(() => ({
  isConfigured: vi.fn(() => false),
  likePhoto: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/lib/firebase/config", () => ({
  isFirebaseConfigured: firebase.isConfigured,
}));

vi.mock("@/lib/firebase/likes", () => ({
  likePhoto: firebase.likePhoto,
}));

describe("LikeButton", () => {
  beforeEach(() => {
    firebase.isConfigured.mockReset();
    firebase.isConfigured.mockReturnValue(false);
    firebase.likePhoto.mockReset();
    firebase.likePhoto.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("서버의 초기 좋아요 수와 이 브라우저의 미좋아요 상태를 보여준다", () => {
    render(<LikeButton photoId="photo-1" initialLikes={5} />);

    const button = screen.getByRole("button", { name: "Like" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("로컬 환경에서 누르면 즉시 카운트를 올리고 좋아요 상태를 저장한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");
    render(<LikeButton photoId="photo-1" initialLikes={0} />);
    const button = screen.getByRole("button", { name: "Like" });

    fireEvent.click(button);

    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByText("1")).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEYS.LIKED_PHOTOS)).toBe('["photo-1"]');
  });

  it("이미 좋아요한 사진을 다시 눌러도 카운트를 중복 증가시키지 않는다", async () => {
    window.localStorage.setItem(STORAGE_KEYS.LIKED_PHOTOS, '["photo-1"]');
    render(<LikeButton photoId="photo-1" initialLikes={7} />);
    const button = screen.getByRole("button", { name: "Like" });
    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("true"));

    fireEvent.click(button);

    expect(screen.getByText("7")).toBeTruthy();
  });

  it("Firestore 반영 실패 시 카운트와 브라우저 좋아요 상태를 롤백한다", async () => {
    firebase.isConfigured.mockReturnValue(true);
    firebase.likePhoto.mockRejectedValue(new Error("write failed"));
    render(<LikeButton photoId="photo-1" initialLikes={2} />);
    const button = screen.getByRole("button", { name: "Like" });

    fireEvent.click(button);

    await waitFor(() => expect(firebase.likePhoto).toHaveBeenCalledWith("photo-1"));
    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("false"));
    expect(screen.getByText("2")).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEYS.LIKED_PHOTOS)).toBe("[]");
  });
});
