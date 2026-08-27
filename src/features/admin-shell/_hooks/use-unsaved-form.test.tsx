// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  UnsavedGuardProvider,
  useUnsavedGuardContext,
} from "@/features/admin-shell/_components/UnsavedGuardProvider";

import { useUnsavedForm } from "@/features/admin-shell/_hooks/use-unsaved-form";

const Form = ({ dirty }: { dirty: boolean }) => {
  const confirmLeave = useUnsavedForm(dirty);
  return (
    <button type="button" onClick={() => confirmLeave()}>
      떠나기
    </button>
  );
};

let navigated = false;

/** 셸 헤더가 confirmLeave 를 읽는 방식과 같다. */
const useShellProbe = () => {
  const guard = useUnsavedGuardContext();
  return {
    guardedNavigate: () => {
      if (guard?.confirmLeave() ?? true) navigated = true;
    },
  };
};

/** 셸 헤더의 링크가 이동 전에 묻는 자리. 실제 셸은 같은 context 를 읽는다. */
const ShellLink = () => {
  const { guardedNavigate } = useShellProbe();
  return (
    <button type="button" onClick={guardedNavigate}>
      사이트 보기
    </button>
  );
};

const renderWith = (dirty: boolean) => {
  navigated = false;
  return render(
    <UnsavedGuardProvider>
      <Form dirty={dirty} />
      <ShellLink />
    </UnsavedGuardProvider>,
  );
};

afterEach(cleanup);

describe("useUnsavedForm", () => {
  it("dirty 인 폼이 있으면 셸 링크가 이동 전에 묻는다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWith(true);

    await userEvent.click(screen.getByRole("button", { name: "사이트 보기" }));

    expect(confirm).toHaveBeenCalled();
    expect(navigated).toBe(false);
    confirm.mockRestore();
  });

  it("dirty 가 아니면 묻지 않고 이동한다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWith(false);

    await userEvent.click(screen.getByRole("button", { name: "사이트 보기" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(navigated).toBe(true);
    confirm.mockRestore();
  });

  it("확인을 누르면 이동한다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWith(true);

    await userEvent.click(screen.getByRole("button", { name: "사이트 보기" }));

    expect(navigated).toBe(true);
    confirm.mockRestore();
  });

  it("폼이 사라지면 셸의 dirty 표시도 지운다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const view = renderWith(true);

    view.rerender(
      <UnsavedGuardProvider>
        <ShellLink />
      </UnsavedGuardProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "사이트 보기" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(navigated).toBe(true);
    confirm.mockRestore();
  });
});
