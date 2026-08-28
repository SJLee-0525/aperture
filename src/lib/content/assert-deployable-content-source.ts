/**
 * 프로덕션 빌드에서 mock 을 여는 탈출구.
 *
 * `NEXT_PUBLIC_` 접두사가 **아니다**. 브라우저 번들에 인라인되지 않아야 배포된 페이지가
 * 이 값을 들고 다니지 않는다. 주입하는 곳은 셋뿐이다 — `e2e/run.cjs`, CI 의 build 잡,
 * 시각 기준선 workflow. 실제 배포 환경에는 넣지 않는다.
 */
const PRODUCTION_MOCK_ESCAPE_HATCH = "APERTURE_E2E_ALLOW_PRODUCTION_MOCK";

/** 배포 산출물을 만들거나 띄우는 단계. 나머지 단계(개발 서버·정보 조회)는 검사하지 않는다. */
const DEPLOYABLE_PHASES = new Set(["phase-production-build", "phase-production-server"]);

/**
 * 산출물을 만들지 않는 Next 하위 명령.
 *
 * `next typegen` 은 라우트 타입만 뽑으면서도 phase 는 `phase-production-build` 로 온다.
 * 로컬 개발자는 `.env.local` 에 `NEXT_PUBLIC_USE_MOCK=1` 을 두고 쓰므로, 이 예외가 없으면
 * `npm run check` 가 매번 실패한다. **기본은 막고 아는 명령만 비켜 준다** — 반대로 짜면
 * 명령을 알아보지 못하는 환경에서 조용히 통과해 버린다.
 */
const NON_DEPLOYABLE_COMMANDS = new Set(["typegen", "lint", "info"]);

/**
 * 프로덕션 산출물이 mock 콘텐츠로 만들어지는 것을 막는다.
 *
 * 판정을 빌드 시점에 두는 이유는 클라이언트에서는 막을 방법이 없기 때문이다. 저장소 선택과
 * MOCK 배지는 브라우저에서 돌고, 거기서는 배포 환경을 알려 줄 값을 읽을 수 없다
 * (`NEXT_PUBLIC_` 이 아닌 변수는 번들에 없다). 그래서 판정은 여기서 한 번 하고, 화면은
 * 빌드가 확정한 `NEXT_PUBLIC_USE_MOCK` 만 읽는다.
 *
 * `next.config.ts` 가 phase 와 함께 부르므로 build 와 start 양쪽에서 실행된다. E2E 는 두
 * 단계 모두 탈출구 플래그를 넣어야 통과한다.
 *
 * @param phase `next.config.ts` 가 받은 실행 단계.
 * @param env 검사할 환경 변수. 기본값은 현재 프로세스.
 * @param argv 실행 인자. Next 하위 명령을 가려내는 데만 쓴다.
 * @throws {Error} 탈출구 없이 배포 산출물에 mock 콘텐츠를 켰을 때.
 */
const assertDeployableContentSource = (
  phase: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
  argv: readonly string[] = process.argv,
): void => {
  if (env.NEXT_PUBLIC_USE_MOCK !== "1") return;
  if (!DEPLOYABLE_PHASES.has(phase)) return;
  if (argv.slice(2).some((argument) => NON_DEPLOYABLE_COMMANDS.has(argument))) return;
  if (env[PRODUCTION_MOCK_ESCAPE_HATCH] === "1") return;

  throw new Error(
    `NEXT_PUBLIC_USE_MOCK=1 은 프로덕션 빌드에서 금지다 — 방문자에게 mock 콘텐츠가 보이고 관리자 저장이 브라우저에만 남는다. 배포 환경변수에서 제거하라. 시각 회귀·E2E 처럼 mock 프로덕션 빌드가 필요한 실행만 ${PRODUCTION_MOCK_ESCAPE_HATCH}=1 을 함께 넣는다.`,
  );
};

export { assertDeployableContentSource };
