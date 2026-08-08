import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 3200;
const baseUrl = `http://127.0.0.1:${port}`;
const clearedEnvironment = {
  CHAT_PROVIDER_API_KEY: "",
  CHAT_PROVIDER_MODEL: "",
  CHAT_FALLBACK_PROVIDER: "",
  CHAT_FALLBACK_PROVIDER_API_KEY: "",
  CHAT_FALLBACK_PROVIDER_MODEL: "",
  CHAT_INTENT_PROVIDER_API_KEY: "",
  CHAT_INTENT_MODEL: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  KV_REST_API_URL: "",
  KV_REST_API_TOKEN: "",
};
const serverEnvironment = {
  ...process.env,
  ...clearedEnvironment,
  CHAT_PROVIDER: "mock",
  NEXT_DIST_DIR: ".next-playwright-v7",
  NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.join(root, "e2e/fixtures/google-font-responses.cjs"),
  NEXT_PUBLIC_USE_MOCK: "1",
};

let serverOutput = "";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: root,
    env: serverEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

const captureServerOutput = (chunk) => {
  serverOutput = `${serverOutput}${chunk.toString()}`.slice(-12_000);
};
server.stdout.on("data", captureServerOutput);
server.stderr.on("data", captureServerOutput);

const stopServer = () => {
  if (server.exitCode === null) server.kill("SIGTERM");
};

const waitUntilReady = async () => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Chat eval server exited with code ${server.exitCode}\n${serverOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for the chat eval server\n${serverOutput}`);
};

const run = async () => {
  try {
    await waitUntilReady();
    const evaluator = spawn(process.execPath, ["scripts/chat-eval.mjs"], {
      cwd: root,
      env: {
        ...process.env,
        CHAT_EVAL_BASE_URL: baseUrl,
        CHAT_EVAL_ISOLATE_CLIENTS: "1",
      },
      stdio: "inherit",
    });
    const exitCode = await new Promise((resolve) => evaluator.on("exit", resolve));
    process.exitCode = exitCode ?? 1;
  } finally {
    stopServer();
  }
};

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
