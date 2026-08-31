import { describe, expect, it, vi } from "vitest";

import { runCoreWebVitalsReport } from "./core-web-vitals-report";

import type { DiscordEmbed } from "@/lib/discord/types";
import type { PerformanceDecision } from "@/lib/performance-alerts/report-decision";
import type { PerformanceSnapshot } from "@/lib/performance-alerts/snapshot";
import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type { PerformanceTriageProviderResult } from "@/lib/performance-alerts/triage-provider";

type Dependencies = Parameters<typeof runCoreWebVitalsReport>[0];

const card = (title: string): DiscordEmbed => ({ title, color: 0 });

const triageInput = (
  target: string,
  overrides: Partial<PerformanceTriageInput> = {},
): PerformanceTriageInput => ({
  target,
  scope: "url",
  formFactor: "phone",
  collectionPeriod: null,
  release: null,
  metrics: [],
  diagnostics: [],
  ...overrides,
});

const snapshot = (): PerformanceSnapshot => ({
  schemaVersion: 1,
  measuredAt: "2026-08-31T00:00:00.000Z",
  siteOrigin: "https://example.test",
  release: null,
  cruxCollectionPeriod: null,
  targets: [],
  sentAlerts: [],
});

const decision = (overrides: Partial<PerformanceDecision> = {}): PerformanceDecision => ({
  cards: [],
  triageInputs: [],
  snapshot: snapshot(),
  summary: "정상",
  ...overrides,
});

const analysisOf = (
  targets: Array<Partial<PerformanceTriageProviderResult["result"]["targets"][number]>>,
): PerformanceTriageProviderResult => ({
  result: {
    commonSummary: "요약",
    commonCauses: [],
    targets: targets.map((target, targetIndex) => ({
      targetIndex,
      summary: "요약",
      userImpact: "영향",
      likelyCauses: [],
      inspectFirst: [],
      recommendedChecks: [],
      confidence: "low" as const,
      ...target,
    })),
  },
  provider: "mock",
  model: "mock",
});

const liveSignal = () => new AbortController().signal;

const dependencies = () => ({
  preflight: vi.fn<Dependencies["preflight"]>(async () => undefined),
  loadPreviousSnapshot: vi.fn<Dependencies["loadPreviousSnapshot"]>(async () => ({
    status: "cold_start",
  })),
  collectCrux: vi.fn<Dependencies["collectCrux"]>(async () => ({
    complete: true,
    value: [],
  })),
  collectLighthouse: vi.fn<Dependencies["collectLighthouse"]>(async () => ({
    complete: true,
    value: [],
  })),
  judge: vi.fn<Dependencies["judge"]>(async () => decision()),
  sendCard: vi.fn<Dependencies["sendCard"]>(async () => ({ ok: true })),
  analyzeTargets: vi.fn<NonNullable<Dependencies["analyzeTargets"]>>(async (inputs) =>
    analysisOf(inputs.map(() => ({}))),
  ),
  renderCards: vi.fn<Dependencies["renderCards"]>((entries) => entries.map((entry) => entry.card)),
  writeAiReport: vi.fn<NonNullable<Dependencies["writeAiReport"]>>(async () => undefined),
  writeSnapshot: vi.fn<Dependencies["writeSnapshot"]>(async () => undefined),
  appendSummary: vi.fn<Dependencies["appendSummary"]>(async () => undefined),
});

