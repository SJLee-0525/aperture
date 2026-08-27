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
          type: "platform",
          pattern: "src/features/(lang|theme|image-upload|photo-detail|dev-blog|admin-shell)",
        },
        { type: "feature", pattern: "src/features/*", capture: ["featureName"] },
        {
          type: "shared",
          pattern:
            "src/(components|hooks|utils|stores|api|services|constants|schemas|providers|i18n|types|assets|styles)",
        },
      ],
    },
    rules: {
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
