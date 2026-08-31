import { execFile as execFileCallback } from "node:child_process";
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PERFORMANCE_TARGETS } from "./performance-targets";

import { sendDiscordCard } from "@/lib/discord/send-webhook";
import { renderPerformanceAiReport } from "@/lib/performance-alerts/ai-report";
import { collectCruxRecords, type CollectedCruxResult } from "@/lib/performance-alerts/crux-client";
import { buildPerformanceTriageCards } from "@/lib/performance-alerts/discord-report";
import {
  downloadArtifactArchive,
  findPreviousSnapshotArtifact,
} from "@/lib/performance-alerts/github-artifact";
import {
  summarizeLighthouseRuns,
  type LighthouseTargetResult,
} from "@/lib/performance-alerts/lighthouse-result";
import { buildPerformanceDecision } from "@/lib/performance-alerts/report-decision";
import { selectTriageTargets } from "@/lib/performance-alerts/select-triage-targets";
import { readSnapshotArchive } from "@/lib/performance-alerts/snapshot-archive";
import {
  parsePerformanceSnapshot,
  SNAPSHOT_ARTIFACT_NAME,
  type PerformanceSnapshot,
} from "@/lib/performance-alerts/snapshot";
import { preflightPerformanceTargets, siteOrigin } from "@/lib/performance-alerts/site-target";
import { getPerformanceTriageProvider } from "@/lib/performance-alerts/triage-provider";
import { MAX_TARGETS } from "@/lib/performance-alerts/triage-schema";
import { redactSecrets } from "@/lib/text/redact-secrets";

import type { DiscordEmbed } from "@/lib/discord/types";
import type { PerformanceDecision } from "@/lib/performance-alerts/report-decision";
import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type {
  PerformanceTriageProvider,
  PerformanceTriageProviderResult,
} from "@/lib/performance-alerts/triage-provider";

type PreviousSnapshotResult =
  | { status: "loaded"; snapshot: PerformanceSnapshot }
  | { status: "cold_start" }
  | { status: "comparison_skipped"; reason: string };

type CollectionResult<T> = { complete: boolean; value: T };
/**
 * `triageOrder`는 AI에 넘긴 배열에서의 순위다. 분석하지 않는 대상은 null이다.
 * provider 요청 순서, 응답의 targetIndex, 카드 순서가 모두 이 값 하나로 맞춰진다.
 */
type ReportEntry = {
  card: DiscordEmbed;
  input: PerformanceTriageInput | null;
  triageOrder: number | null;
};

// 이 seam 의 값은 전부 각 의존성 구현이 검증을 끝낸 뒤의 값이다. `loadPreviousSnapshot` 은
// `parsePerformanceSnapshot` 을 거친 snapshot 만 돌려주고, 수집 함수도 타입을 확정한다.
type ReportDependencies = {
  preflight: () => Promise<void>;
  loadPreviousSnapshot: () => Promise<PreviousSnapshotResult>;
  collectCrux: () => Promise<CollectionResult<CollectedCruxResult[]>>;
  collectLighthouse: () => Promise<CollectionResult<LighthouseTargetResult[]>>;
  judge: (input: {
    previous: PreviousSnapshotResult;
    crux: CollectedCruxResult[];
    lighthouse: LighthouseTargetResult[];
  }) => Promise<PerformanceDecision> | PerformanceDecision;
  sendCard: (card: DiscordEmbed) => Promise<{ ok: true } | { ok: false; error: string }>;
  analyzeTargets?: PerformanceTriageProvider;
  renderCards: (
    entries: ReportEntry[],
    analysis: PerformanceTriageProviderResult | null,
  ) => DiscordEmbed[];
  writeAiReport?: (
    inputs: PerformanceTriageInput[],
    analysis: PerformanceTriageProviderResult | null,
  ) => Promise<void>;
  writeSnapshot: (snapshot: PerformanceSnapshot) => Promise<void>;
  appendSummary: (summary: string) => Promise<void>;
};

const execFile = promisify(execFileCallback);
const WORKFLOW_FILE = "core-web-vitals-report.yml";
const LIGHTHOUSE_MANIFEST = "lighthouse-production-report/manifest.json";
const SNAPSHOT_PATH = "performance-snapshot.json";
const AI_REPORT_PATH = "performance-ai-report.md";

/**
 * 분석 대상 entry를 provider에 넘긴 순서대로 돌려준다.
 * 요청 순서와 응답의 targetIndex, 카드 순서가 이 함수 하나로 같아진다.
 */
const orderedTriageEntries = <T extends { triageOrder: number | null }>(entries: T[]): T[] =>
  entries
    .filter((entry) => entry.triageOrder !== null)
    .sort((left, right) => (left.triageOrder ?? 0) - (right.triageOrder ?? 0));

const orderedTriageInputs = (entries: ReportEntry[]): PerformanceTriageInput[] =>
  orderedTriageEntries(entries).flatMap((entry) => (entry.input === null ? [] : [entry.input]));

