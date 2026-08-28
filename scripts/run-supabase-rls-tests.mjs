import { spawnSync } from "node:child_process";

const run = (args, options = {}) =>
  spawnSync("supabase", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

const initialStatus = run(["status", "-o", "env"], { capture: true });
const stackWasRunning = initialStatus.status === 0;

if (!stackWasRunning) {
  const started = run(["start"]);
  if (started.status !== 0) process.exit(started.status ?? 1);
}

try {
  const tested = spawnSync(process.execPath, ["--test", "test/supabase-rls.test.mjs"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  process.exitCode = tested.status ?? 1;
} finally {
  if (!stackWasRunning) run(["stop"]);
}
