// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminDocGate } from "@/features/admin-shell/_components/AdminDocGate";

describe("AdminDocGate", () => {
  afterEach(cleanup);

  it("불러오는 동안 폼을 그리지 않는다", () => {
    render(
      <AdminDocGate status="loading" noun="연주">
        <p>폼</p>
      </AdminDocGate>,
    );

    expect(screen.getByText("불러오는 중…")).toBeTruthy();
    expect(screen.queryByText("폼")).toBeNull();
  });

  it("없음 문구는 받침에 맞는 조사를 쓴다", () => {
    render(
      <AdminDocGate status="missing" noun="연주">
        <p>폼</p>
      </AdminDocGate>,
    );

    expect(screen.getByText("연주를 찾을 수 없습니다.")).toBeTruthy();
  });

  it("받침이 있는 대상은 을 을 쓴다", () => {
    render(
      <AdminDocGate status="missing" noun="사진">
        <p>폼</p>
      </AdminDocGate>,
    );

    expect(screen.getByText("사진을 찾을 수 없습니다.")).toBeTruthy();
  });

  it("오류는 role=alert 로 알린다", () => {
    render(
      <AdminDocGate status="error" error="권한 없음" noun="앨범">
        <p>폼</p>
      </AdminDocGate>,
    );

    expect(screen.getByRole("alert").textContent).toBe("권한 없음");
  });

  it("저장소가 문구를 주지 않으면 대상 이름으로 만든다", () => {
    render(
      <AdminDocGate status="error" error={null} noun="프로젝트">
        <p>폼</p>
      </AdminDocGate>,
    );

    expect(screen.getByRole("alert").textContent).toBe("프로젝트를 불러오지 못했습니다.");
  });

  it("찾은 뒤에만 폼을 그린다", () => {
    render(
      <AdminDocGate status="found" noun="글">
        <p>폼</p>
      </AdminDocGate>,
    );

    expect(screen.getByText("폼")).toBeTruthy();
  });
});