describe("runCoreWebVitalsReport", () => {
  it("preflight, 이전 snapshot, CrUX, Lighthouse, 판정, 저장 순서로 실행한다", async () => {
    const calls: string[] = [];
    const deps = dependencies();
    deps.preflight.mockImplementation(async () => void calls.push("preflight"));
    deps.loadPreviousSnapshot.mockImplementation(async () => {
      calls.push("loadPreviousSnapshot");
      return { status: "cold_start" };
    });
    deps.collectCrux.mockImplementation(async () => {
      calls.push("collectCrux");
      return { complete: true, value: [] };
    });
    deps.collectLighthouse.mockImplementation(async () => {
      calls.push("collectLighthouse");
      return { complete: true, value: [] };
    });
    deps.judge.mockImplementation(async () => {
      calls.push("judge");
      return decision();
    });
    deps.writeSnapshot.mockImplementation(async () => void calls.push("writeSnapshot"));
    await runCoreWebVitalsReport(deps, liveSignal());
    expect(calls).toEqual([
      "preflight",
      "loadPreviousSnapshot",
      "collectCrux",
      "collectLighthouse",
      "judge",
      "writeSnapshot",
    ]);
  });

  it("이전 artifact 조회 실패는 비교를 생략하고 현재 측정을 계속한다", async () => {
    const deps = dependencies();
    deps.loadPreviousSnapshot.mockRejectedValue(new Error("GitHub 503"));
    await expect(runCoreWebVitalsReport(deps, liveSignal())).resolves.toBeUndefined();
    expect(deps.appendSummary).toHaveBeenCalledWith("비교 생략: GitHub 503");
    expect(deps.collectCrux).toHaveBeenCalled();
  });

  it("CrUX 전체 실패는 summary를 남기고 실패한다", async () => {
    const deps = dependencies();
    deps.collectCrux.mockRejectedValue(new Error("request failed"));
    await expect(runCoreWebVitalsReport(deps, liveSignal())).rejects.toThrow(
      "CrUX collection failed",
    );
    expect(deps.collectLighthouse).not.toHaveBeenCalled();
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
  });

  it("Lighthouse가 불완전하면 snapshot을 쓰지 않고 실패한다", async () => {
    const deps = dependencies();
    deps.collectLighthouse.mockResolvedValue({ complete: false, value: [] });
    await expect(runCoreWebVitalsReport(deps, liveSignal())).rejects.toThrow(
      "Lighthouse collection failed",
    );
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
  });

  it("CrUX 일부 결과가 불완전하면 판정하되 snapshot을 대체하지 않는다", async () => {
    const deps = dependencies();
    deps.collectCrux.mockResolvedValue({ complete: false, value: [] });
    await expect(runCoreWebVitalsReport(deps, liveSignal())).resolves.toBeUndefined();
    expect(deps.judge).toHaveBeenCalled();
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
    expect(deps.appendSummary).toHaveBeenCalledWith(
      "현재 측정이 불완전해 이전 정상 snapshot을 대체하지 않습니다.",
    );
  });

  it("Discord 실패 시 snapshot을 쓰지 않고 실패한다", async () => {
    const deps = dependencies();
    deps.judge.mockResolvedValue(decision({ cards: [card("경고")], summary: "경고" }));
    deps.sendCard.mockResolvedValue({
      ok: false,
      error: "webhook=https://secret.example/?token=abc",
    });
    await expect(runCoreWebVitalsReport(deps, liveSignal())).rejects.toThrow(
      "Discord delivery failed",
    );
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
    expect(deps.appendSummary).toHaveBeenCalledWith("Discord 전송 실패: webhook=[redacted-secret]");
  });

  it("여러 대상을 한 번의 batch 요청으로 분석한다", async () => {
    const deps = dependencies();
    const inputs = [triageInput("/ko"), triageInput("/ko/photo")];
    deps.judge.mockResolvedValue(
      decision({
        cards: [card("a"), card("b"), card("데이터 부족")],
        triageInputs: [...inputs, null],
        summary: "경고",
      }),
    );
    await runCoreWebVitalsReport(deps, liveSignal());
    expect(deps.analyzeTargets).toHaveBeenCalledTimes(1);
    expect(deps.analyzeTargets).toHaveBeenCalledWith(inputs, expect.any(AbortSignal));
  });

  it("상한을 넘는 대상은 심각도 상위만 분석하고 나머지는 측정값 카드로 남긴다", async () => {
    const deps = dependencies();
    // 뒤쪽 대상일수록 LCP 악화가 크므로 심각도 정렬이 입력 순서를 뒤집는다.
    const inputs = Array.from({ length: 26 }, (_, index) =>
      triageInput(`https://example.test/${index}`, {
        metrics: [
          {
            source: "field",
            metric: "LCP",
            current: 3_000 + index * 100,
            previous: 3_000,
            status: "poor",
          },
        ],
      }),
    );
    deps.judge.mockResolvedValue(
      decision({
        cards: inputs.map((input) => card(input.target)),
        triageInputs: inputs,
        summary: "경고",
      }),
    );
    await runCoreWebVitalsReport(deps, liveSignal());

    const analyzed = deps.analyzeTargets.mock.calls[0]![0];
    expect(analyzed).toHaveLength(20);
    expect(analyzed[0]?.target).toBe("https://example.test/25");
    expect(analyzed.at(-1)?.target).toBe("https://example.test/6");
    expect(deps.appendSummary).toHaveBeenCalledWith(
      "AI 분석 대상 20개, 나머지 6개는 측정값 카드만 전송",
    );

    const rendered = deps.renderCards.mock.calls[0]?.[0] ?? [];
    expect(rendered.filter((entry) => entry.triageOrder !== null)).toHaveLength(20);
    expect(rendered.filter((entry) => entry.triageOrder === null)).toHaveLength(6);
  });

  it("심각도 정렬로 순서가 바뀌어도 분석을 원래 카드에 붙인다", async () => {
    const deps = dependencies();
    const inputs = [
      triageInput("https://example.test/mild", {
        metrics: [
          { source: "field", metric: "LCP", current: 3_010, previous: 3_000, status: "poor" },
        ],
      }),
      triageInput("https://example.test/severe", {
        metrics: [
          { source: "field", metric: "LCP", current: 9_000, previous: 3_000, status: "poor" },
        ],
      }),
    ];
    deps.judge.mockResolvedValue(
      decision({
        cards: inputs.map((input) => card(input.target)),
        triageInputs: inputs,
        summary: "경고",
      }),
    );
    deps.renderCards.mockImplementation((entries, analysis) =>
      entries
        .filter((entry) => entry.triageOrder !== null)
        .sort((left, right) => (left.triageOrder ?? 0) - (right.triageOrder ?? 0))
        .map((entry, index) => ({
          ...entry.card,
          description: analysis?.result.targets[index]?.summary,
        })),
    );
    // provider는 요청 순서대로 대상별 분석을 돌려준다.
    deps.analyzeTargets.mockImplementation(async (received) =>
      analysisOf(received.map((input) => ({ summary: `${input.target} 분석` }))),
    );
    await runCoreWebVitalsReport(deps, liveSignal());

    expect(deps.sendCard.mock.calls.map(([sent]) => sent)).toEqual([
      { ...card("https://example.test/severe"), description: "https://example.test/severe 분석" },
      { ...card("https://example.test/mild"), description: "https://example.test/mild 분석" },
    ]);
  });

  it("분석 결과와 카드를 renderCards에 함께 넘긴다", async () => {
    const deps = dependencies();
    const input = triageInput("/ko");
    const analysis = analysisOf([{ summary: "분석" }]);
    deps.judge.mockResolvedValue(
      decision({ cards: [card("기본")], triageInputs: [input], summary: "경고" }),
    );
    deps.analyzeTargets.mockResolvedValue(analysis);
    deps.renderCards.mockReturnValue([card("AI 결합")]);
    await runCoreWebVitalsReport(deps, liveSignal());
    expect(deps.renderCards).toHaveBeenCalledWith(
      [{ card: card("기본"), input, triageOrder: 0 }],
      analysis,
    );
    expect(deps.sendCard).toHaveBeenCalledWith(card("AI 결합"));
  });

  it("AI 분석 실패 시 분석 없이 렌더하고 실행을 계속한다", async () => {
    const deps = dependencies();
    const input = triageInput("/ko");
    deps.judge.mockResolvedValue(
      decision({ cards: [card("기본")], triageInputs: [input], summary: "경고" }),
    );
    deps.analyzeTargets.mockRejectedValue(new Error("provider failed"));
    await expect(runCoreWebVitalsReport(deps, liveSignal())).resolves.toBeUndefined();
    expect(deps.renderCards).toHaveBeenCalledWith(
      [{ card: card("기본"), input, triageOrder: 0 }],
      null,
    );
    expect(deps.appendSummary).toHaveBeenCalledWith("AI 분석 생략: provider failed");
  });

  it("이미 abort 된 signal 로 실행하면 AI 만 생략하고 측정 카드는 보낸다", async () => {
    const deps = dependencies();
    deps.judge.mockResolvedValue(
      decision({ cards: [card("기본")], triageInputs: [triageInput("/ko")], summary: "경고" }),
    );
    // provider 계약: 호출 전 abort 된 signal 은 그 사유를 던진다.
    deps.analyzeTargets.mockImplementation(async (_inputs, signal) => {
      if (signal.aborted) throw signal.reason;
      return analysisOf([{}]);
    });
    const controller = new AbortController();
    controller.abort(new Error("cancelled"));

    await expect(runCoreWebVitalsReport(deps, controller.signal)).resolves.toBeUndefined();
    expect(deps.renderCards).toHaveBeenCalledWith(expect.anything(), null);
    expect(deps.sendCard).toHaveBeenCalledWith(card("기본"));
    expect(deps.appendSummary).toHaveBeenCalledWith("AI 분석 생략: cancelled");
  });

  it("분석 대상이 없으면 provider를 호출하지 않는다", async () => {
    const deps = dependencies();
    deps.judge.mockResolvedValue(
      decision({ cards: [card("데이터 부족")], triageInputs: [null], summary: "경고" }),
    );
    await runCoreWebVitalsReport(deps, liveSignal());
    expect(deps.analyzeTargets).not.toHaveBeenCalled();
    expect(deps.writeAiReport).toHaveBeenCalledWith([], null);
  });

  it("Discord 전송이 실패해도 AI 보고서는 이미 기록한다", async () => {
    const deps = dependencies();
    deps.judge.mockResolvedValue(
      decision({ cards: [card("기본")], triageInputs: [triageInput("/ko")], summary: "경고" }),
    );
    deps.sendCard.mockResolvedValue({ ok: false, error: "webhook down" });
    await expect(runCoreWebVitalsReport(deps, liveSignal())).rejects.toThrow(
      "Discord delivery failed",
    );
    expect(deps.writeAiReport).toHaveBeenCalledTimes(1);
  });
});
