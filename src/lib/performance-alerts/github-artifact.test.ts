import { describe, expect, it, vi } from "vitest";

import {
  downloadArtifactArchive,
  findPreviousSnapshotArtifact,
} from "@/lib/performance-alerts/github-artifact";

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

describe("findPreviousSnapshotArtifact", () => {
  it("현재 run을 제외하고 최신 성공 run의 만료되지 않은 artifact를 고른다", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          workflow_runs: [
            { id: 20, created_at: "2026-08-31T00:00:00Z" },
            { id: 19, created_at: "2026-08-30T00:00:00Z" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          artifacts: [
            { id: 1, name: "other", expired: false, created_at: "2026-08-30T00:00:00Z" },
            {
              id: 2,
              name: "core-web-vitals-snapshot",
              expired: false,
              created_at: "2026-08-30T00:01:00Z",
            },
          ],
        }),
      );

    const result = await findPreviousSnapshotArtifact(
      "owner/repo",
      "token",
      20,
      "core-web-vitals-report.yml",
      "core-web-vitals-snapshot",
      { request: request as typeof fetch },
    );

    expect(result).toEqual({
      status: "found",
      artifact: { id: 2, runId: 19, createdAt: "2026-08-30T00:01:00Z" },
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("최신 run에 artifact가 없으면 그 이전 성공 run을 확인한다", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          workflow_runs: [
            { id: 19, created_at: "2026-08-30T00:00:00Z" },
            { id: 18, created_at: "2026-08-29T00:00:00Z" },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ artifacts: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          artifacts: [
            {
              id: 3,
              name: "core-web-vitals-snapshot",
              expired: false,
              created_at: "2026-08-29T00:01:00Z",
            },
          ],
        }),
      );
    const result = await findPreviousSnapshotArtifact(
      "owner/repo",
      "token",
      20,
      "core-web-vitals-report.yml",
      "core-web-vitals-snapshot",
      { request: request as typeof fetch },
    );
    expect(result.status).toBe("found");
    if (result.status === "found") expect(result.artifact.runId).toBe(18);
  });

  it("artifact가 없으면 cold start로 구분한다", async () => {
    const request = vi.fn(async () => jsonResponse({ workflow_runs: [] }));
    await expect(
      findPreviousSnapshotArtifact(
        "owner/repo",
        "token",
        20,
        "core-web-vitals-report.yml",
        "core-web-vitals-snapshot",
        { request: request as typeof fetch },
      ),
    ).resolves.toEqual({ status: "cold_start" });
  });

  it("API 오류는 비교 생략 사유로 반환한다", async () => {
    const request = vi.fn(async () => jsonResponse({}, 500));
    const result = await findPreviousSnapshotArtifact(
      "owner/repo",
      "token",
      20,
      "core-web-vitals-report.yml",
      "core-web-vitals-snapshot",
      { request: request as typeof fetch },
    );
    expect(result).toEqual({
      status: "lookup_failed",
      reason: "GitHub workflow runs failed (500)",
    });
  });
});

describe("downloadArtifactArchive", () => {
  it("artifact ZIP을 byte 배열로 받는다", async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(new Uint8Array([80, 75, 3, 4]));
    });
    const result = await downloadArtifactArchive("owner/repo", "token", 2, {
      request: request as typeof fetch,
    });
    expect([...result]).toEqual([80, 75, 3, 4]);
    expect(request.mock.calls[0]?.[0]).toContain("/actions/artifacts/2/zip");
  });
});
