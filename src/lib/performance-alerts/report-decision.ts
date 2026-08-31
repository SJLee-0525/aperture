import { createPerformanceDiscordCard } from "@/lib/performance-alerts/discord-report";
import {
  judgeFieldMetric,
  judgeInsufficientData,
  judgeLab,
} from "@/lib/performance-alerts/performance-status";
import {
  alertKey,
  retainSentAlerts,
  SNAPSHOT_ARTIFACT_NAME,
} from "@/lib/performance-alerts/snapshot";

import type { DiscordEmbed } from "@/lib/discord/types";
import type { CollectedCruxResult, FieldMetric } from "@/lib/performance-alerts/crux-client";
import type { PerformanceReport } from "@/lib/performance-alerts/discord-report";
import type { LighthouseTargetResult } from "@/lib/performance-alerts/lighthouse-result";
import type { LabInput, PerformanceStatus } from "@/lib/performance-alerts/performance-status";
import type {
  PerformanceSnapshot,
  PerformanceTargetResult,
  SnapshotMeasurement,
  SnapshotMetric,
} from "@/lib/performance-alerts/snapshot";
import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";

type ReportTarget = { id: string; url: string };
type DecisionInput = {
  siteOrigin: string;
  targets: readonly ReportTarget[];
  measuredAt: string;
  release: string | null;
  crux: readonly CollectedCruxResult[];
  lighthouse: readonly LighthouseTargetResult[];
  previous: PerformanceSnapshot | null;
  actionsRunUrl: string;
  sendBaseline: boolean;
  forceAiAnalysis?: boolean;
};
type PerformanceDecision = {
  cards: DiscordEmbed[];
  triageInputs: Array<PerformanceTriageInput | null>;
  snapshot: PerformanceSnapshot;
  summary: string;
};

type IssueGroup = {
  targetUrl: string;
  formFactor: string;
  collectionPeriod?: string;
  field: string[];
  lab: string[];
  insufficient: string[];
};

const previousMeasurement = (
  previous: PerformanceSnapshot | null,
  targetId: string,
  scope: SnapshotMeasurement["scope"],
  formFactor: SnapshotMeasurement["formFactor"],
): SnapshotMeasurement | undefined =>
  previous?.targets
    .find((target) => target.id === targetId)
    ?.measurements.find(
      (measurement) => measurement.scope === scope && measurement.formFactor === formFactor,
    );

