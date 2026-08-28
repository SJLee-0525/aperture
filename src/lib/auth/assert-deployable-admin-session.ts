/**
 * 배포 산출물을 만들거나 띄우는 단계. 나머지 단계(개발 서버·정보 조회)는 검사하지 않는다.
 *
 * `assert-deployable-content-source.ts` 가 같은 두 목록을 갖는다. 공용 모듈로 묶지 않는 이유는
 * `next.config.ts` 의 트랜스파일러가 `@/` alias 를 해석하지 못해, 이 설정이 끌어오는 파일은
 * 자립적이어야 하기 때문이다. 한쪽을 고치면 다른 쪽도 함께 고친다.
 */
const DEPLOYABLE_PHASES = new Set(["phase-production-build", "phase-production-server"]);

/** 산출물을 만들지 않는 Next 하위 명령. 기본은 막고 아는 명령만 비켜 준다. */
const NON_DEPLOYABLE_COMMANDS = new Set(["typegen", "lint", "info"]);

/**
 * 배포 산출물에 관리자 인증 우회 스위치가 켜진 채로 들어가는 것을 막는다.
 *
 * `isTestAdminSessionEnabled` 도 프로덕션에서 throw 하지만 그건 런타임 검사다. 지금은
 * `/admin/**` 이 prerender 되면서 그 예외가 빌드를 세우고 있을 뿐이고, 누군가 그 라우트에
 * `export const dynamic = "force-dynamic"` 을 추가하면 검사가 조용히 사라진다. 그러면
 * CLAUDE.md 가 적은 "프로덕션 빌드에서 즉시 throw" 계약이 문서에만 남는다.
 *
 * mock 콘텐츠와 달리 탈출구를 두지 않는다. E2E 는 프로덕션 실행에서 이 값을 `0` 으로 넣으므로
 * (`e2e/run.cjs`) 예외가 필요한 경로가 없다.
 *
 * @param phase `next.config.ts` 가 받은 실행 단계.
 * @param env 검사할 환경 변수. 기본값은 현재 프로세스.
 * @param argv 실행 인자. Next 하위 명령을 가려내는 데만 쓴다.
 * @throws {Error} 배포 산출물에서 스위치가 켜져 있을 때.
 */
const assertDeployableAdminSession = (
  phase: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
  argv: readonly string[] = process.argv,
): void => {
  if (env.NEXT_PUBLIC_ADMIN_TEST_SESSION !== "1") return;
  if (!DEPLOYABLE_PHASES.has(phase)) return;
  if (argv.slice(2).some((argument) => NON_DEPLOYABLE_COMMANDS.has(argument))) return;

  throw new Error(
    "NEXT_PUBLIC_ADMIN_TEST_SESSION=1 은 프로덕션 빌드에서 금지다 — 관리자 인증을 우회하게 된다. 배포 환경변수에서 제거하라.",
  );
};

export { assertDeployableAdminSession };
