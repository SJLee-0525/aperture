import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INSTRUCTIONS } from "@/lib/dependency-security/triage-prompt";
import {
  DEPENDENCY_TRIAGE_CONTRACT,
  getDependencyTriageProvider,
} from "@/lib/dependency-security/triage-provider";
import { parseTriageResults, schemaFor } from "@/lib/dependency-security/triage-schema";

import type { DependencySecurityFact } from "@/lib/dependency-security/types";

const fact = (alertNumber: number): DependencySecurityFact => ({
  alertNumber,
  packageName: "left-pad",
  installedVersions: ["1.0.0"],
  vulnerableInstalledVersions: ["1.0.0"],
  vulnerableVersionRange: "<2.0.0",
  firstPatchedVersion: "2.0.0",
  scope: "runtime",
  relationship: "direct",
  lockfileLocations: ["node_modules/left-pad"],
  severity: "high",
  cvssScore: 7.5,
  epssPercentage: 12,
  ghsaId: "GHSA-aaaa-bbbb-cccc",
  cveId: "CVE-2026-0001",
  summary: "취약점 요약",
  createdAt: "2026-08-01T00:00:00Z",
  alertUrl: "https://github.com/o/r/security/dependabot/7",
  priority: "immediate",
  isNew: true,
});

describe("DEPENDENCY_TRIAGE_CONTRACT", () => {
  it("기존 env 이름과 스키마 이름을 유지한다", () => {
    expect(DEPENDENCY_TRIAGE_CONTRACT.envPrefix).toBe("DEPENDENCY_TRIAGE");
    expect(DEPENDENCY_TRIAGE_CONTRACT.schemaName).toBe("dependency_triage");
    expect(DEPENDENCY_TRIAGE_CONTRACT.instructions).toBe(INSTRUCTIONS);
  });

  it("출력 예산과 구간 상한이 요청 크기와 무관하다", () => {
    expect(DEPENDENCY_TRIAGE_CONTRACT.outputTokens([fact(1)])).toBe(3_000);
    expect(DEPENDENCY_TRIAGE_CONTRACT.timeoutMs([fact(1)], 20_000)).toBe(20_000);
  });

  it("계약의 스키마와 파서가 이 계열 구현과 같다", () => {
    expect(DEPENDENCY_TRIAGE_CONTRACT.schema(true)).toEqual(schemaFor(true));
    expect(DEPENDENCY_TRIAGE_CONTRACT.schema(false)).toEqual(schemaFor(false));
    const raw = JSON.stringify({
      results: [
        {
          alertNumber: 7,
          impact: "영향",
          priorityReason: "근거",
          recommendedChecks: ["npm ls left-pad"],
          confidence: "low",
        },
      ],
    });
    expect(DEPENDENCY_TRIAGE_CONTRACT.parse(raw, [fact(7)])).toEqual(parseTriageResults(raw));
    expect(DEPENDENCY_TRIAGE_CONTRACT.parse("not json", [fact(7)])).toBeNull();
  });

  it("mock 판정은 요청의 alertNumber 마다 확신도 low 항목을 만든다", () => {
    const mock = DEPENDENCY_TRIAGE_CONTRACT.mockResult!([fact(3), fact(9)]);

    expect(mock.map((item) => item.alertNumber)).toEqual([3, 9]);
    expect(mock.every((item) => item.confidence === "low")).toBe(true);
    expect(mock[0]!.priorityReason).toContain("DEPENDENCY_TRIAGE_PROVIDER");
  });
});

describe("getDependencyTriageProvider", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("DEPENDENCY_TRIAGE_PROVIDER=mock 이면 외부 호출 없이 판정을 낸다", async () => {
    vi.stubEnv("DEPENDENCY_TRIAGE_PROVIDER", "mock");

    const response = await getDependencyTriageProvider()([fact(7)], new AbortController().signal);

    expect(response.provider).toBe("mock");
    expect(response.result).toHaveLength(1);
    expect(response.result[0]!.alertNumber).toBe(7);
  });

  it("아무것도 설정되지 않으면 호출 시 예외를 던진다", async () => {
    const run = getDependencyTriageProvider()([fact(7)], new AbortController().signal);

    await expect(run).rejects.toThrow("Triage provider is not configured");
  });
});
