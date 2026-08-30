import { describe, expect, it, vi } from "vitest";

import { redactPerformanceError, runCoreWebVitalsReport } from "./core-web-vitals-report";

type Dependencies = Parameters<typeof runCoreWebVitalsReport>[0];

const dependencies = () => ({
  preflight: vi.fn<Dependencies["preflight"]>(async () => undefined),
  loadPreviousSnapshot: vi.fn<Dependencies["loadPreviousSnapshot"]>(async () => ({
    status: "cold_start",
  })),
  collectCrux: vi.fn<Dependencies["collectCrux"]>(async () => ({
    complete: true,
    value: "crux",
  })),
  collectLighthouse: vi.fn<Dependencies["collectLighthouse"]>(async () => ({
    complete: true,
    value: "lighthouse",
  })),
  judge: vi.fn<Dependencies["judge"]>(async () => ({
    cards: [],
    snapshot: { schemaVersion: 1 },
    summary: "정상",
  })),
  sendCard: vi.fn<Dependencies["sendCard"]>(async () => ({ ok: true })),
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
      return { complete: true, value: "collectCrux" };
    });
    deps.collectLighthouse.mockImplementation(async () => {
      calls.push("collectLighthouse");
      return { complete: true, value: "collectLighthouse" };
    });
    deps.judge.mockImplementation(async () => {
      calls.push("judge");
      return { cards: [], snapshot: {}, summary: "정상" };
    });
    deps.writeSnapshot.mockImplementation(async () => void calls.push("writeSnapshot"));
    await runCoreWebVitalsReport(deps);
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
    await expect(runCoreWebVitalsReport(deps)).resolves.toBeUndefined();
    expect(deps.appendSummary).toHaveBeenCalledWith("비교 생략: GitHub 503");
    expect(deps.collectCrux).toHaveBeenCalled();
  });

  it("CrUX 전체 실패는 summary를 남기고 실패한다", async () => {
    const deps = dependencies();
    deps.collectCrux.mockRejectedValue(new Error("request failed"));
    await expect(runCoreWebVitalsReport(deps)).rejects.toThrow("CrUX collection failed");
    expect(deps.collectLighthouse).not.toHaveBeenCalled();
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
  });

  it("Lighthouse가 불완전하면 snapshot을 쓰지 않고 실패한다", async () => {
    const deps = dependencies();
    deps.collectLighthouse.mockResolvedValue({ complete: false, value: null });
    await expect(runCoreWebVitalsReport(deps)).rejects.toThrow("Lighthouse collection failed");
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
  });

  it("CrUX 일부 결과가 불완전하면 판정하되 snapshot을 대체하지 않는다", async () => {
    const deps = dependencies();
    deps.collectCrux.mockResolvedValue({ complete: false, value: "partial" });
    await expect(runCoreWebVitalsReport(deps)).resolves.toBeUndefined();
    expect(deps.judge).toHaveBeenCalled();
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
    expect(deps.appendSummary).toHaveBeenCalledWith(
      "현재 측정이 불완전해 이전 정상 snapshot을 대체하지 않습니다.",
    );
  });

  it("Discord 실패 시 snapshot을 쓰지 않고 실패한다", async () => {
    const deps = dependencies();
    deps.judge.mockResolvedValue({ cards: [{}], snapshot: {}, summary: "경고" });
    deps.sendCard.mockResolvedValue({
      ok: false,
      error: "webhook=https://secret.example/?token=abc",
    });
    await expect(runCoreWebVitalsReport(deps)).rejects.toThrow("Discord delivery failed");
    expect(deps.writeSnapshot).not.toHaveBeenCalled();
    expect(deps.appendSummary).toHaveBeenCalledWith("Discord 전송 실패: webhook=[redacted-secret]");
  });
});

describe("redactPerformanceError", () => {
  it("URL query와 secret 형태를 제거한다", () => {
    expect(
      redactPerformanceError(
        "failed https://example.com/path?api_key=secret token=ghp_abcdefghijklmnopqrstuvwxyz",
      ),
    ).toBe("failed https://example.com/path token=[redacted-secret]");
  });
});
