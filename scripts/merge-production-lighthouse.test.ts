import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { mergeProductionLighthouse } from "./merge-production-lighthouse";

const root = resolve("lighthouse-production-report");

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("production Lighthouse shard merger", () => {
  it("shard manifest 경로를 aggregation 작업공간으로 재작성한다", async () => {
    for (const shard of [0, 1, 2]) {
      const directory = resolve(root, `core-web-vitals-lighthouse-shard-${shard}`);
      const filename = `${shard + 1}.report.json`;
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, filename), JSON.stringify({ shard }));
      await writeFile(
        resolve(directory, "manifest.json"),
        JSON.stringify([
          {
            url: `https://example.com/${shard}`,
            jsonPath: `/home/runner/old/shard-${shard}/${filename}`,
            htmlPath: `/home/runner/old/shard-${shard}/${shard + 1}.report.html`,
            isRepresentativeRun: true,
          },
        ]),
      );
      await writeFile(
        resolve(directory, "collection-summary.json"),
        JSON.stringify({ complete: true, attempts: [{ shard }] }),
      );
    }

    const result = await mergeProductionLighthouse(root, 3);
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));

    expect(result).toEqual({ complete: true, shardCount: 3, runCount: 3 });
    expect(manifest[0].jsonPath).toBe(
      resolve(root, "core-web-vitals-lighthouse-shard-0", "1.report.json"),
    );
  });
});
