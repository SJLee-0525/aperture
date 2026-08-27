// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminRow } from "@/features/admin-shell/_components/AdminRow";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";
import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

describe("AdminSortableList", () => {
  afterEach(cleanup);

  it("항목을 목록으로 그린다", () => {
    render(
      <AdminSortableList ids={["a", "b"]} onReorder={() => {}}>
        <AdminSortableRow id="a">첫째</AdminSortableRow>
        <AdminSortableRow id="b">둘째</AdminSortableRow>
      </AdminSortableList>,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("행마다 정렬 핸들이 붙는다", () => {
    render(
      <AdminSortableList ids={["a"]} onReorder={() => {}}>
        <AdminSortableRow id="a">첫째</AdminSortableRow>
      </AdminSortableList>,
    );

    const handle = screen.getByRole("button", { name: "순서 이동" });
    // 핸들이 정렬 가능하다고 낭독되는데 키보드로 동작하지 않으면 안내와 동작이 어긋난다.
    expect(handle.getAttribute("aria-roledescription")).toBe("sortable");
    expect(handle.tabIndex).toBe(0);
  });

  it("정렬이 없는 행은 핸들 없이 같은 목록에 들어갈 수 있다", () => {
    render(
      <ul>
        <AdminRow>본문</AdminRow>
      </ul>,
    );

    expect(screen.queryByRole("button", { name: "순서 이동" })).toBeNull();
  });

  it("onReorder 는 드래그가 끝났을 때만 부른다", () => {
    const onReorder = vi.fn();
    render(
      <AdminSortableList ids={["a"]} onReorder={onReorder}>
        <AdminSortableRow id="a">첫째</AdminSortableRow>
      </AdminSortableList>,
    );

    expect(onReorder).not.toHaveBeenCalled();
  });
});
