// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnsavedGuardProvider } from "@/features/admin-shell/_components/UnsavedGuardProvider";

import { useFormDirty } from "@/features/admin-shell/_hooks/use-form-dirty";

import { guardedNavigate } from "@/features/admin-shell/_lib/guarded-navigate";

const Probe = ({ baseline }: { baseline: boolean }) => {
  const [value, setValue] = useState({ title: "처음" });
  const { dirty, confirmLeave, markSaved } = useFormDirty(value, { baseline });
  return (
    <div>
      <span data-testid="dirty">{String(dirty)}</span>
      <button type="button" onClick={() => setValue({ title: "고침" })}>
        고치기
      </button>
      <button type="button" onClick={() => markSaved(value)}>
        저장됨
      </button>
      <button type="button" onClick={() => confirmLeave()}>
        떠나기
      </button>
    </div>
  );
};

const renderProbe = (baseline: boolean) =>
  render(
    <UnsavedGuardProvider>
      <Probe baseline={baseline} />
    </UnsavedGuardProvider>,
  );

afterEach(cleanup);

describe("useFormDirty", () => {
  it("baseline 을 켜면 초기값이 곧 저장본이다", async () => {
    renderProbe(true);
    expect(screen.getByTestId("dirty").textContent).toBe("false");

    await userEvent.click(screen.getByRole("button", { name: "고치기" }));
    expect(screen.getByTestId("dirty").textContent).toBe("true");
  });

  it("baseline 을 끄면 기준이 잡히기 전에는 dirty 가 아니다", async () => {
    // 설정 편집기는 비동기 로드다. 여기서 기준을 잡으면 빈 값이 저장본이 되어
    // 로드 직후가 통째로 dirty 가 된다.
    renderProbe(false);

    await userEvent.click(screen.getByRole("button", { name: "고치기" }));
    expect(screen.getByTestId("dirty").textContent).toBe("false");

    await userEvent.click(screen.getByRole("button", { name: "저장됨" }));
    await userEvent.click(screen.getByRole("button", { name: "고치기" }));
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });

  it("저장하면 기준이 갱신돼 dirty 가 풀린다", async () => {
    renderProbe(true);

    await userEvent.click(screen.getByRole("button", { name: "고치기" }));
    await userEvent.click(screen.getByRole("button", { name: "저장됨" }));

    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });
});

describe("guardedNavigate", () => {
  it("이동을 거절하면 기본 동작을 막는다", () => {
    const preventDefault = vi.fn();

    guardedNavigate(() => false)({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();

    preventDefault.mockClear();
    guardedNavigate(() => true)({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
