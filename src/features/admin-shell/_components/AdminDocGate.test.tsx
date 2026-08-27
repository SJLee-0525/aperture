// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

type Doc = { id: string; title: string };

/** 저장소 getter 는 모듈 수준 함수라 렌더마다 같은 참조를 준다. */
const repositoryOf = (get: (id: string) => Promise<Doc | null>) => {
  const repository = { get };
  return () => repository;
};

const renderGate = (get: (id: string) => Promise<Doc | null>, noun = "연주") =>
  render(
    <AdminDocGate getRepository={repositoryOf(get)} id="a1" noun={noun}>
      {(doc) => <p>폼 {doc.title}</p>}
    </AdminDocGate>,
  );

describe("AdminDocGate", () => {
  afterEach(cleanup);

  it("불러오는 동안 폼을 그리지 않는다", () => {
    renderGate(() => new Promise(() => {}));

    expect(screen.getByText("불러오는 중…")).toBeTruthy();
    expect(screen.queryByText(/폼/)).toBeNull();
  });

  it("찾은 뒤에만 폼을 그리고 문서를 넘긴다", async () => {
    renderGate(async () => ({ id: "a1", title: "봄" }));

    await waitFor(() => expect(screen.getByText("폼 봄")).toBeTruthy());
  });

  it("없음 문구는 받침에 맞는 조사를 쓴다", async () => {
    renderGate(async () => null);

    await waitFor(() => expect(screen.getByText("연주를 찾을 수 없습니다.")).toBeTruthy());
  });

  it("받침이 있는 대상은 을 을 쓴다", async () => {
    renderGate(async () => null, "사진");

    await waitFor(() => expect(screen.getByText("사진을 찾을 수 없습니다.")).toBeTruthy());
  });

  it("오류는 role=alert 로 알린다", async () => {
    renderGate(async () => {
      throw new Error("권한 없음");
    }, "앨범");

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("권한 없음"));
  });

  it("저장소가 문구를 주지 않으면 대상 이름으로 만든다", async () => {
    renderGate(async () => {
      throw new Error("");
    }, "프로젝트");

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("프로젝트를 불러오지 못했습니다."),
    );
  });

  it("언마운트 이후에는 상태를 건드리지 않는다", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let settle: (doc: Doc | null) => void = () => undefined;
    const view = renderGate(() => new Promise<Doc | null>((resolve) => (settle = resolve)));

    view.unmount();
    settle({ id: "a1", title: "봄" });
    await Promise.resolve();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
