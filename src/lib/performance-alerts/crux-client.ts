const CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
const CRUX_METRICS = [
  "largest_contentful_paint",
  "interaction_to_next_paint",
  "cumulative_layout_shift",
] as const;
const DENSITY_TOLERANCE = 0.002;
const MAX_ATTEMPTS = 3;

type CruxMetricName = (typeof CRUX_METRICS)[number];
type FormFactor = "PHONE" | "DESKTOP";
type FieldMetricName = "LCP" | "INP" | "CLS";

type FieldMetric = {
  name: FieldMetricName;
  p75: number;
  goodRatio: number;
  needsImprovementRatio: number;
  poorRatio: number;
};

type FieldRecord = {
  scope: "origin" | "url";
  identifier: string;
  formFactor: Lowercase<FormFactor>;
  collectionPeriod: { firstDate: string; lastDate: string };
  metrics: FieldMetric[];
};

type CruxQuery =
  | { scope: "origin"; identifier: string; formFactor: FormFactor }
  | { scope: "url"; identifier: string; formFactor: FormFactor };

type CruxQueryResult = { status: "ok"; record: FieldRecord } | { status: "not_found" };
type CruxTarget = { id: string; url: string };
type CollectedCruxResult = { query: CruxQuery; result: CruxQueryResult };

type CruxDependencies = {
  request?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
};

const asObject = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid CrUX ${label}`);
  }
  return value as Record<string, unknown>;
};

const finiteNumber = (value: unknown, label: string): number => {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid CrUX ${label}`);
  }
  return parsed;
};

const isoDate = (value: unknown, label: string): string => {
  const date = asObject(value, label);
  const year = finiteNumber(date.year, `${label}.year`);
  const month = finiteNumber(date.month, `${label}.month`);
  const day = finiteNumber(date.day, `${label}.day`);
  if (![year, month, day].every(Number.isInteger)) throw new Error(`Invalid CrUX ${label}`);

  const result = new Date(Date.UTC(year, month - 1, day));
  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) {
    throw new Error(`Invalid CrUX ${label}`);
  }
  return result.toISOString().slice(0, 10);
};

const metricLabel = (name: CruxMetricName): FieldMetricName => {
  if (name === "largest_contentful_paint") return "LCP";
  if (name === "interaction_to_next_paint") return "INP";
  return "CLS";
};

/**
 * CrUX의 LCP·INP p75는 숫자이고 CLS p75는 문자열이다. 세 histogram bin은 순서대로
 * good, needs improvement, poor를 뜻하며 반올림 때문에 합이 정확히 1이 아닐 수 있다.
 */
const normalizeMetric = (name: CruxMetricName, value: unknown): FieldMetric => {
  const metric = asObject(value, `metric ${name}`);
  const percentiles = asObject(metric.percentiles, `${name}.percentiles`);
  const histogram = metric.histogram;
  if (!Array.isArray(histogram) || histogram.length !== 3) {
    throw new Error(`Invalid CrUX ${name}.histogram`);
  }
  const densities = histogram.map((bin, index) =>
    finiteNumber(asObject(bin, `${name}.histogram[${index}]`).density, `${name}.density`),
  );
  if (densities.some((density) => density > 1)) throw new Error(`Invalid CrUX ${name}.density`);
  const total = densities.reduce((sum, density) => sum + density, 0);
  if (Math.abs(total - 1) > DENSITY_TOLERANCE) {
    throw new Error(`Invalid CrUX ${name} density total`);
  }

  return {
    name: metricLabel(name),
    p75: finiteNumber(percentiles.p75, `${name}.p75`),
    goodRatio: densities[0] ?? 0,
    needsImprovementRatio: densities[1] ?? 0,
    poorRatio: densities[2] ?? 0,
  };
};

/**
 * CrUX 응답에서 판정에 필요한 record만 남긴다. collection period는 metric별 값이 아니라
 * record 전체의 기간이므로 한 번만 보존한다.
 */
const normalizeCruxRecord = (raw: unknown, query: CruxQuery): FieldRecord => {
  const body = asObject(raw, "response");
  const record = asObject(body.record, "record");
  const period = asObject(record.collectionPeriod, "collectionPeriod");
  const metrics = asObject(record.metrics, "metrics");

  return {
    scope: query.scope,
    identifier: query.identifier,
    formFactor: query.formFactor.toLowerCase() as Lowercase<FormFactor>,
    collectionPeriod: {
      firstDate: isoDate(period.firstDate, "collectionPeriod.firstDate"),
      lastDate: isoDate(period.lastDate, "collectionPeriod.lastDate"),
    },
    metrics: CRUX_METRICS.map((name) => normalizeMetric(name, metrics[name])),
  };
};

const retryDelayMs = (response: Response, attempt: number): number => {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 10_000);
  }
  return Math.min(250 * 2 ** attempt, 2_000);
};

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const queryCruxRecord = async (
  query: CruxQuery,
  apiKey: string,
  dependencies: CruxDependencies = {},
): Promise<CruxQueryResult> => {
  if (!apiKey.trim()) throw new Error("CRUX_API_KEY is required");
  const request = dependencies.request ?? fetch;
  const sleep = dependencies.sleep ?? defaultSleep;
  const timeoutMs = dependencies.timeoutMs ?? 15_000;
  const body = {
    [query.scope]: query.identifier,
    formFactor: query.formFactor,
    metrics: CRUX_METRICS,
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await request(CRUX_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // Query string은 오류 로그와 프록시 기록에 남기 쉬우므로 key를 header로 보낸다.
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok)
      return { status: "ok", record: normalizeCruxRecord(await response.json(), query) };
    // CrUX는 유효한 origin이라도 공개 표본이 부족하면 404를 반환한다.
    if (response.status === 404) return { status: "not_found" };

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) {
      throw new Error(`CrUX API failed (${response.status})`);
    }
    await sleep(retryDelayMs(response, attempt));
  }

  throw new Error("CrUX API retry budget exhausted");
};

const cruxQueries = (origin: string, targets: readonly CruxTarget[]): CruxQuery[] => [
  { scope: "origin", identifier: origin, formFactor: "PHONE" },
  { scope: "origin", identifier: origin, formFactor: "DESKTOP" },
  ...targets.flatMap(({ url }) => [
    { scope: "url" as const, identifier: url, formFactor: "PHONE" as const },
    { scope: "url" as const, identifier: url, formFactor: "DESKTOP" as const },
  ]),
];

/**
 * origin과 각 대표 URL을 PHONE·DESKTOP으로 나눠 순서대로 조회한다. 요청을 직렬화해 첫 실행의
 * 열 건이 한꺼번에 quota를 점유하지 않게 한다.
 */
const collectCruxRecords = async (
  origin: string,
  targets: readonly CruxTarget[],
  apiKey: string,
  dependencies: CruxDependencies = {},
): Promise<CollectedCruxResult[]> => {
  const collected: CollectedCruxResult[] = [];
  for (const query of cruxQueries(origin, targets)) {
    collected.push({ query, result: await queryCruxRecord(query, apiKey, dependencies) });
  }
  return collected;
};

export { collectCruxRecords, CRUX_ENDPOINT, cruxQueries, normalizeCruxRecord, queryCruxRecord };
