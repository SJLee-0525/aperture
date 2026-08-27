// @vitest-environment jsdom

import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminRow } from "@/features/admin-shell/_components/AdminRow";
import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import type { ReactNode } from "react";

const inList = (children: ReactNode) =>
  render(
    <DndContext>
      <SortableContext items={["r1"]}>
        <ul>{children}</ul>
      </SortableContext>
    </DndContext>,
  );

describe("AdminSortableRow", () => {
  afterEach(cleanup);

  it("핸들에 접근 이름이 있다", () => {
    inList(<AdminSortableRow id="r1">본문</AdminSortableRow>);

    expect(screen.getByRole("button", { name: "순서 이동" })).toBeTruthy();
  });

  it("정렬이 없는 목록은 AdminRow 를 써서 핸들이 없다", () => {
    render(
      <ul>
        <AdminRow>본문</AdminRow>
      </ul>,
    );

    expect(screen.queryByRole("button", { name: "순서 이동" })).toBeNull();
  });

  it("published 를 넘기지 않으면 공개 배지가 없다", () => {
    inList(<AdminSortableRow id="r1">본문</AdminSortableRow>);

    expect(screen.queryByRole("button", { name: /공개/ })).toBeNull();
  });

  it("공개 배지는 현재 상태의 반대를 넘긴다", () => {
    const onToggle = vi.fn();
    inList(
      <AdminSortableRow id="r1" published onTogglePublished={onToggle}>
        본문
      </AdminSortableRow>,
    );

    fireEvent.click(screen.getByRole("button", { name: "공개" }));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("저장 중에는 공개 배지를 잠근다", () => {
    inList(
      <AdminSortableRow id="r1" published={false} onTogglePublished={() => {}} publishedBusy>
        본문
      </AdminSortableRow>,
    );

    expect((screen.getByRole("button", { name: "비공개" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("삭제가 잠기면 이유를 title 로 알린다", () => {
    inList(
      <AdminSortableRow id="r1" onDelete={() => {}} deleteDisabled deleteTitle="사용 중">
        본문
      </AdminSortableRow>,
    );

    const button = screen.getByRole("button", { name: "삭제" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.title).toBe("사용 중");
  });

  it("수정 링크가 없으면 그리지 않는다", () => {
    inList(<AdminSortableRow id="r1">본문</AdminSortableRow>);

    expect(screen.queryByRole("link", { name: "수정" })).toBeNull();
  });
});
