import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { mergeProductionLighthouse } from "./merge-production-lighthouse";

const root = resolve("lighthouse-production-report");

type Run = { url: string; run: number; isRepresentativeRun: boolean };

const shardUrl = (shard: number) => `https://example.com/${shard}`;

/** shard 하나를 실제 수집 결과와 같은 모양으로 만든다. 기본은 대상 하나에 성공 실행 두 번이다. */
const writeShard = async (shard: number, runs?: Run[]): Promise<void> => {
  const directory = resolve(root, `core-web-vitals-lighthouse-shard-${shard}`);
  const items =
    runs ?? [1, 2].map((run) => ({ url: shardUrl(shard), run, isRepresentativeRun: run === 1 }));
  await mkdir(directory, { recursive: true });
  await Promise.all(
    items.map((item) =>
      writeFile(resolve(directory, `${item.run}.report.json`), JSON.stringify({ shard })),
    ),
  );
  await writeFile(
    resolve(directory, "manifest.json"),
    JSON.stringify(
      items.map((item) => ({
        url: item.url,
        jsonPath: `/home/runner/old/shard-${shard}/${item.run}.report.json`,
        htmlPath: `/home/runner/old/shard-${shard}/${item.run}.report.html`,
        isRepresentativeRun: item.isRepresentativeRun,
      })),
    ),
  );
  await writeFile(
    resolve(directory, "collection-summary.json"),
    JSON.stringify({ complete: true, attempts: [{ shard }] }),
  );
};

const expectedUrls = [0, 1, 2].map(shardUrl);

const exists = async (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("production Lighthouse shard merger", () => {
  it("shard manifest 경로를 aggregation 작업공간으로 재작성한다", async () => {
    await Promise.all([0, 1, 2].map((shard) => writeShard(shard)));

    const result = await mergeProductionLighthouse(root, expectedUrls);
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));

    expect(result).toEqual({ complete: true, shardCount: 3, runCount: 6 });
    expect(manifest[0].jsonPath).toBe(
      resolve(root, "core-web-vitals-lighthouse-shard-0", "1.report.json"),
    );
  });

  it("shard 개수가 달라도 대상 계약이 맞으면 통과한다", async () => {
    await Promise.all([0, 1, 2, 3].map((shard) => writeShard(shard)));

    const result = await mergeProductionLighthouse(root, [...expectedUrls, shardUrl(3)]);

    expect(result.shardCount).toBe(4);
  });

  it("shard 디렉터리가 없으면 전용 문구로 실패한다", async () => {
    await mkdir(root, { recursive: true });

    await expect(mergeProductionLighthouse(root, expectedUrls)).rejects.toThrow(
      "No Lighthouse shard directories found",
    );
  });

  it("빠진 대상을 경로와 함께 알린다", async () => {
    await Promise.all([0, 1].map((shard) => writeShard(shard)));

    await expect(mergeProductionLighthouse(root, expectedUrls)).rejects.toThrow(
      `Lighthouse manifest is missing targets: ${shardUrl(2)}`,
    );
  });

  it("알 수 없는 대상을 거부한다", async () => {
    await Promise.all([0, 1, 2].map((shard) => writeShard(shard)));

    await expect(mergeProductionLighthouse(root, [shardUrl(0), shardUrl(1)])).rejects.toThrow(
      `Lighthouse manifest has unknown targets: ${shardUrl(2)}`,
    );
  });

  it("실행이 하나뿐인 대상을 거부한다", async () => {
    await Promise.all([
      writeShard(0, [{ url: shardUrl(0), run: 1, isRepresentativeRun: true }]),
      writeShard(1),
      writeShard(2),
    ]);

    await expect(mergeProductionLighthouse(root, expectedUrls)).rejects.toThrow(
      `Lighthouse ${shardUrl(0)} has 1 runs, expected 2 or 3`,
    );
  });

  it("대표 실행이 둘인 대상을 거부한다", async () => {
    await Promise.all([
      writeShard(0, [
        { url: shardUrl(0), run: 1, isRepresentativeRun: true },
        { url: shardUrl(0), run: 2, isRepresentativeRun: true },
      ]),
      writeShard(1),
      writeShard(2),
    ]);

    await expect(mergeProductionLighthouse(root, expectedUrls)).rejects.toThrow(
      `Lighthouse ${shardUrl(0)} has 2 representative runs, expected 1`,
    );
  });

  it("계약을 어긴 실행은 병합 manifest를 남기지 않는다", async () => {
    await Promise.all([0, 1].map((shard) => writeShard(shard)));

    await expect(mergeProductionLighthouse(root, expectedUrls)).rejects.toThrow();
    expect(await exists(resolve(root, "manifest.json"))).toBe(false);
    expect(await exists(resolve(root, "collection-summary.json"))).toBe(false);
  });
});
