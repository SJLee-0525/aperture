/**
 * 테스트·로컬 개발용 관리자 세션 스위치.
 *
 * 관리자 화면은 Firebase Auth 로 들어간다. 자동화 테스트에 실제 계정을 쓰면 비밀번호를 저장소나
 * CI 에 두게 되고, `NEXT_PUBLIC_USE_MOCK=1` 만으로는 `AuthGuard` 를 지나갈 수 없다. 그래서
 * mock 콘텐츠와 별개로 인증 경계에 주입하는 스위치를 둔다(계획 §12-B3). B3.5 부터는 E2E 와
 * Firebase 없는 로컬 개발(`.env.local`)이 같은 플래그를 쓴다 — mock 콘텐츠 여부만으로
 * 인증이 열리는 일은 계속 없다.
 *
 * 켜는 조건은 둘을 모두 만족할 때뿐이다 — 전용 환경 변수와 비-프로덕션 환경. 프로덕션 빌드에서
 * 이 변수가 켜져 있으면 조용히 무시하지 않고 즉시 실패한다. 무시하면 설정이 남아 있는지 아무도
 * 모른 채 배포가 지나가고, 인증 우회는 조용히 지나가면 안 되는 종류의 설정이다.
 * `content-source.ts` 의 `NEXT_PUBLIC_USE_MOCK` 가드와 같은 방식이다.
 *
 * 실제 Firebase 권한 검증은 B5 의 Rules emulator 테스트가 맡는다. 이 스위치는 화면 흐름만 연다.
 *
 * @returns {boolean} 테스트 관리자 세션을 허용하면 true.
 * @throws {Error} 프로덕션 빌드에서 스위치가 켜져 있을 때.
 */
const isTestAdminSessionEnabled = (): boolean => {
  if (process.env.NEXT_PUBLIC_ADMIN_TEST_SESSION !== "1") return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_ADMIN_TEST_SESSION=1 은 프로덕션 빌드에서 금지다 — 관리자 인증을 우회하게 된다. 배포 환경변수에서 제거하라.",
    );
  }
  return true;
};

export { isTestAdminSessionEnabled };
