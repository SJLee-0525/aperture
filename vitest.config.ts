import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // scripts/의 독립 실행 도구도 설정과 입력 계약을 검증하므로 TypeScript 테스트까지 함께 찾는다.
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{mjs,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // allowlist 가 아니라 제외 목록이다. 명시한 것만 재면 새 코드가 게이트 밖에서
      // 태어나고, 이미 테스트가 있는 파일조차 수치에 잡히지 않는다.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        // 폴백 데이터와 Storybook 카탈로그는 단위 테스트 대상이 아니다.
        "src/mocks/**",
        "src/**/*.stories.tsx",
        // Next.js 가 규약으로 부르는 라우트 껍데기. fetch 와 features 조립만 한다.
        // route.ts 는 요청을 다루므로 여기 없다.
        "src/app/**/{layout,template,loading,page,not-found,error,global-error,sitemap,robots}.{ts,tsx}",
        // Next.js 가 진입점으로 직접 부르는 파일. 단위 테스트로 부를 수 없다.
        "src/instrumentation*.ts",
        "src/proxy.ts",
      ],
      // 전역 값은 실측에서 시작하는 래칫이다. glob 에 걸린 파일도 전역 계산에 그대로
      // 들어가므로(vitest 는 glob 대상을 전역 맵에서 빼지 않는다) 아래 두 값은 전역을
      // 대체하지 않고 더 높은 기준을 덧씌운다.
      thresholds: {
        statements: 64,
        branches: 63,
        functions: 56,
        lines: 65,
        "src/features/**/_lib/**": { statements: 85, branches: 80, functions: 85, lines: 85 },
        // functions 만 아직 낮다. 재export 뿐인 모듈(albums.ts)과 브라우저 구독 API 가
        // 남아 있어 _lib 과 같은 85 에 닿지 않는다.
        "src/lib/**": { statements: 85, branches: 80, functions: 78, lines: 85 },
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      // `server-only` 는 react-server 조건이 없으면 import 하는 것만으로 throw 한다.
      // 서버 전용 모듈을 단위 테스트에서 부르려면 조건 대신 이 한 곳만 빈 모듈로 바꾼다
      // (전역 conditions 에 react-server 를 넣으면 React 해석까지 함께 바뀐다).
      "server-only": new URL("./node_modules/server-only/empty.js", import.meta.url).pathname,
    },
  },
});
