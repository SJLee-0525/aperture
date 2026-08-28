// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminFormShell } from "@/features/admin-shell/_components/AdminFormShell";

type Options = {
  error?: string | null;
  pending?: { savedAt: number } | null;
  busy?: boolean;
  saving?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
  onRestore?: (restored: unknown) => void;
  discard?: () => void;
};

const Harness = (options: Options) => {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <AdminFormShell
      title="새 영상"
      formRef={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        options.onSubmit?.();
      }}
      onCancel={() => options.onCancel?.()}
      busy={options.busy ?? false}
      saving={options.saving ?? false}
      error={options.error ?? null}
      recovery={{
        pending: options.pending ?? null,
        restore: () => ({ title: "복구본" }),
        discard: () => options.discard?.(),
      }}
      onRestore={(restored) => options.onRestore?.(restored)}
    >
      <p>본문</p>
    </AdminFormShell>
  );
};

afterEach(cleanup);

describe("AdminFormShell", () => {
  it("제목과 children 을 그리고 오류가 없으면 alert 도 없다", () => {
    render(<Harness />);

    expect(screen.getByRole("heading", { name: "새 영상" })).toBeTruthy();
    expect(screen.getByText("본문")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("오류 문단은 저장소 실패 전용이다", () => {
    render(<Harness error="저장에 실패했습니다." />);

    expect(screen.getByRole("alert").textContent).toBe("저장에 실패했습니다.");
  });

  it("복구본이 없으면 안내를 그리지 않는다", () => {
    render(<Harness />);

    expect(screen.queryByRole("button", { name: "복구하기" })).toBeNull();
  });

  it("복구를 고르면 복구본을 폼으로 올린다", async () => {
    const onRestore = vi.fn();
    render(<Harness pending={{ savedAt: Date.now() }} onRestore={onRestore} />);

    await userEvent.click(screen.getByRole("button", { name: "복구하기" }));

    expect(onRestore).toHaveBeenCalledWith({ title: "복구본" });
  });

  it("저장 중에는 두 버튼을 잠그고 문구를 바꾼다", () => {
    render(<Harness busy saving />);

    expect(screen.getByRole("button", { name: "저장 중…" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "취소" }).hasAttribute("disabled")).toBe(true);
  });

  it("업로드 중에는 잠그되 저장 문구는 그대로다", () => {
    // busy 는 saving 보다 넓다. 업로드가 도는 동안에도 제출을 막아야 한다.
    render(<Harness busy />);

    expect(screen.getByRole("button", { name: "저장" }).hasAttribute("disabled")).toBe(true);
  });

  it("취소는 제출하지 않는다", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<Harness onSubmit={onSubmit} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
