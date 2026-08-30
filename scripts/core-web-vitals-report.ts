import { execFile as execFileCallback } from "node:child_process";
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PERFORMANCE_TARGETS } from "./performance-targets";

import type { DiscordEmbed } from "@/lib/discord/types";
import { sendDiscordCard } from "@/lib/discord/send-webhook";
import { collectCruxRecords, type CollectedCruxResult } from "@/lib/performance-alerts/crux-client";
import {
  downloadArtifactArchive,
  findPreviousSnapshotArtifact,
} from "@/lib/performance-alerts/github-artifact";
import {
  summarizeLighthouseRuns,
  type LighthouseTargetResult,
} from "@/lib/performance-alerts/lighthouse-result";
import { buildPerformanceDecision } from "@/lib/performance-alerts/report-decision";
import { readSnapshotArchive } from "@/lib/performance-alerts/snapshot-archive";
import {
  parsePerformanceSnapshot,
  SNAPSHOT_ARTIFACT_NAME,
  type PerformanceSnapshot,
} from "@/lib/performance-alerts/snapshot";
import { preflightPerformanceTargets, siteOrigin } from "@/lib/performance-alerts/site-target";

type PreviousSnapshotResult =
  | { status: "loaded"; snapshot: unknown }
  | { status: "cold_start" }
  | { status: "comparison_skipped"; reason: string };

type CollectionResult = { complete: boolean; value: unknown };
type ReportDecision = {
  cards: unknown[];
  snapshot: unknown;
  summary: string;
};

type ReportDependencies = {
  preflight: () => Promise<void>;
  loadPreviousSnapshot: () => Promise<PreviousSnapshotResult>;
  collectCrux: () => Promise<CollectionResult>;
  collectLighthouse: () => Promise<CollectionResult>;
  judge: (input: {
    previous: PreviousSnapshotResult;
    crux: unknown;
    lighthouse: unknown;
  }) => Promise<ReportDecision> | ReportDecision;
  sendCard: (card: unknown) => Promise<{ ok: true } | { ok: false; error: string }>;
  writeSnapshot: (snapshot: unknown) => Promise<void>;
  appendSummary: (summary: string) => Promise<void>;
};

const execFile = promisify(execFileCallback);
const WORKFLOW_FILE = "core-web-vitals-report.yml";
const LIGHTHOUSE_MANIFEST = "lighthouse-production-report/manifest.json";
const SNAPSHOT_PATH = "performance-snapshot.json";

/** 외부 오류가 Actions log와 summary에 query 또는 secret 형태를 남기지 않게 한다. */
const redactPerformanceError = (value: unknown): string => {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(/https?:\/\/[^\s?#]+[^\s]*/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return "[redacted-url]";
      }
    })
    .replace(/\b(?:AIza[\w-]{20,}|gh[opsu]_[\w]{20,})\b/g, "[redacted-secret]")
    .replace(/(api[_-]?key|token|webhook)(\s*[=:]\s*)[^\s]+/gi, "$1$2[redacted-secret]");
};

/**
 * 이전 snapshot 조회 실패는 비교만 생략하지만 현재 측정과 Discord 전송 실패는 실행을 실패시킨다.
 * 모든 수집이 완전한 경우에만 다음 실행이 사용할 snapshot을 기록한다.
 */
const runCoreWebVitalsReport = async (dependencies: ReportDependencies): Promise<void> => {
  await dependencies.preflight();

  let previous: PreviousSnapshotResult;
  try {
    previous = await dependencies.loadPreviousSnapshot();
  } catch (error) {
    previous = { status: "comparison_skipped", reason: redactPerformanceError(error) };
  }
  if (previous.status !== "loaded") {
    const detail = previous.status === "cold_start" ? "이전 snapshot 없음" : previous.reason;
    await dependencies.appendSummary(`비교 생략: ${detail}`);
  }

  let crux: CollectionResult;
  try {
    crux = await dependencies.collectCrux();
  } catch (error) {
    await dependencies.appendSummary(`CrUX 전체 실패: ${redactPerformanceError(error)}`);
    throw new Error("CrUX collection failed");
  }

  const lighthouse = await dependencies.collectLighthouse();
  if (!lighthouse.complete) {
    await dependencies.appendSummary(
      "Lighthouse 측정이 완전하지 않아 snapshot을 저장하지 않습니다.",
    );
    throw new Error("Lighthouse collection failed");
  }

  const decision = await dependencies.judge({
    previous,
    crux: crux.value,
    lighthouse: lighthouse.value,
  });
  await dependencies.appendSummary(decision.summary);

  for (const card of decision.cards) {
    const sent = await dependencies.sendCard(card);
    if (!sent.ok) {
      const reason = redactPerformanceError(sent.error);
      await dependencies.appendSummary(`Discord 전송 실패: ${reason}`);
      throw new Error(`Discord delivery failed: ${reason}`);
    }
  }

  if (crux.complete && lighthouse.complete) {
    await dependencies.writeSnapshot(decision.snapshot);
  } else {
    await dependencies.appendSummary(
      "현재 측정이 불완전해 이전 정상 snapshot을 대체하지 않습니다.",
    );
  }
};

const required = (value: string | undefined, name: string): string => {
  if (!value?.trim()) throw new Error(`${name} is not configured`);
  return value;
};

