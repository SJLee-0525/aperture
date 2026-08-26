import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // scripts/ 의 빌드 산출물 분석 도구는 의존성 없는 .mjs 라 별도 패턴으로 받는다.
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/features/**/_lib/*.ts",
        // 관리자 mock 저장소 — repository 조립 모듈은 firebase 를 끌고 오므로 순수 구현만 잰다.
        "src/lib/admin/mock/*.ts",
        "src/lib/admin/select-repository.ts",
        "src/lib/photo-filter-query.ts",
        "src/lib/rate-limit/*.ts",
        "src/lib/contact-draft-storage.ts",
        "src/lib/search/*.ts",
        "src/lib/i18n/*.ts",
        "src/lib/format/*.ts",
        "src/lib/exif/*.ts",
        "src/lib/geo/*.ts",
        "src/lib/content/normalize-troubleshooting.ts",
        "src/hooks/use-query-modal.ts",
        "src/hooks/use-focus-trap.ts",
        "src/hooks/use-image-zoom.ts",
        "src/hooks/use-overlay-drag.ts",
        "src/hooks/use-scroll-lock.ts",
        "src/features/contact/_hooks/use-contact-form.ts",
        "src/features/contact/_hooks/use-contact-draft.ts",
        "src/features/dev-blog/_components/ArticlesView.tsx",
        "src/features/dev-blog/_hooks/use-hover-grace.ts",
        "src/features/search/_components/SearchResults.tsx",
        "src/components/DetailHero.tsx",
        "src/components/Modal.tsx",
        "src/components/PageToolbar.tsx",
        "src/components/TagFilterBar.tsx",
        "src/components/ViewToggle.tsx",
      ],
      exclude: ["src/**/*.test.{ts,tsx}"],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
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
