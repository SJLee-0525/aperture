const SNAPSHOT_SCHEMA_VERSION = 1 as const;
const SNAPSHOT_ARTIFACT_NAME = "core-web-vitals-snapshot";
const SENT_ALERT_TTL_MS = 90 * 24 * 60 * 60 * 1_000;

type SentAlert = { key: string; sentAt: string };
type SnapshotMetric = {
  name: string;
  value: number;
  status: "good" | "needs_improvement" | "poor" | "insufficient_data";
};
type SnapshotMeasurement = {
  scope: "origin" | "url" | "lab";
  formFactor: "phone" | "desktop" | "mobile";
  collectionPeriod: string | null;
  metrics: SnapshotMetric[];
};
type PerformanceTargetResult = {
  id: string;
  url: string;
  measurements: SnapshotMeasurement[];
};
type PerformanceSnapshot = {
  schemaVersion: 1;
  measuredAt: string;
  siteOrigin: string;
  release: string | null;
  cruxCollectionPeriod: string | null;
  targets: PerformanceTargetResult[];
  sentAlerts: SentAlert[];
};

type AlertKeyParts = {
  target: string;
  scope: "origin" | "url" | "lab";
  formFactor: "phone" | "desktop" | "mobile";
  metric: string;
  status: string;
  collectionPeriod: string | null;
};

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid snapshot ${label}`);
  }
  return value as Record<string, unknown>;
};

const string = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid snapshot ${label}`);
  return value;
};

const oneOf = <T extends string>(value: unknown, values: readonly T[], label: string): T => {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`Invalid snapshot ${label}`);
  }
  return value as T;
};

const isoDate = (value: unknown, label: string): string => {
  const result = string(value, label);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(result)) {
    throw new Error(`Invalid snapshot ${label}`);
  }
  const parsed = new Date(result);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`Invalid snapshot ${label}`);
  if (result.length === 10 && parsed.toISOString().slice(0, 10) !== result) {
    throw new Error(`Invalid snapshot ${label}`);
  }
  return result;
};

const nullableIsoDate = (value: unknown, label: string): string | null =>
  value === null ? null : isoDate(value, label);

const parseMetric = (value: unknown, label: string): SnapshotMetric => {
  const metric = object(value, label);
  if (typeof metric.value !== "number" || !Number.isFinite(metric.value) || metric.value < 0) {
    throw new Error(`Invalid snapshot ${label}.value`);
  }
  return {
    name: string(metric.name, `${label}.name`),
    value: metric.value,
    status: oneOf(
      metric.status,
      ["good", "needs_improvement", "poor", "insufficient_data"] as const,
      `${label}.status`,
    ),
  };
};

const parseMeasurement = (value: unknown, label: string): SnapshotMeasurement => {
  const measurement = object(value, label);
  if (!Array.isArray(measurement.metrics)) throw new Error(`Invalid snapshot ${label}.metrics`);
  return {
    scope: oneOf(measurement.scope, ["origin", "url", "lab"] as const, `${label}.scope`),
    formFactor: oneOf(
      measurement.formFactor,
      ["phone", "desktop", "mobile"] as const,
      `${label}.formFactor`,
    ),
    collectionPeriod: nullableIsoDate(measurement.collectionPeriod, `${label}.collectionPeriod`),
    metrics: measurement.metrics.map((metric, index) =>
      parseMetric(metric, `${label}.metrics[${index}]`),
    ),
  };
};

const parseTarget = (value: unknown, index: number): PerformanceTargetResult => {
  const target = object(value, `targets[${index}]`);
  if (!Array.isArray(target.measurements)) {
    throw new Error(`Invalid snapshot targets[${index}].measurements`);
  }
  const url = string(target.url, `targets[${index}].url`);
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid snapshot targets[${index}].url`);
  }
  return {
    id: string(target.id, `targets[${index}].id`),
    url,
    measurements: target.measurements.map((measurement, measurementIndex) =>
      parseMeasurement(measurement, `targets[${index}].measurements[${measurementIndex}]`),
    ),
  };
};

/**
 * artifact에서 읽은 JSON의 모든 중첩 값을 신뢰 경계에서 검증한다.
 * schema가 다르거나 일부 값이 손상되면 이전 결과 비교에 사용하지 않는다.
 */
const parsePerformanceSnapshot = (value: unknown): PerformanceSnapshot => {
  const snapshot = object(value, "root");
  if (snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error("Unsupported snapshot schemaVersion");
  }
  if (!Array.isArray(snapshot.targets) || !Array.isArray(snapshot.sentAlerts)) {
    throw new Error("Invalid snapshot collections");
  }
  const siteOrigin = string(snapshot.siteOrigin, "siteOrigin");
  const origin = new URL(siteOrigin);
  if (origin.origin !== siteOrigin) throw new Error("Invalid snapshot siteOrigin");

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    measuredAt: isoDate(snapshot.measuredAt, "measuredAt"),
    siteOrigin,
    release: snapshot.release === null ? null : string(snapshot.release, "release"),
    cruxCollectionPeriod: nullableIsoDate(snapshot.cruxCollectionPeriod, "cruxCollectionPeriod"),
    targets: snapshot.targets.map(parseTarget),
    sentAlerts: snapshot.sentAlerts.map((value, index) => {
      const alert = object(value, `sentAlerts[${index}]`);
      return {
        key: string(alert.key, `sentAlerts[${index}].key`),
        sentAt: isoDate(alert.sentAt, `sentAlerts[${index}].sentAt`),
      };
    }),
  };
};

/** collection period까지 key에 포함해 같은 CrUX 표본의 반복 실행이 중복 알림을 만들지 않게 한다. */
const alertKey = (parts: AlertKeyParts): string =>
  [
    parts.target,
    parts.scope,
    parts.formFactor,
    parts.metric,
    parts.status,
    parts.collectionPeriod ?? "none",
  ]
    .map(encodeURIComponent)
    .join(":");

/**
 * Discord 중복 이력은 artifact 보존 기간과 같은 90일만 유지한다.
 * 같은 key가 여러 번 있으면 가장 최근 전송만 남긴다.
 */
const retainSentAlerts = (alerts: readonly SentAlert[], now: Date): SentAlert[] => {
  const cutoff = now.valueOf() - SENT_ALERT_TTL_MS;
  const newestByKey = new Map<string, SentAlert>();
  for (const alert of alerts) {
    const sentAt = isoDate(alert.sentAt, "sentAt");
    if (new Date(sentAt).valueOf() < cutoff) continue;
    const previous = newestByKey.get(alert.key);
    if (!previous || previous.sentAt < sentAt) newestByKey.set(alert.key, { ...alert, sentAt });
  }
  return [...newestByKey.values()].sort((left, right) => left.sentAt.localeCompare(right.sentAt));
};

export { alertKey, parsePerformanceSnapshot, retainSentAlerts, SNAPSHOT_ARTIFACT_NAME };
