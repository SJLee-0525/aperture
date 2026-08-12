import { describe, expect, it } from "vitest";

import { assertDeployableContentSource } from "@/lib/content/assert-deployable-content-source";

const BUILD = "phase-production-build";
const SERVER = "phase-production-server";
const DEV = "phase-development-server";

/** `next.config.ts` 가 부르는 가드라 실제 프로세스가 아니라 주입한 phase·env·argv 로 검사한다. */
const check =
  (
    phase: string,
    env: Record<string, string | undefined>,
    argv: readonly string[] = ["node", "next", "build"],
  ) =>
  () =>
    assertDeployableContentSource(phase, env, argv);

const MOCK_ON = { NEXT_PUBLIC_USE_MOCK: "1" };

describe("assertDeployableContentSource", () => {
  it("프로덕션 빌드에서 mock 을 켜면 실패한다", () => {
    expect(check(BUILD, MOCK_ON)).toThrow("프로덕션 빌드에서 금지");
  });

  it("프로덕션 서버 기동도 막는다 — next start 도 설정을 읽는다", () => {
    expect(check(SERVER, MOCK_ON, ["node", "next", "start"])).toThrow();
  });

  it("Vercel 이 아닌 프로덕션 배포도 막는다", () => {
    // 예전 가드는 `VERCEL` 이 있을 때만 막아 Docker·self-host 배포가 그대로 통과했다.
    expect(check(BUILD, { ...MOCK_ON, VERCEL: undefined })).toThrow();
  });

  it("서버 전용 탈출구가 있으면 통과한다 — 시각 회귀·E2E 실행", () => {
    expect(check(BUILD, { ...MOCK_ON, APERTURE_E2E_ALLOW_PRODUCTION_MOCK: "1" })).not.toThrow();
  });

  it("탈출구는 정확히 1 일 때만 인정한다", () => {
    expect(check(BUILD, { ...MOCK_ON, APERTURE_E2E_ALLOW_PRODUCTION_MOCK: "true" })).toThrow();
  });

  it("개발 서버는 mock 을 그대로 쓴다", () => {
    expect(check(DEV, MOCK_ON, ["node", "next", "dev"])).not.toThrow();
  });

  it("산출물을 만들지 않는 명령은 비켜 준다 — typegen 은 phase 가 build 로 온다", () => {
    // 이 예외가 없으면 `.env.local` 에 mock 을 둔 개발자의 `npm run check` 가 매번 실패한다.
    expect(check(BUILD, MOCK_ON, ["node", "next", "typegen"])).not.toThrow();
  });

  it("mock 을 켜지 않은 빌드는 검사 대상이 아니다", () => {
    expect(check(BUILD, { NEXT_PUBLIC_USE_MOCK: "0" })).not.toThrow();
    expect(check(BUILD, {})).not.toThrow();
  });
});
