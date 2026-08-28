import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";

const config = [
  // 제외 패턴 (빌드 결과물, 의존성, 자동 생성 파일)
  {
    ignores: [
      ".next/**",
      ".next*/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "storybook-static/**",
      "dist/**",
      "public/**",
      ".example/",
      "next-env.d.ts",
      "docs/**",
      // 디자인 export 원본(참고용 프로토타입) — 우리 소스가 아님
      "design/**",
    ],
  },
  // Next.js 권장 설정
  ...nextVitals,
  ...nextTs,
  // 커스텀 규칙
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  // 레이어 경계 규칙 (CLAUDE.md 배치 규칙 강제)
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries, import: importPlugin },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        {
          // 여러 feature가 소비하는 횡단 기능. 일반 feature와 달리 다른 feature를 참조할 수 없다.
          // dev-blog: 공개 상세와 관리자 편집기가 같은 Markdown 계약·본문 렌더러를 쓴다.
          // admin-shell: 관리자 셸과 목록·수정 라우트의 공용 골격을 열네 개 admin feature 가 쓴다.
          // pointer-chrome: 커서와 스크롤바가 지도·상세·글 어디에서든 같은 계약으로 뜬다.
          type: "platform",
          pattern:
            "src/features/(lang|theme|image-upload|photo-detail|dev-blog|admin-shell|pointer-chrome)",
        },
        { type: "feature", pattern: "src/features/*", capture: ["featureName"] },
        {
          // src 최상위의 실제 폴더만 적는다. 없는 이름을 적어 두면 목록이 늘 맞아 보이지만,
          // 빠진 폴더는 어느 element 에도 매칭되지 않아 default: "allow" 로 떨어진다.
          // lib 이 그 상태였다 — 역방향 import 를 막는 규칙이 lib 을 보지 못했다.
          type: "shared",
          pattern: "src/(components|hooks|constants|types|assets|lib|mocks)",
        },
      ],
      // src 최상위 파일. Next.js 가 위치를 정하므로 폴더로 묶을 수 없다
      // (proxy·instrumentation 은 이 경로에 있어야 인식된다).
      // element 패턴은 폴더를 매칭하므로 파일 분류는 이쪽에 적는다.
      "boundaries/files": [{ category: "root", pattern: "src/*.ts" }],
    },
    rules: {
      // 어느 element 에도 속하지 않는 파일을 막는다. 새 최상위 폴더를 만들고 위 목록에
      // 더하지 않으면 그 폴더는 default: "allow" 로 떨어져 경계 규칙이 통째로 비껴간다.
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
      // `../` 금지와 barrel 금지는 CLAUDE.md 컨벤션인데 강제하는 것이 hook 경고뿐이었다.
      // hook 은 로컬 편집에서만 돌고 CI 는 보지 못한다.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*", "../**"],
              message: "상대경로 import 금지. src/ 전체가 @/* 로 매핑되므로 alias 를 쓴다.",
            },
            {
              group: ["@/**/index", "@/**/index.*"],
              message: "barrel export 금지. 대상 파일 경로를 직접 import 한다.",
            },
          ],
        },
      ],
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          policies: [
            {
              // feature 간 직접 import 금지 — 공유가 필요하면 루트 레이어로 승격
              from: { element: { type: "feature" } },
              disallow: {
                to: {
                  element: {
                    type: "feature",
                    captured: { featureName: "!{{ from.captured.featureName }}" },
                  },
                },
              },
              message:
                "feature 간 직접 import 금지 ({{ from.captured.featureName }} → {{ to.captured.featureName }}). 공유 코드는 hooks/ 또는 utils/로 승격하세요.",
            },
            {
              // 공유·플랫폼 레이어는 일반 feature/app을 참조할 수 없음 (역방향 의존 금지)
              from: { element: { type: "(shared|platform)" } },
              disallow: { to: { element: { type: "(feature|app)" } } },
              message: "공유/플랫폼 레이어({{ from.type }})는 feature/app을 import할 수 없습니다.",
            },
          ],
        },
      ],
      // import 그룹 순서: Node 내장 → 외부 패키지 → (components + features/_components) →
      // (hooks) → features/_lib → (lib + constants) → type → 상대경로/css. 그룹 사이 빈 줄 강제.
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "type",
            "parent",
            "sibling",
            "index",
            "object",
          ],
          pathGroups: [
            {
              pattern: "@/{components,features/**/_components}/**",
              group: "internal",
              position: "after",
            },
            { pattern: "@/{hooks,features/**/_hooks}/**", group: "internal", position: "after" },
            { pattern: "@/features/**/_lib/**", group: "internal", position: "after" },
            { pattern: "@/{lib,constants}/**", group: "internal", position: "after" },
            { pattern: "@/**", group: "internal", position: "after" },
          ],
          // type-only import은 경로와 무관하게 항상 마지막 type 그룹 하나로 모은다
          pathGroupsExcludedImportTypes: ["builtin", "external", "object", "type"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
];

export default config;
