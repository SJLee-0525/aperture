import { describe, expect, it, vi } from "vitest";

import {
  buildDependencySecurityReport,
  embedLength,
} from "@/lib/dependency-security/discord-report";
import { fetchDependabotAlerts, nextLink } from "@/lib/dependency-security/github-alerts";
import { addLockfileContext, packageNameAt } from "@/lib/dependency-security/lockfile-context";
import { normalizeDependabotAlert } from "@/lib/dependency-security/normalize-alert";
import { isNewAlert, priorityFor } from "@/lib/dependency-security/priority";

import type { DependencySecurityFact } from "@/lib/dependency-security/types";

const rawAlert = (overrides: Record<string, unknown> = {}) => ({
  number: 12,
  html_url: "https://github.com/o/r/security/dependabot/12",
  created_at: "2026-08-29T00:00:00Z",
  dependency: {
    package: { ecosystem: "npm", name: "next" },
    scope: "runtime",
    relationship: "direct",
  },
  security_advisory: {
    ghsa_id: "GHSA-test-1234-5678",
    cve_id: "CVE-2026-1234",
    summary: "test advisory",
    severity: "high",
    cvss_severities: { cvss_v3: { score: 8.1 } },
    epss: { percentage: 0.12 },
  },
  security_vulnerability: {
    vulnerable_version_range: ">= 16.0.0 < 16.3.1",
    first_patched_version: { identifier: "16.3.1" },
  },
  ...overrides,
});

const fact = (): DependencySecurityFact =>
  normalizeDependabotAlert(rawAlert(), new Date("2026-08-30T00:00:00Z"))!;

describe("normalizeDependabotAlert", () => {
  it("허용한 advisory와 dependency 필드만 정규화한다", () => {
    expect(fact()).toMatchObject({
      packageName: "next",
      severity: "high",
      scope: "runtime",
      relationship: "direct",
      cvssScore: 8.1,
      epssPercentage: 0.12,
      priority: "immediate",
      isNew: true,
    });
  });

  it("패치 버전과 선택 신호가 없어도 alert를 유지한다", () => {
    const raw = rawAlert();
    (raw.security_advisory as Record<string, unknown>).cve_id = null;
    (raw.security_advisory as Record<string, unknown>).epss = null;
    (raw.security_vulnerability as Record<string, unknown>).first_patched_version = null;
    expect(normalizeDependabotAlert(raw)).toMatchObject({
      cveId: null,
      epssPercentage: null,
      firstPatchedVersion: null,
    });
  });

  it("필수 식별자가 없으면 제외한다", () => {
    expect(normalizeDependabotAlert(rawAlert({ number: undefined }))).toBeNull();
  });
});

describe("fetchDependabotAlerts", () => {
  it("Link next를 따라 모든 페이지를 합친다", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([rawAlert()]), {
          headers: { link: '<https://api.github.com/page/2>; rel="next"' },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([rawAlert({ number: 13 })])));
    const result = await fetchDependabotAlerts("o/r", "token", { fetcher, now: new Date() });
    expect(result.map((item) => item.alertNumber)).toEqual([12, 13]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("중간 페이지가 실패하면 일부 결과를 반환하지 않는다", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([rawAlert()]), {
          headers: { link: '<https://api.github.com/page/2>; rel="next"' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(fetchDependabotAlerts("o/r", "token", { fetcher })).rejects.toThrow("(403)");
  });

  it("next 링크만 고른다", () => {
    expect(nextLink('<a>; rel="prev", <b>; rel="next"')).toBe("b");
  });
});

describe("lockfile context", () => {
  it("최상위, nested, scoped package 이름을 읽는다", () => {
    expect(packageNameAt("node_modules/foo")).toBe("foo");
    expect(packageNameAt("node_modules/a/node_modules/foo")).toBe("foo");
    expect(packageNameAt("node_modules/a/node_modules/@scope/foo")).toBe("@scope/foo");
  });

  it("중복 버전 중 취약 범위에 들어가는 설치본만 표시한다", () => {
    const enriched = addLockfileContext(fact(), {
      lockfileVersion: 3,
      packages: {
        "node_modules/next": { version: "16.3.0" },
        "node_modules/a/node_modules/next": { version: "16.3.1" },
        "packages/next": { link: true },
      },
    });
    expect(enriched.installedVersions).toEqual(["16.3.0", "16.3.1"]);
    expect(enriched.vulnerableInstalledVersions).toEqual(["16.3.0"]);
  });
});

describe("priority", () => {
  it("severity와 scope 조합을 구간으로 바꾼다", () => {
    expect(priorityFor("critical", "development")).toBe("immediate");
    expect(priorityFor("high", "runtime")).toBe("immediate");
    expect(priorityFor("medium", "runtime")).toBe("this-week");
    expect(priorityFor("low", "development")).toBe("watch");
  });

  it("미래 시각을 신규로 세지 않는다", () => {
    expect(isNewAlert("2026-09-01T00:00:00Z", new Date("2026-08-30T00:00:00Z"))).toBe(false);
  });
});

describe("buildDependencySecurityReport", () => {
  it("0건도 정상 상태 카드로 만든다", () => {
    expect(buildDependencySecurityReport([]).description).toContain("없습니다");
  });

  it("합계와 alert 링크를 보존한다", () => {
    const report = buildDependencySecurityReport([fact()], new Date("2026-08-30T00:00:00Z"));
    expect(report.description).toContain("Open 1");
    expect(report.fields?.[0]?.value).toContain("Alert #12");
    expect(embedLength(report)).toBeLessThanOrEqual(6000);
  });

  it("25개를 넘는 alert는 상세 필드에서 자른다", () => {
    const report = buildDependencySecurityReport(
      Array.from({ length: 30 }, (_, index) => ({ ...fact(), alertNumber: index + 1 })),
    );
    expect(report.fields).toHaveLength(25);
    expect(report.description).toContain("Open 30");
  });
});
