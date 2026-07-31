import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

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
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        {
          // 여러 feature가 소비하는 횡단 기능. 일반 feature와 달리 다른 feature를 참조할 수 없다.
          type: "platform",
          pattern: "src/features/(lang|theme|image-upload|photo-detail)",
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
    },
  },
];

export default config;
