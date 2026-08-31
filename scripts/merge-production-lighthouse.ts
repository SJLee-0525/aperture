import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const mergeProductionLighthouse = async (
  reportRoot: string = resolve("lighthouse-production-report"),
  expectedShardCount: number = 3,
): Promise<{ complete: boolean; shardCount: number; runCount: number }> => {
  const absoluteRoot = resolve(reportRoot);
  const entries = await readdir(absoluteRoot, { withFileTypes: true });
  const shardDirectories = entries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("core-web-vitals-lighthouse-shard-"),
    )
    .map((entry) => resolve(absoluteRoot, entry.name))
    .sort();
  if (shardDirectories.length !== expectedShardCount) {
    throw new Error(
      `Expected ${expectedShardCount} Lighthouse shards, found ${shardDirectories.length}`,
    );
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

export { mergeProductionLighthouse };