/**
 * LHCI manifest가 가리키는 JSON은 manifest와 같은 디렉터리 안에서만 읽는다.
 * CI 작업 공간의 다른 JSON이 보고서로 섞이는 것을 막기 위한 경계다.
 */
const loadLighthouseResults = async (manifestPath: string): Promise<LighthouseTargetResult[]> => {
  const absoluteManifest = resolve(manifestPath);
  const reportDirectory = dirname(absoluteManifest);
  const raw = JSON.parse(await readFile(absoluteManifest, "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("Invalid Lighthouse manifest");
  const runs = await Promise.all(
    raw.map(async (value, index) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Invalid Lighthouse manifest[${index}]`);
      }
      const item = value as Record<string, unknown>;
      if (
        typeof item.url !== "string" ||
        typeof item.jsonPath !== "string" ||
        typeof item.isRepresentativeRun !== "boolean"
      ) {
        throw new Error(`Invalid Lighthouse manifest[${index}]`);
      }
      const jsonPath = resolve(item.jsonPath);
      const pathFromReport = relative(reportDirectory, jsonPath);
      if (
        pathFromReport.startsWith("..") ||
        resolve(reportDirectory, pathFromReport) !== jsonPath
      ) {
        throw new Error(`Lighthouse report path is outside output directory`);
      }
      return {
        url: item.url,
        isRepresentativeRun: item.isRepresentativeRun,
        report: JSON.parse(await readFile(jsonPath, "utf8")) as unknown,
      };
    }),
  );
  return summarizeLighthouseRuns(runs);
};

const previousSnapshot = async (
  repository: string,
  token: string,
  currentRunId: number,
): Promise<PreviousSnapshotResult> => {
  const lookup = await findPreviousSnapshotArtifact(
    repository,
    token,
    currentRunId,
    WORKFLOW_FILE,
    SNAPSHOT_ARTIFACT_NAME,
  );
  if (lookup.status === "cold_start") return lookup;
  if (lookup.status === "lookup_failed") {
    return { status: "comparison_skipped", reason: lookup.reason };
  }

  const temporaryDirectory = await mkdtemp(`${tmpdir()}/aperture-cwv-`);
  const archivePath = resolve(temporaryDirectory, "snapshot.zip");
  try {
    await writeFile(
      archivePath,
      await downloadArtifactArchive(repository, token, lookup.artifact.id),
    );
    const raw = await readSnapshotArchive(archivePath, async (args) => {
      const result = await execFile("unzip", [...args], { encoding: "utf8" });
      return { stdout: result.stdout };
    });
    return { status: "loaded", snapshot: parsePerformanceSnapshot(raw) };
  } catch (error) {
    return { status: "comparison_skipped", reason: redactPerformanceError(error) };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

const appendActionsSummary = async (message: string): Promise<void> => {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    await appendFile(summaryPath, `${message}\n\n`, "utf8");
    return;
  }
  process.stdout.write(`${message}\n`);
};

/** GitHub Actions 환경변수와 로컬 LHCI 결과를 실제 보고서 의존성으로 조립한다. */
const main = async (): Promise<void> => {
  const origin = siteOrigin(required(process.env.SITE_URL, "SITE_URL"));
  const apiKey = required(process.env.CRUX_API_KEY, "CRUX_API_KEY");
  const repository = required(process.env.GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
  const token = required(process.env.GITHUB_TOKEN, "GITHUB_TOKEN");
  const runId = Number(required(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID"));
  if (!Number.isSafeInteger(runId) || runId <= 0) throw new Error("GITHUB_RUN_ID is invalid");
  const targets = PERFORMANCE_TARGETS.map((target) => ({
    id: target.id,
    url: `${origin}${target.path}`,
  }));
  const actionsRunUrl = `https://github.com/${repository}/actions/runs/${runId}`;

  await runCoreWebVitalsReport({
    preflight: async () => {
      await preflightPerformanceTargets(origin, PERFORMANCE_TARGETS);
    },
    loadPreviousSnapshot: () => previousSnapshot(repository, token, runId),
    collectCrux: async () => ({
      complete: true,
      value: await collectCruxRecords(origin, targets, apiKey),
    }),
    collectLighthouse: async () => ({
      complete: true,
      value: await loadLighthouseResults(LIGHTHOUSE_MANIFEST),
    }),
    judge: ({ previous, crux, lighthouse }) =>
      buildPerformanceDecision({
        siteOrigin: origin,
        targets,
        measuredAt: new Date().toISOString(),
        release: process.env.GITHUB_SHA ?? null,
        crux: crux as CollectedCruxResult[],
        lighthouse: lighthouse as LighthouseTargetResult[],
        previous: previous.status === "loaded" ? (previous.snapshot as PerformanceSnapshot) : null,
        actionsRunUrl,
        sendBaseline: process.env.SEND_BASELINE === "true",
      }),
    sendCard: (card) =>
      sendDiscordCard(process.env.DISCORD_PERFORMANCE_WEBHOOK_URL, card as DiscordEmbed, {
        configName: "DISCORD_PERFORMANCE_WEBHOOK_URL",
      }),
    writeSnapshot: async (snapshot) => {
      await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    },
    appendSummary: appendActionsSummary,
  });
};

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${redactPerformanceError(error)}\n`);
    process.exitCode = 1;
  });
}

export { loadLighthouseResults, main, redactPerformanceError, runCoreWebVitalsReport };
