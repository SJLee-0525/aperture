// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RevalidateFailureBanner } from "@/features/admin-maintenance/_components/RevalidateFailureBanner";

import { recordRevalidateFailure } from "@/lib/cache/revalidate-failure-store";

const mocks = vi.hoisted(() => ({ revalidatePublicPages: vi.fn() }));

vi.mock("@/lib/cache/revalidate-public", () => ({
  revalidatePublicPages: mocks.revalidatePublicPages,
}));

vi.mock("@/lib/supabase/auth", () => ({
  getAdminAccessToken: async () => "id-token",
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  mocks.revalidatePublicPages.mockReset();
});

describe("RevalidateFailureBanner", () => {
  it("남은 실패가 없으면 아무것도 그리지 않는다", () => {
    render(<RevalidateFailureBanner />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("실패한 대상 수를 알리고 재시도가 성공하면 사라진다", async () => {
    mocks.revalidatePublicPages.mockResolvedValue(undefined);
    recordRevalidateFailure({
      tags: ["firestore:devArticles"],
      paths: ["/ko/dev/articles/a", "/en/dev/articles/a"],
      reason: "Unauthorized",
    });
    render(<RevalidateFailureBanner />);

    expect(screen.getByRole("alert").textContent).toContain("3곳");

    fireEvent.click(screen.getByRole("button", { name: "지금 다시 시도" }));

    await waitFor(() =>
      expect(mocks.revalidatePublicPages).toHaveBeenCalledWith(
        "id-token",
        ["firestore:devArticles"],
        ["/ko/dev/articles/a", "/en/dev/articles/a"],
      ),
    );
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("재시도가 실패하면 사유를 덧붙이고 대상을 남긴다", async () => {
    mocks.revalidatePublicPages.mockRejectedValue(new Error("Unauthorized cache revalidation"));
    recordRevalidateFailure({ tags: ["firestore:photos"], paths: [], reason: "네트워크" });
    render(<RevalidateFailureBanner />);

    fireEvent.click(screen.getByRole("button", { name: "지금 다시 시도" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Unauthorized cache revalidation"),
    );
    expect(screen.getByRole("button", { name: "지금 다시 시도" })).toBeTruthy();
  });
});
