// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminSortableListPage } from "@/features/admin-shell/_components/AdminSortableListPage";

type Item = { id: string; published: boolean; order: number };

const repositoryOf = (items: Item[]) => {
  const repository = {
    list: async () => items,
    updateOrder: async () => undefined,
    setPublished: async () => undefined,
    remove: async () => undefined,
  };
  return () => repository;
};

const renderPage = (noun: string, items: Item[]) =>
  render(
    <AdminSortableListPage
      noun={noun}
      newHref={`/admin/${noun}/new`}
      getRepository={repositoryOf(items)}
      renderRow={({ item }) => <li key={item.id}>{item.id}</li>}
    />,
  );

afterEach(cleanup);

describe("AdminSortableListPage", () => {
  it("대상 이름 하나에서 제목과 네 문구를 만든다", async () => {
    renderPage("수상", []);

    await waitFor(() => expect(screen.getByRole("heading", { name: "수상" })).toBeTruthy());
    // 받침이 있으므로 주격은 "이" 다.
    expect(screen.getByText("아직 수상이 없습니다.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "+ 첫 수상 만들기" })).toBeTruthy();
  });

  it("받침이 없는 대상은 주격에 가 를 쓴다", async () => {
    renderPage("프로젝트", []);

    await waitFor(() => expect(screen.getByText("아직 프로젝트가 없습니다.")).toBeTruthy());
  });

  it("항목이 있으면 행을 그린다", async () => {
    renderPage("연주", [{ id: "w1", published: true, order: 0 }]);

    await waitFor(() => expect(screen.getByText("w1")).toBeTruthy());
    expect(screen.queryByText(/아직/)).toBeNull();
  });

  it("여섯 목록이 같은 정렬 안내를 쓴다", async () => {
    renderPage("사진", []);

    await waitFor(() =>
      expect(screen.getByText(/드래그하거나 핸들에서 스페이스바를 눌러/)).toBeTruthy(),
    );
  });
});
