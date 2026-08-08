/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "런타임 모듈 사이의 순환 의존을 허용하지 않습니다.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      comment: "tsconfig 경로 별칭을 포함해 해석할 수 없는 import를 허용하지 않습니다.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    tsConfig: {
      fileName: "tsconfig.json",
    },
    // import type처럼 컴파일 후 사라지는 의존은 런타임 순환 검사에서 제외합니다.
    tsPreCompilationDeps: false,
    doNotFollow: {
      path: "node_modules",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "browser", "default", "types"],
    },
    exclude: {
      path: "(^|/)(\\.next[^/]*|coverage|storybook-static|playwright-report|test-results|design|public)(/|$)",
    },
  },
};
