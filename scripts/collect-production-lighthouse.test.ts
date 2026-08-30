import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  collectProductionLighthouse,
  markRepresentativeRun,
  reportPaths,
  safeTargetName,
  type LighthouseManifestItem,
} from "./collect-production-lighthouse";

const reportDirectory = resolve("lighthouse-production-report");

const writeReport = async (outputPath: string, score = 0.9): Promise<void> => {
  const paths = reportPaths(outputPath);
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(paths.jsonPath, JSON.stringify({ categories: { performance: { score } } }));
  await writeFile(paths.htmlPath, "<html></html>");
};

afterEach(async () => {
  await rm(reportDirectory, { recursive: true, force: true });
});

describe("production Lighthouse collector", () => {
  it("URL path를 파일명에 안전한 이름으로 바꾼다", () => {
    expect(safeTargetName("https://sungjoon.works/ko/dev/projects")).toBe("ko-dev-projects");
  });

  it("performance score 중앙값을 대표 실행으로 고른다", async () => {
    const runs: LighthouseManifestItem[] = await Promise.all(
      [0.7, 0.9, 0.8].map(async (score, index) => {
        const paths = reportPaths(resolve(reportDirectory, `score-${index}`));
        await writeReport(resolve(reportDirectory, `score-${index}`), score);
        return {
          url: "https://sungjoon.works/ko",
          ...paths,
          isRepresentativeRun: false,
        };
      }),
    );
    const marked = await markRepresentativeRun(runs);
    expect(marked.map((run) => run.isRepresentativeRun)).toEqual([false, false, true]);
  });

  it("한 회차가 재시도 후에도 실패하면 두 성공 결과를 partial manifest로 남긴다", async () => {
    const runner = vi.fn(async (_url: string, outputPath: string) => {
      if (outputPath.includes("run-2")) throw new Error("HTTP 403");
      await writeReport(outputPath);
    });
    const result = await collectProductionLighthouse(
      ["https://sungjoon.works/ko"],
      runner,
      async () => undefined,
      () => undefined,
    );
    const manifest = JSON.parse(
      await readFile(resolve(reportDirectory, "manifest.json"), "utf8"),
    ) as LighthouseManifestItem[];

    expect(result.complete).toBe(true);
    expect(result.attempts).toHaveLength(4);
    expect(manifest).toHaveLength(2);
    expect(manifest.filter((run) => run.isRepresentativeRun)).toHaveLength(1);
  });

  it("성공이 두 회 미만이어도 다음 URL을 측정하고 마지막에 실패한다", async () => {
    const runner = vi.fn(async (url: string, outputPath: string) => {
      if (url.endsWith("/ko")) throw new Error("blocked");
      await writeReport(outputPath);
    });
    const result = await collectProductionLighthouse(
      ["https://sungjoon.works/ko", "https://sungjoon.works/ko/contact"],
      runner,
      async () => undefined,
      () => undefined,
    );

    expect(result.complete).toBe(false);
    expect(runner.mock.calls.some(([url]) => url.endsWith("/ko/contact"))).toBe(true);
    expect(result.attempts.filter(({ status }) => status === "failed")).toHaveLength(6);
  });
});
