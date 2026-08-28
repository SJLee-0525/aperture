// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";

const base = {
  title: "사진",
  newHref: "/admin/photos/new",
  newLabel: "+ 새 사진",
  emptyLabel: "아직 사진이 없습니다.",
  emptyCtaLabel: "+ 첫 사진 추가",
  errorFallback: "사진을 불러오지 못했습니다.",
};

describe("AdminListShell", () => {
  afterEach(cleanup);

  it("불러오는 동안 목록도 빈 상태도 그리지 않는다", () => {
    render(
      <AdminListShell {...base} status="loading" isEmpty>
        <ul data-testid="list" />
      </AdminListShell>,
    );

    expect(screen.getByText("불러오는 중…")).toBeTruthy();
    expect(screen.queryByTestId("list")).toBeNull();
    expect(screen.queryByText(base.emptyLabel)).toBeNull();
  });

  it("오류는 role=alert 로 알리고 저장소 문구를 그대로 보인다", () => {
    render(
      <AdminListShell {...base} status="error" error="네트워크 오류" isEmpty>
        <ul />
      </AdminListShell>,
    );

    expect(screen.getByRole("alert").textContent).toBe("네트워크 오류");
  });

  it("저장소가 문구를 주지 않으면 화면별 기본값을 쓴다", () => {
    render(
      <AdminListShell {...base} status="error" error={null} isEmpty>
        <ul />
      </AdminListShell>,
    );

    expect(screen.getByRole("alert").textContent).toBe(base.errorFallback);
  });

  it("빈 상태에는 첫 항목 만들기 CTA 가 있고 목록은 없다", () => {
    render(
      <AdminListShell {...base} status="ready" isEmpty>
        <ul data-testid="list" />
      </AdminListShell>,
    );

    expect(screen.getByRole("link", { name: base.emptyCtaLabel }).getAttribute("href")).toBe(
      base.newHref,
    );
    expect(screen.queryByTestId("list")).toBeNull();
  });

  it("항목이 있으면 목록을 그리고 빈 상태를 감춘다", () => {
    render(
      <AdminListShell {...base} status="ready" isEmpty={false}>
        <ul data-testid="list" />
      </AdminListShell>,
    );

    expect(screen.getByTestId("list")).toBeTruthy();
    expect(screen.queryByText(base.emptyLabel)).toBeNull();
  });

  it("신규 버튼은 상단과 빈 상태가 같은 경로를 쓴다", () => {
    render(
      <AdminListShell {...base} status="ready" isEmpty>
        <ul />
      </AdminListShell>,
    );

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([base.newHref, base.newHref]);
  });

  it("toolbar 는 상태와 무관하게 그린다", () => {
    render(
      <AdminListShell {...base} status="loading" isEmpty toolbar={<div>검색</div>}>
        <ul />
      </AdminListShell>,
    );

    expect(screen.getByText("검색")).toBeTruthy();
  });
});