/** Discord 통합 카드가 대상을 구분할 수 있게 측정 대상과 form factor를 함께 적는다. */
const triageLabel = (input: PerformanceTriageInput): string =>
  `${input.target}
${input.formFactor}`;

/**
 * 이전 snapshot 조회 실패는 비교만 생략하지만 현재 측정과 Discord 전송 실패는 실행을 실패시킨다.
 * 모든 수집이 완전한 경우에만 다음 실행이 사용할 snapshot을 기록한다.
 */
const runCoreWebVitalsReport = async (
  dependencies: ReportDependencies,
  signal: AbortSignal,
): Promise<void> => {
  await dependencies.preflight();

  let previous: PreviousSnapshotResult;
  try {
    previous = await dependencies.loadPreviousSnapshot();
  } catch (error) {
    previous = { status: "comparison_skipped", reason: redactSecrets(error) };
  }
  if (previous.status !== "loaded") {
    const detail = previous.status === "cold_start" ? "이전 snapshot 없음" : previous.reason;
    await dependencies.appendSummary(`비교 생략: ${detail}`);
  }

  let crux: CollectionResult<CollectedCruxResult[]>;
  try {
    crux = await dependencies.collectCrux();
  } catch (error) {
    await dependencies.appendSummary(`CrUX 전체 실패: ${redactSecrets(error)}`);
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

  const candidates = decision.cards.map((card, index) => ({
    card,
    input: decision.triageInputs?.[index] ?? null,
  }));
  const { selected, omitted } = selectTriageTargets(
    candidates.flatMap((entry) => (entry.input === null ? [] : [entry.input])),
    MAX_TARGETS,
  );
  const entries: ReportEntry[] = candidates.map((entry) => {
    const order = entry.input === null ? -1 : selected.indexOf(entry.input);
    return { ...entry, triageOrder: order < 0 ? null : order };
  });
  if (omitted > 0) {
    await dependencies.appendSummary(
      `AI 분석 대상 ${selected.length}개, 나머지 ${omitted}개는 측정값 카드만 전송`,
    );
  }
  const analyzable = orderedTriageInputs(entries);
  let analysis: PerformanceTriageProviderResult | null = null;
  if (analyzable.length && dependencies.analyzeTargets) {
    try {
      analysis = await dependencies.analyzeTargets(analyzable, signal);
    } catch (error) {
      await dependencies.appendSummary(`AI 분석 생략: ${redactSecrets(error)}`);
    }
  }
  // Discord 전송이 실패해도 분석 결과가 남도록 전송보다 먼저 기록한다.
  if (dependencies.writeAiReport) await dependencies.writeAiReport(analyzable, analysis);

  const cardsToSend = dependencies.renderCards(entries, analysis);
  for (const preparedCard of cardsToSend) {
    const sent = await dependencies.sendCard(preparedCard);
    if (!sent.ok) {
      const reason = redactSecrets(sent.error);
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
    return { status: "comparison_skipped", reason: redactSecrets(error) };
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
  const triageProvider = getPerformanceTriageProvider();

  await runCoreWebVitalsReport(
    {
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
          crux,
          lighthouse,
          previous: previous.status === "loaded" ? previous.snapshot : null,
          actionsRunUrl,
          sendBaseline: process.env.SEND_BASELINE === "true",
          forceAiAnalysis: process.env.FORCE_AI_ANALYSIS === "true",
        }),
      sendCard: (card) =>
        sendDiscordCard(process.env.DISCORD_PERFORMANCE_WEBHOOK_URL, card, {
          configName: "DISCORD_PERFORMANCE_WEBHOOK_URL",
        }),
      analyzeTargets: triageProvider,
      renderCards: (entries, analysis) => {
        if (!analysis) return entries.map((entry) => entry.card);
        // 분석 순서가 곧 응답 targetIndex 순서다. 여기서 어긋나면 설명이 다른 카드에 붙는다.
        const analyzed = orderedTriageEntries(entries).flatMap((entry) =>
          entry.input === null
            ? []
            : [{ card: entry.card, label: triageLabel(entry.input), input: entry.input }],
        );
        const untouched = entries.flatMap((entry) =>
          entry.triageOrder === null ? [entry.card] : [],
        );
        return [...buildPerformanceTriageCards(analyzed, analysis), ...untouched];
      },
      writeAiReport: async (inputs, analysis) => {
        const report = renderPerformanceAiReport(inputs, analysis);
        await writeFile(AI_REPORT_PATH, report, "utf8");
        if (analysis) await appendActionsSummary(report);
      },
      writeSnapshot: async (snapshot) => {
        await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      },
      appendSummary: appendActionsSummary,
      // CI 스크립트에는 취소 지점이 없다. 실제 구간 상한은 계약의 timeoutMs 가 정한다.
    },
    new AbortController().signal,
  );
};

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${redactSecrets(error)}\n`);
    process.exitCode = 1;
  });
}

export { loadLighthouseResults, main, runCoreWebVitalsReport };
