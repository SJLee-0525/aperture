import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PERFORMANCE_TARGETS } from "./performance-targets";

type ShardSummary = { complete: boolean; attempts: unknown[] };
type ManifestItem = {
  url: string;
  jsonPath: string;
  htmlPath: string;
  isRepresentativeRun: boolean;
};

const parseManifestItem = (value: unknown): ManifestItem => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid shard manifest item");
  }
  const item = value as Record<string, unknown>;
  if (
    typeof item.url !== "string" ||
    typeof item.jsonPath !== "string" ||
    typeof item.htmlPath !== "string" ||
    typeof item.isRepresentativeRun !== "boolean"
  ) {
    throw new Error("Invalid shard manifest item");
  }
  return item as ManifestItem;
};

/**
 * SITE_URL과 설정된 대상으로 병합 결과가 담아야 할 절대 URL을 만든다.
 * 조립 방식은 collect-production-lighthouse가 실제로 측정하는 URL과 같아야 한다.
 */
const productionTargetUrls = (): readonly string[] => {
  const configuredSiteUrl = process.env.SITE_URL;
  if (!configuredSiteUrl) throw new Error("SITE_URL is required to merge Lighthouse shards");
  const { origin } = new URL(configuredSiteUrl);
  return PERFORMANCE_TARGETS.map(({ path }) => `${origin}${path}`);
};

/**
 * 병합 결과가 다음 단계의 계약을 지키는지 확인한다.
 * shard 개수는 워크플로 설정이라 이 스크립트가 알 수 없고, 개수가 맞아도 한 shard가
 * 통째로 비면 통과한다. 실제로 지켜야 하는 것은 대상 집합과 대상별 실행 구성이다.
 */
const assertManifestContract = (
  manifest: readonly ManifestItem[],
  expectedUrls: readonly string[],
): void => {
  const measured = new Set(manifest.map((item) => item.url));
  const expected = new Set(expectedUrls);
  const missing = [...expected].filter((url) => !measured.has(url));
  if (missing.length) {
    throw new Error(`Lighthouse manifest is missing targets: ${missing.join(", ")}`);
  }
  const unknown = [...measured].filter((url) => !expected.has(url));
  if (unknown.length) {
    throw new Error(`Lighthouse manifest has unknown targets: ${unknown.join(", ")}`);
  }
  for (const url of expected) {
    const runs = manifest.filter((item) => item.url === url);
    if (runs.length < 2 || runs.length > 3) {
      throw new Error(`Lighthouse ${url} has ${runs.length} runs, expected 2 or 3`);
    }
    const representative = runs.filter((item) => item.isRepresentativeRun).length;
    if (representative !== 1) {
      throw new Error(`Lighthouse ${url} has ${representative} representative runs, expected 1`);
    }
  }
};

const mergeProductionLighthouse = async (
  reportRoot: string = resolve("lighthouse-production-report"),
  expectedUrls: readonly string[] = productionTargetUrls(),
): Promise<{ complete: boolean; shardCount: number; runCount: number }> => {
  const absoluteRoot = resolve(reportRoot);
  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  const shardDirectories = entries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("core-web-vitals-lighthouse-shard-"),
    )
    .map((entry) => resolve(absoluteRoot, entry.name))
    .sort();
  if (!shardDirectories.length) {
    throw new Error(`No Lighthouse shard directories found under ${absoluteRoot}`);
  }

  const manifest: ManifestItem[] = [];
  const attempts: unknown[] = [];
  let complete = true;
  for (const directory of shardDirectories) {
    const rawManifest = JSON.parse(
      await readFile(resolve(directory, "manifest.json"), "utf8"),
    ) as unknown;
    const summary = JSON.parse(
      await readFile(resolve(directory, "collection-summary.json"), "utf8"),
    ) as ShardSummary;
    if (
      !Array.isArray(rawManifest) ||
      typeof summary.complete !== "boolean" ||
      !Array.isArray(summary.attempts)
    ) {
      throw new Error("Invalid Lighthouse shard output");
    }
    complete &&= summary.complete;
    attempts.push(...summary.attempts);
    manifest.push(
      ...rawManifest.map((value) => {
        const item = parseManifestItem(value);
        return {
          ...item,
          jsonPath: resolve(directory, basename(item.jsonPath)),
          htmlPath: resolve(directory, basename(item.htmlPath)),
        };
      }),
    );
  }

  // 계약이 깨진 manifest를 파일로 남기면 다음 단계가 그것을 정상 입력으로 읽는다.
  assertManifestContract(manifest, expectedUrls);

  await writeFile(resolve(absoluteRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(
    resolve(absoluteRoot, "collection-summary.json"),
    JSON.stringify({ complete, attempts }, null, 2),
  );
  return { complete, shardCount: shardDirectories.length, runCount: manifest.length };
};

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  mergeProductionLighthouse()
    .then((result) => {
      process.stdout.write(`Merged ${result.shardCount} shards and ${result.runCount} runs\n`);
      if (!result.complete) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : "Lighthouse merge failed"}\n`,
      );
      process.exitCode = 1;
    });
}

export { mergeProductionLighthouse, productionTargetUrls };
