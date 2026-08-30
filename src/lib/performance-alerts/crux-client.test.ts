import { describe, expect, it, vi } from "vitest";

import {
  collectCruxRecords,
  CRUX_ENDPOINT,
  cruxQueries,
  normalizeCruxRecord,
  queryCruxRecord,
} from "@/lib/performance-alerts/crux-client";

const query = {
  scope: "origin" as const,
  identifier: "https://sungjoon.works",
  formFactor: "PHONE" as const,
};

const metric = (p75: number | string, densities = [0.7, 0.2, 0.1]) => ({
  histogram: densities.map((density) => ({ density })),
  percentiles: { p75 },
});

const rawRecord = () => ({
  record: {
    key: { origin: "https://sungjoon.works", formFactor: "PHONE" },
    collectionPeriod: {
      firstDate: { year: 2026, month: 8, day: 1 },
      lastDate: { year: 2026, month: 8, day: 28 },
    },
    metrics: {
      largest_contentful_paint: metric(2400),
      interaction_to_next_paint: metric(180),
      cumulative_layout_shift: metric("0.08"),
    },
  },
});

const jsonResponse = (status: number, body: unknown, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

describe("CrUX client", () => {
  it("record의 날짜, 단위와 histogram을 정규화한다", () => {
    expect(normalizeCruxRecord(rawRecord(), query)).toEqual({
      scope: "origin",
      identifier: "https://sungjoon.works",
      formFactor: "phone",
      collectionPeriod: { firstDate: "2026-08-01", lastDate: "2026-08-28" },
      metrics: [
        {
          name: "LCP",
          p75: 2400,
          goodRatio: 0.7,
          needsImprovementRatio: 0.2,
          poorRatio: 0.1,
        },
        {
          name: "INP",
          p75: 180,
          goodRatio: 0.7,
          needsImprovementRatio: 0.2,
          poorRatio: 0.1,
        },
        {
          name: "CLS",
          p75: 0.08,
          goodRatio: 0.7,
          needsImprovementRatio: 0.2,
          poorRatio: 0.1,
        },
      ],
    });
  });

  it.each([
    [
      () => ({ ...rawRecord(), record: { ...rawRecord().record, collectionPeriod: {} } }),
      "firstDate",
    ],
    [
      () => {
        const value = rawRecord();
        value.record.metrics.cumulative_layout_shift = metric("NaN");
        return value;
      },
      "p75",
    ],
    [
      () => {
        const value = rawRecord();
        value.record.metrics.largest_contentful_paint = metric(2_400, [0.5, 0.2, 0.1]);
        return value;
      },
      "density total",
    ],
    [
      () => {
        const value = rawRecord();
        delete (value.record.metrics as Partial<typeof value.record.metrics>)
          .interaction_to_next_paint;
        return value;
      },
      "metric interaction_to_next_paint",
    ],
  ])("잘못된 응답을 거부한다", (makeValue, message) => {
    expect(() => normalizeCruxRecord(makeValue(), query)).toThrow(message);
  });

  it("API key를 header로 보내고 요청 필드를 제한한다", async () => {
    const request = vi.fn().mockResolvedValue(jsonResponse(200, rawRecord()));
    await expect(queryCruxRecord(query, "secret-key", { request })).resolves.toMatchObject({
      status: "ok",
    });

    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(CRUX_ENDPOINT);
    expect(url).not.toContain("secret-key");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("secret-key");
    expect(JSON.parse(String(init.body))).toEqual({
      origin: "https://sungjoon.works",
      formFactor: "PHONE",
      metrics: ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"],
    });
  });

  it("origin과 네 URL을 PHONE과 DESKTOP으로 나눠 열 건 조회한다", async () => {
    const targets = ["/ko", "/ko/photo", "/ko/music", "/ko/dev"].map((path) => ({
      id: path,
      url: `https://sungjoon.works${path}`,
    }));
    const queries = cruxQueries("https://sungjoon.works", targets);
    expect(queries).toHaveLength(10);
    expect(queries.slice(0, 2)).toEqual([
      { scope: "origin", identifier: "https://sungjoon.works", formFactor: "PHONE" },
      { scope: "origin", identifier: "https://sungjoon.works", formFactor: "DESKTOP" },
    ]);
    expect(queries.at(-1)).toEqual({
      scope: "url",
      identifier: "https://sungjoon.works/ko/dev",
      formFactor: "DESKTOP",
    });

    const request = vi.fn().mockResolvedValue(jsonResponse(404, {}));
    const collected = await collectCruxRecords("https://sungjoon.works", targets, "key", {
      request,
    });
    expect(collected).toHaveLength(10);
    expect(request).toHaveBeenCalledTimes(10);
    expect(collected.every(({ result }) => result.status === "not_found")).toBe(true);
  });

  it("DESKTOP record를 구분하고 요청 timeout signal을 전달한다", async () => {
    const request = vi.fn().mockResolvedValue(jsonResponse(200, rawRecord()));
    const result = await queryCruxRecord({ ...query, formFactor: "DESKTOP" }, "key", {
      request,
      timeoutMs: 321,
    });
    expect(result).toMatchObject({ status: "ok", record: { formFactor: "desktop" } });
    const init = request.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("404를 표본 없음으로 반환한다", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, { error: { status: "NOT_FOUND" } }));
    await expect(queryCruxRecord(query, "key", { request })).resolves.toEqual({
      status: "not_found",
    });
  });

  it("Retry-After를 따라 429 뒤에 재시도한다", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "2" }))
      .mockResolvedValueOnce(jsonResponse(200, rawRecord()));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(queryCruxRecord(query, "key", { request, sleep })).resolves.toMatchObject({
      status: "ok",
    });
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("5xx를 세 번까지만 재시도한다", async () => {
    const request = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(queryCruxRecord(query, "key", { request, sleep })).rejects.toThrow(
      "CrUX API failed (503)",
    );
    expect(request).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it.each([400, 403])("%i는 재시도하지 않는다", async (status) => {
    const request = vi.fn().mockResolvedValue(jsonResponse(status, {}));
    const sleep = vi.fn();
    await expect(queryCruxRecord(query, "key", { request, sleep })).rejects.toThrow(
      `CrUX API failed (${status})`,
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("빈 API key를 요청 전에 거부한다", async () => {
    const request = vi.fn();
    await expect(queryCruxRecord(query, " ", { request })).rejects.toThrow("CRUX_API_KEY");
    expect(request).not.toHaveBeenCalled();
  });
});
