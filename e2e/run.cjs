/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const cliArgs = process.argv.slice(2);
const production = process.env.E2E_PRODUCTION === "1" || cliArgs.includes("--production");
const build = cliArgs.includes("--build");
const playwrightArgs = cliArgs.filter(
  (argument) => argument !== "--production" && argument !== "--build",
);
const serverEnv = {
  ...process.env,
  NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-playwright-v7",
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve(__dirname, "fixtures/google-font-responses.cjs"),
  NEXT_PUBLIC_USE_MOCK: "1",
  NEXT_PUBLIC_GA_ID: "G-E2ETEST",
  NEXT_PUBLIC_FORCE_ANALYTICS_CONSENT_BANNER: "0",
  NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY: "",
  // 관리자 E2E 전용 인증 우회. 프로덕션 모드에서는 가드가 throw 하므로 명시적으로 끈다 —
  // 개발자가 .env.local 에 이 플래그를 두고 쓰더라도 프로덕션 실행이 그 값을 물려받지 않게 한다.
  NEXT_PUBLIC_ADMIN_TEST_SESSION: production ? "0" : "1",
};

if (build) {
  // 서버가 서빙할 distDir로 직접 빌드한다 — npm run build(.next)와 어긋나지 않게.
  // CI 프로덕션 빌드와 동일하게 폰트 mock 없이(실제 웹폰트 셀프호스팅) 빌드한다.
  const buildEnv = {
    ...process.env,
    NEXT_DIST_DIR: serverEnv.NEXT_DIST_DIR,
    NEXT_PUBLIC_USE_MOCK: "1",
    NEXT_PUBLIC_GA_ID: "G-E2ETEST",
    NEXT_PUBLIC_FORCE_ANALYTICS_CONSENT_BANNER: "0",
    NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY: "",
    NEXT_PUBLIC_ADMIN_TEST_SESSION: "0",
  };
  delete buildEnv.NEXT_FONT_GOOGLE_MOCKED_RESPONSES;
  const buildResult = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    cwd: root,
    env: buildEnv,
    stdio: "inherit",
  });
  if (buildResult.status !== 0) process.exit(buildResult.status ?? 1);
}

const serverArgs = [
  "node_modules/next/dist/bin/next",
  production ? "start" : "dev",
  ...(!production ? ["--webpack"] : []),
  "--hostname",
  "127.0.0.1",
  "--port",
  String(port),
];

const server = spawn(process.execPath, serverArgs, {
  cwd: root,
  env: serverEnv,
  stdio: "ignore",
});

function stopServer() {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    killer.unref();
    server.unref();
    return;
  }
  server.kill("SIGTERM");
}

async function waitUntilReady() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`E2E Next server exited with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the E2E Next server");
}

async function run() {
  try {
    await waitUntilReady();
    const playwright = spawn(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test", ...playwrightArgs],
      {
        cwd: root,
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: baseURL,
          // --production 플래그로 실행해도 스펙(시각 회귀의 프로덕션 전용 skip)이 모드를 알 수 있게 전달.
          ...(production ? { E2E_PRODUCTION: "1" } : {}),
        },
        stdio: "inherit",
      },
    );
    const exitCode = await new Promise((resolve) => playwright.on("exit", resolve));
    process.exitCode = exitCode ?? 1;
  } finally {
    stopServer();
  }
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopServer();
  process.exit(143);
});

run().catch((error) => {
  console.error(error);
  stopServer();
  process.exit(1);
});
