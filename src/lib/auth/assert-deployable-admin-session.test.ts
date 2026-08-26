import { describe, expect, it } from "vitest";

import { assertDeployableAdminSession } from "@/lib/auth/assert-deployable-admin-session";

const ON = { NEXT_PUBLIC_ADMIN_TEST_SESSION: "1" };
const BUILD = "phase-production-build";
const NEXT_BUILD_ARGV = ["node", "next", "build"];

describe("assertDeployableAdminSession", () => {
  it("배포 빌드에서 스위치가 켜져 있으면 즉시 실패한다", () => {
    expect(() => assertDeployableAdminSession(BUILD, ON, NEXT_BUILD_ARGV)).toThrow(
      /NEXT_PUBLIC_ADMIN_TEST_SESSION/,
    );
  });

  it("프로덕션 서버 실행도 같은 기준으로 막는다", () => {
    expect(() =>
      assertDeployableAdminSession("phase-production-server", ON, ["node", "next", "start"]),
    ).toThrow();
  });

  it("스위치가 꺼져 있으면 통과시킨다", () => {
    expect(() =>
      assertDeployableAdminSession(BUILD, { NEXT_PUBLIC_ADMIN_TEST_SESSION: "0" }, NEXT_BUILD_ARGV),
    ).not.toThrow();
    expect(() => assertDeployableAdminSession(BUILD, {}, NEXT_BUILD_ARGV)).not.toThrow();
  });

  it("개발 서버는 검사하지 않는다", () => {
    expect(() =>
      assertDeployableAdminSession("phase-development-server", ON, ["node", "next", "dev"]),
    ).not.toThrow();
  });

  it.each(["typegen", "lint", "info"])(
    "산출물을 만들지 않는 %s 는 통과시킨다",
    (command) => {
      expect(() =>
        assertDeployableAdminSession(BUILD, ON, ["node", "next", command]),
      ).not.toThrow();
    },
  );

  it("mock 콘텐츠 탈출구로는 열리지 않는다", () => {
    expect(() =>
      assertDeployableAdminSession(
        BUILD,
        { ...ON, APERTURE_E2E_ALLOW_PRODUCTION_MOCK: "1" },
        NEXT_BUILD_ARGV,
      ),
    ).toThrow();
  });
});
