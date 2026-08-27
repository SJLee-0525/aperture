// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ authorized: false, pathname: "/admin" }));

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/features/auth/_components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) =>
    state.authorized ? <>{children}</> : <span data-testid="auth-gate" />,
}));
vi.mock("@/features/admin-shell/_components/AdminMonitoring", () => ({
  AdminMonitoring: () => <span data-testid="admin-monitoring" />,
}));
vi.mock("@/features/admin-shell/_components/AdminChrome", () => ({
  AdminChrome: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/admin-maintenance/_components/RagStaleBanner", () => ({
  RagStaleBanner: () => null,
}));

import { AdminLayoutClient } from "@/app/admin/_components/AdminLayoutClient";

describe("AdminLayoutClient monitoring boundary", () => {
  afterEach(() => {
    cleanup();
    state.authorized = false;
    state.pathname = "/admin";
  });

  it("로그인 경로에서는 모니터링을 마운트하지 않는다", () => {
    state.pathname = "/admin/login";
    state.authorized = true;
    render(<AdminLayoutClient>login</AdminLayoutClient>);

    expect(screen.queryByTestId("admin-monitoring")).toBeNull();
  });

  it("인증되지 않은 관리자 요청에서는 모니터링을 마운트하지 않는다", () => {
    render(<AdminLayoutClient>admin</AdminLayoutClient>);

    expect(screen.getByTestId("auth-gate")).toBeTruthy();
    expect(screen.queryByTestId("admin-monitoring")).toBeNull();
  });

  it("인증된 관리자 콘텐츠 안에서만 모니터링을 마운트한다", () => {
    state.authorized = true;
    render(<AdminLayoutClient>admin</AdminLayoutClient>);

    expect(screen.getByTestId("admin-monitoring")).toBeTruthy();
  });
});
