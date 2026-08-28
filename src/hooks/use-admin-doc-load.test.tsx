// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAdminDocLoad } from "@/hooks/use-admin-doc-load";

type Doc = { id: string };

const Probe = ({ get }: { get: (id: string) => Promise<Doc | null> }) => {
  const { doc, status, error } = useAdminDocLoad<Doc>(() => ({ get }), "d1");
  return <p>{`${status}|${doc?.id ?? "-"}|${error ?? "-"}`}</p>;
};

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("useAdminDocLoad", () => {
  afterEach(cleanup);

  it("문서를 찾으면 found 로 넘어간다", async () => {
    render(<Probe get={async () => ({ id: "d1" })} />);

    expect(screen.getByText("loading|-|-")).toBeTruthy();
    await settle();
    expect(screen.getByText("found|d1|-")).toBeTruthy();
  });

  it("문서가 없으면 missing 이고 doc 은 null 이다", async () => {
    render(<Probe get={async () => null} />);
    await settle();

    expect(screen.getByText("missing|-|-")).toBeTruthy();
  });

  it("저장소 오류 문구를 그대로 올린다", async () => {
    render(
      <Probe
        get={async () => {
          throw new Error("네트워크 오류");
        }}
      />,
    );
    await settle();

    expect(screen.getByText("error|-|네트워크 오류")).toBeTruthy();
  });

  it("언마운트한 뒤 도착한 응답은 상태를 건드리지 않는다", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolve: (value: Doc | null) => void = () => {};
    const view = render(<Probe get={() => new Promise((r) => (resolve = r))} />);

    view.unmount();
    await act(async () => {
      resolve({ id: "late" });
      await Promise.resolve();
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
