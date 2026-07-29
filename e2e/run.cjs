/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const production = process.env.E2E_PRODUCTION === "1";
const serverEnv = {
  ...process.env,
  NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-playwright-v7",
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve(__dirname, "fixtures/google-font-responses.cjs"),
  NEXT_PUBLIC_USE_MOCK: "1",
};

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
      ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
      {
        cwd: root,
        env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
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