const fieldLine = (
  metric: FieldMetric,
  previousValue: number | null,
  change: number | null,
): string => {
  const unit = metric.name === "CLS" ? "" : "ms";
  const previous = previousValue === null ? "없음" : `${previousValue}${unit}`;
  const delta =
    change === null
      ? "비교 없음"
      : metric.name === "CLS"
        ? `${change >= 0 ? "+" : ""}${change.toFixed(3)}`
        : `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;
  return `${metric.name}: ${metric.p75}${unit}, 이전 ${previous}, ${delta}`;
};

const labInput = (result: LighthouseTargetResult): LabInput => ({
  lcp: result.metrics.lcp.value,
  cls: result.metrics.cls.value,
  performanceScore: result.metrics.performanceScore.value,
  tbt: result.metrics.tbt.value,
});

const labStatus = (name: string, input: LabInput): PerformanceStatus => {
  if (name === "lcp") return input.lcp > 3_000 ? "poor" : "good";
  if (name === "cls") return input.cls > 0.1 ? "poor" : "good";
  if (name === "performanceScore") return input.performanceScore < 0.8 ? "poor" : "good";
  return "good";
};

const reportFrom = (
  kind: PerformanceReport["kind"],
  group: IssueGroup,
  input: DecisionInput,
): PerformanceReport => ({
  kind,
  targetUrl: group.targetUrl,
  formFactor: group.formFactor,
  measuredAt: input.measuredAt,
  collectionPeriod: group.collectionPeriod,
  fieldSummary: group.field.length ? group.field.join("\n") : undefined,
  labSummary: group.lab.length ? group.lab.join("\n") : undefined,
  actionsRunUrl: input.actionsRunUrl,
  artifactName: SNAPSHOT_ARTIFACT_NAME,
});

/**
 * 정규화된 field와 lab 결과를 이전 snapshot과 비교해 카드와 다음 snapshot을 함께 만든다.
 * 중복 key가 남아 있는 경고는 snapshot에는 보존하지만 새 카드에는 포함하지 않는다.
 */
const buildPerformanceDecision = (input: DecisionInput): PerformanceDecision => {
  const now = new Date(input.measuredAt);
  if (Number.isNaN(now.valueOf())) throw new Error("measuredAt must be an ISO timestamp");
  const retainedAlerts = retainSentAlerts(input.previous?.sentAlerts ?? [], now);
  const sentKeys = new Set(retainedAlerts.map((alert) => alert.key));
  const newAlerts: Array<{ key: string; sentAt: string }> = [];
  const resultTargets = new Map<string, PerformanceTargetResult>();
  const issues = new Map<string, IssueGroup>();

  const target = (id: string, url: string): PerformanceTargetResult => {
    const existing = resultTargets.get(id);
    if (existing) return existing;
    const created = { id, url, measurements: [] };
    resultTargets.set(id, created);
    return created;
  };
  const issue = (id: string, url: string, formFactor: string): IssueGroup => {
    const normalizedFormFactor = formFactor === "mobile" ? "phone" : formFactor;
    const key = `${id}:${normalizedFormFactor}`;
    const existing = issues.get(key);
    if (existing) {
      if (formFactor === "mobile") existing.formFactor = "phone 및 Lighthouse mobile";
      return existing;
    }
    const created = {
      targetUrl: url,
      formFactor: formFactor === "mobile" ? "Lighthouse mobile" : formFactor,
      field: [],
      lab: [],
      insufficient: [],
    };
    issues.set(key, created);
    return created;
  };
  const registerAlert = (key: string): boolean => {
    if (sentKeys.has(key)) return false;
    sentKeys.add(key);
    newAlerts.push({ key, sentAt: input.measuredAt });
    return true;
  };

  for (const collected of input.crux) {
    const matchingTarget = input.targets.find((item) => item.url === collected.query.identifier);
    const targetId = collected.query.scope === "origin" ? "origin" : matchingTarget?.id;
    if (!targetId) throw new Error(`Unknown CrUX target ${collected.query.identifier}`);
    const targetUrl =
      collected.query.scope === "origin" ? input.siteOrigin : collected.query.identifier;
    const formFactor = collected.query.formFactor.toLowerCase() as "phone" | "desktop";
    const scope = collected.query.scope;
    const prior = previousMeasurement(input.previous, targetId, scope, formFactor);
    const currentTarget = target(targetId, targetUrl);

    if (collected.result.status === "not_found") {
      const priorMetric = prior?.metrics.find(
        (metric) => metric.status === "insufficient_data" && metric.name === "record",
      );
      const judgement = judgeInsufficientData("record_missing", priorMetric?.consecutiveCount ?? 0);
      currentTarget.measurements.push({
        scope,
        formFactor,
        collectionPeriod: null,
        metrics: [
          {
            name: "record",
            value: null,
            status: "insufficient_data",
            insufficientReason: judgement.reason,
            consecutiveCount: judgement.consecutiveCount,
          },
        ],
      });
      const key = alertKey({
        target: targetId,
        scope,
        formFactor,
        metric: "record",
        status: `insufficient_data_${judgement.consecutiveCount}`,
        collectionPeriod: null,
      });
      if (judgement.alert && (input.forceAiAnalysis || registerAlert(key))) {
        issue(targetId, targetUrl, formFactor).insufficient.push(
          `CrUX record 없음, ${judgement.consecutiveCount}회 연속`,
        );
      }
      continue;
    }

    const period = collected.result.record.collectionPeriod.lastDate;
    const snapshotMetrics: SnapshotMetric[] = [];
    for (const metric of collected.result.record.metrics) {
      const previousMetric = prior?.metrics.find(
        (candidate) => candidate.name === metric.name && candidate.value !== null,
      );
      const judgement = judgeFieldMetric(
        { metric: metric.name, value: metric.p75, collectionPeriod: period },
        previousMetric && prior?.collectionPeriod
          ? {
              metric: metric.name,
              value: previousMetric.value as number,
              status: previousMetric.status as PerformanceStatus,
              collectionPeriod: prior.collectionPeriod,
            }
          : undefined,
      );
      snapshotMetrics.push({ name: metric.name, value: metric.p75, status: judgement.status });
      if (!judgement.alert) continue;
      const key = alertKey({
        target: targetId,
        scope,
        formFactor,
        metric: metric.name,
        status: judgement.status,
        collectionPeriod: period,
      });
      if (input.forceAiAnalysis || registerAlert(key)) {
        const group = issue(targetId, targetUrl, formFactor);
        group.collectionPeriod = period;
        group.field.push(fieldLine(metric, judgement.previousValue, judgement.change));
      }
    }
    currentTarget.measurements.push({
      scope,
      formFactor,
      collectionPeriod: period,
      metrics: snapshotMetrics,
    });
  }

  for (const result of input.lighthouse) {
    const matchingTarget = input.targets.find((item) => item.url === result.url);
    if (!matchingTarget) throw new Error(`Unknown Lighthouse target ${result.url}`);
    const current = labInput(result);
    const prior = previousMeasurement(input.previous, matchingTarget.id, "lab", "mobile");
    const previousValues = prior
      ? Object.fromEntries(
          ["lcp", "cls", "performanceScore", "tbt"].map((name) => [
            name,
            prior.metrics.find((metric) => metric.name === name)?.value,
          ]),
        )
      : null;
    const previousLab =
      previousValues && Object.values(previousValues).every((value) => typeof value === "number")
        ? (previousValues as LabInput)
        : undefined;
    const judgement = judgeLab(current, previousLab);
    const metrics = Object.entries(result.metrics).map(([name, range]) => ({
      name,
      value: range.value,
      status: labStatus(name, current),
    }));
    target(matchingTarget.id, result.url).measurements.push({
      scope: "lab",
      formFactor: "mobile",
      collectionPeriod: null,
      metrics,
    });
    for (const alert of judgement.alerts) {
      const key = alertKey({
        target: matchingTarget.id,
        scope: "lab",
        formFactor: "mobile",
        metric: alert.metric,
        status: alert.reason,
        collectionPeriod: null,
      });
      if (!registerAlert(key)) continue;
      const metricName =
        alert.metric === "LCP"
          ? "lcp"
          : alert.metric === "TBT"
            ? "tbt"
            : alert.metric === "CLS"
              ? "cls"
              : "performanceScore";
      const range = result.metrics[metricName];
      const priorValue = previousLab?.[metricName];
      const changeRatio =
        priorValue === undefined || priorValue === 0
          ? null
          : (alert.value - priorValue) / priorValue;
      const change =
        changeRatio === null
          ? "비교 없음"
          : `${changeRatio >= 0 ? "+" : ""}${(changeRatio * 100).toFixed(1)}%`;
      issue(matchingTarget.id, result.url, "mobile").lab.push(
        `${alert.metric}: ${alert.value}, 이전 ${priorValue ?? "없음"}, ${change}, 범위 ${range.min}-${range.max}${
          result.status === "partial" ? ", partial" : ""
        }`,
      );
    }
  }

  const reports: PerformanceReport[] = [];
  const insufficientReports: string[] = [];
  for (const group of issues.values()) {
    if (group.insufficient.length) {
      insufficientReports.push(
        `${group.targetUrl} (${group.formFactor}): ${group.insufficient.join(", ")}`,
      );
    }
    if (group.field.length || group.lab.length) {
      reports.push(
        reportFrom(
          group.field.length && group.lab.length
            ? "combined"
            : group.field.length
              ? "field"
              : "lab",
          group,
          input,
        ),
      );
    }
  }
  if (insufficientReports.length) {
    reports.unshift({
      kind: "insufficient_data",
      targetUrl: input.siteOrigin,
      formFactor: "전체 대상",
      measuredAt: input.measuredAt,
      fieldSummary: insufficientReports.join("\n"),
      actionsRunUrl: input.actionsRunUrl,
      artifactName: SNAPSHOT_ARTIFACT_NAME,
    });
  }
  if (!reports.length && input.sendBaseline) {
    reports.push({
      kind: "baseline",
      targetUrl: input.siteOrigin,
      formFactor: "전체 대상",
      measuredAt: input.measuredAt,
      actionsRunUrl: input.actionsRunUrl,
      artifactName: SNAPSHOT_ARTIFACT_NAME,
    });
  }

  const collectionPeriods = input.crux.flatMap((item) =>
    item.result.status === "ok" ? [item.result.record.collectionPeriod.lastDate] : [],
  );
  const snapshot: PerformanceSnapshot = {
    schemaVersion: 1,
    measuredAt: input.measuredAt,
    siteOrigin: input.siteOrigin,
    release: input.release,
    cruxCollectionPeriod: collectionPeriods.sort().at(-1) ?? null,
    targets: [...resultTargets.values()],
    sentAlerts: retainSentAlerts([...retainedAlerts, ...newAlerts], now),
  };
  const cards = reports.flatMap((report) => {
    const card = createPerformanceDiscordCard(report, input.sendBaseline);
    return card ? [card] : [];
  });
  const triageInputs = reports.map((report): PerformanceTriageInput | null => {
    if (report.kind === "baseline" || report.kind === "insufficient_data") return null;
    const currentTarget = snapshot.targets.find((target) => target.url === report.targetUrl);
    const previousTarget = input.previous?.targets.find(
      (target) => target.url === report.targetUrl,
    );
    if (!currentTarget) return null;
    const scopes =
      report.kind === "lab"
        ? ["lab"]
        : report.kind === "combined"
          ? ["url", "origin", "lab"]
          : ["url", "origin"];
    const measurements = currentTarget.measurements.filter((measurement) =>
      scopes.includes(measurement.scope),
    );
    const metrics = measurements.flatMap((measurement) => {
      const previous = previousTarget?.measurements.find(
        (candidate) =>
          candidate.scope === measurement.scope && candidate.formFactor === measurement.formFactor,
      );
      return measurement.metrics.flatMap((metric) =>
        metric.value === null
          ? []
          : [
              {
                source: measurement.scope === "lab" ? ("lab" as const) : ("field" as const),
                metric: metric.name,
                current: metric.value,
                previous:
                  previous?.metrics.find((candidate) => candidate.name === metric.name)?.value ??
                  null,
                status: metric.status,
              },
            ],
      );
    });
    const lighthouse = input.lighthouse.find((result) => result.url === report.targetUrl);
    return {
      target: report.targetUrl,
      scope:
        report.kind === "lab" ? "lab" : report.targetUrl === input.siteOrigin ? "origin" : "url",
      formFactor: report.formFactor,
      collectionPeriod: report.collectionPeriod ?? null,
      release: input.release,
      metrics,
      diagnostics: lighthouse?.diagnostics ?? [],
    };
  });
  const statusRows = snapshot.targets.flatMap((target) =>
    target.measurements.map(
      (measurement) =>
        `| ${target.id} | ${measurement.scope} | ${measurement.formFactor} | ${measurement.metrics
          .map((metric) => `${metric.name}: ${metric.status}`)
          .join(", ")} |`,
    ),
  );
  const summary = [
    `측정 대상 ${input.targets.length}개, 새 알림 ${cards.length}개, CrUX ${input.crux.length}건, Lighthouse ${input.lighthouse.length}건`,
    "",
    "| 대상 | 측정 | form factor | 상태 |",
    "| --- | --- | --- | --- |",
    ...statusRows,
  ].join("\n");
  return { cards, triageInputs, snapshot, summary };
};

export { buildPerformanceDecision };
