import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PERFORMANCE_TARGETS } from "./performance-targets";

type LighthouseManifestItem = {
  url: string;
  jsonPath: string;
  htmlPath: string;
  isRepresentativeRun: boolean;
};

type LighthouseAttempt = {
  url: string;
  run: number;
  attempt: number;
  status: "success" | "failed";
  jsonPath?: string;
  htmlPath?: string;
  error?: string;
};

type LighthouseRunner = (url: string, outputPath: string) => Promise<void>;

const execFile = promisify(execFileCallback);
const REPORT_ROOT = resolve("lighthouse-production-report");
const RUNS_PER_TARGET = 3;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 15_000;
const RUN_DELAY_MS = 3_000;

const wait = async (milliseconds: number): Promise<void> => {
  await new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
};

const selectTargetShard = <Target>(
  targets: readonly Target[],
  shardIndex: number,
  shardCount: number,
): Target[] => {
  if (!Number.isInteger(shardCount) || shardCount <= 0) throw new Error("Invalid shard count");
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) {
    throw new Error("Invalid shard index");
  }
  const shardSize = Math.ceil(targets.length / shardCount);
  return targets.slice(shardIndex * shardSize, (shardIndex + 1) * shardSize);
};

const safeTargetName = (url: string): string => {
  const path = new URL(url).pathname.replace(/^\/|\/$/g, "");
  return path.replace(/[^a-zA-Z0-9]+/g, "-") || "root";
};

const reportPaths = (outputPath: string): { jsonPath: string; htmlPath: string } => ({
  jsonPath: `${outputPath}.report.json`,
  htmlPath: `${outputPath}.report.html`,
});

const reportScore = async (jsonPath: string): Promise<number> => {
  const raw = JSON.parse(await readFile(jsonPath, "utf8")) as unknown;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return 0;
  const categories = (raw as Record<string, unknown>).categories;
  if (typeof categories !== "object" || categories === null || Array.isArray(categories)) return 0;
  const performance = (categories as Record<string, unknown>).performance;
  if (typeof performance !== "object" || performance === null || Array.isArray(performance))
    return 0;
  const score = (performance as Record<string, unknown>).score;
  return typeof score === "number" && Number.isFinite(score) ? score : 0;
};

/**
 * LHCI와 같은 방식으로 performance score 중앙값에 가장 가까운 실행 하나를 진단 대표값으로 고른다.
 * 두 실행만 남으면 낮은 점수를 골라 회귀를 낙관하지 않는다.
 */
const markRepresentativeRun = async (
  runs: LighthouseManifestItem[],
): Promise<LighthouseManifestItem[]> => {
  const scored = await Promise.all(
    runs.map(async (run) => ({ run, score: await reportScore(run.jsonPath) })),
  );
  const median = [...scored].sort((left, right) => left.score - right.score)[
    Math.floor((scored.length - 1) / 2)
  ];
  return runs.map((run) => ({ ...run, isRepresentativeRun: run === median?.run }));
};

const runLighthouse: LighthouseRunner = async (url, outputPath) => {
  await execFile(
    "lighthouse",
    [
      url,
      "--output=json",
      "--output=html",
      `--output-path=${outputPath}`,
      "--form-factor=mobile",
      "--chrome-flags=--headless --no-sandbox --disable-gpu",
      "--no-enable-error-reporting",
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
};

/**
 * 한 회차의 실패가 다음 URL을 막지 않게 수집 단위를 분리한다. 성공 파일은 매번 바로 남기고,
 * URL마다 두 회 이상 성공했을 때만 downstream report가 읽을 manifest에 포함한다.
 */
const collectProductionLighthouse = async (
  urls: string[],
  runner: LighthouseRunner = runLighthouse,
  delay: (milliseconds: number) => Promise<void> = wait,
  logFailure: (message: string) => void = (message) => process.stderr.write(message),
  reportDirectory: string = REPORT_ROOT,
): Promise<{ attempts: LighthouseAttempt[]; complete: boolean }> => {
  await mkdir(reportDirectory, { recursive: true });
  const attempts: LighthouseAttempt[] = [];
  const manifest: LighthouseManifestItem[] = [];
  let complete = true;

  for (const [targetIndex, url] of urls.entries()) {
    const successfulRuns: LighthouseManifestItem[] = [];
    for (let run = 1; run <= RUNS_PER_TARGET; run += 1) {
      let succeeded = false;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const outputPath = resolve(
          reportDirectory,
          `${String(targetIndex + 1).padStart(2, "0")}-${safeTargetName(url)}-run-${run}-attempt-${attempt}`,
        );
        const paths = reportPaths(outputPath);
        try {
          await runner(url, outputPath);
          attempts.push({ url, run, attempt, status: "success", ...paths });
          successfulRuns.push({ url, ...paths, isRepresentativeRun: false });
          succeeded = true;
          break;
        } catch (error) {
          attempts.push({
            url,
            run,
            attempt,
            status: "failed",
            error:
              error instanceof Error ? error.message.slice(0, 500) : "Unknown Lighthouse error",
          });
          if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS);
        }
      }
      if (!succeeded) logFailure(`Lighthouse run failed: ${url} run ${run}\n`);
      if (run < RUNS_PER_TARGET) await delay(RUN_DELAY_MS);
    }

    if (successfulRuns.length >= 2) {
      manifest.push(...(await markRepresentativeRun(successfulRuns)));
    } else {
      complete = false;
    }
  }

  await writeFile(resolve(reportDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(
    resolve(reportDirectory, "collection-summary.json"),
    JSON.stringify({ complete, attempts }, null, 2),
  );
  return { attempts, complete };
};

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const main = async (): Promise<void> => {
  const configuredSiteUrl = process.env.SITE_URL;
  if (!configuredSiteUrl) throw new Error("SITE_URL is required for production Lighthouse");
  const siteUrl = new URL(configuredSiteUrl);
  if (
    siteUrl.protocol !== "https:" ||
    siteUrl.username ||
    siteUrl.password ||
    siteUrl.port ||
    siteUrl.pathname !== "/" ||
    siteUrl.search ||
    siteUrl.hash
  ) {
    throw new Error("SITE_URL must be an HTTPS origin without path, query, fragment, or port");
  }
  const shardIndex = Number(process.env.LIGHTHOUSE_SHARD_INDEX ?? "0");
  const shardCount = Number(process.env.LIGHTHOUSE_SHARD_COUNT ?? "1");
  const targets = selectTargetShard(PERFORMANCE_TARGETS, shardIndex, shardCount);
  const urls = targets.map(({ path }) => `${siteUrl.origin}${path}`);
  const reportDirectory =
    shardCount === 1 ? REPORT_ROOT : resolve(REPORT_ROOT, `shard-${shardIndex}`);
  const result = await collectProductionLighthouse(
    urls,
    runLighthouse,
    wait,
    (message) => process.stderr.write(message),
    reportDirectory,
  );
  if (!result.complete) process.exitCode = 1;
};

if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Lighthouse collection failed"}\n`,
    );
    process.exitCode = 1;
  });
}

export {
  collectProductionLighthouse,
  main,
  markRepresentativeRun,
  reportPaths,
  safeTargetName,
  selectTargetShard,
};
export type { LighthouseAttempt, LighthouseManifestItem, LighthouseRunner };
