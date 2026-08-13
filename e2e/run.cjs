/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
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
  // next.config.ts 가 프로덕션 + mock 조합을 막는다. next start 도 설정을 읽으므로
  // 빌드뿐 아니라 서버 실행에도 탈출구가 필요하다. NEXT_PUBLIC_ 이 아니라 번들에는 안 들어간다.
  APERTURE_E2E_ALLOW_PRODUCTION_MOCK: "1",
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
    APERTURE_E2E_ALLOW_PRODUCTION_MOCK: "1",
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

// 서버 출력을 버리면 런 도중 크래시의 단서가 함께 사라진다 — 테스트는 전부
// ERR_CONNECTION_REFUSED 로만 보이고 이유는 어디에도 안 남는다. 파일로 받아 둔다.
// Playwright 가 시작할 때 비우는 test-results/ 안에 두면 지워지므로 저장소 루트에 쓴다.
const serverLogPath = path.join(root, "e2e-server.log");
const serverLog = fs.openSync(serverLogPath, "w");

const server = spawn(process.execPath, serverArgs, {
  cwd: root,
  env: serverEnv,
  stdio: ["ignore", serverLog, serverLog],
});

/** 테스트가 끝난 뒤의 서버 종료는 정상(stopServer)이라 아래 감시에서 제외한다. */
let testsFinished = false;
let playwright = null;

server.on("exit", (code, signal) => {
  if (testsFinished) return;
  console.error("");
  console.error(`E2E Next 서버가 테스트 도중 종료됐다 (code=${code} signal=${signal}).`);
  console.error(`서버 로그: ${serverLogPath}`);
  try {
    // 꼬리만 보여 준다 — 스택 하나면 충분하고, 로그 전체를 콘솔에 쏟지 않는다.
    const log = fs.readFileSync(serverLogPath, "utf8").trimEnd();
    if (log) console.error(log.slice(-2000));
  } catch {}
  // 죽은 서버에 남은 스펙을 계속 던지면 실패 200여 개가 원인을 덮는다. 즉시 멈춘다.
  if (playwright && playwright.exitCode === null) playwright.kill();
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
    playwright = spawn(
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
    testsFinished = true;
    process.exitCode = exitCode ?? 1;
  } finally {
    testsFinished = true;
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
