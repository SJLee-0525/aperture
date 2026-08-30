import { describe, expect, it, vi } from "vitest";

import {
  archiveEntry,
  readSnapshotArchive,
  SNAPSHOT_FILENAME,
} from "@/lib/performance-alerts/snapshot-archive";

describe("archiveEntry", () => {
  it("예상 JSON 한 개만 허용한다", () => {
    expect(archiveEntry(`${SNAPSHOT_FILENAME}\n`)).toBe(SNAPSHOT_FILENAME);
  });

  it.each([
    "../performance-snapshot.json\n",
    "performance-snapshot.json\nextra.json\n",
    "folder/performance-snapshot.json\n",
    "",
  ])("안전하지 않거나 예상 밖인 목록을 거부한다", (listing) => {
    expect(() => archiveEntry(listing)).toThrow("Invalid snapshot archive entries");
  });
});

describe("readSnapshotArchive", () => {
  it("목록을 먼저 확인하고 예상 파일만 stdout으로 읽는다", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ stdout: `${SNAPSHOT_FILENAME}\n` })
      .mockResolvedValueOnce({ stdout: '{"schemaVersion":1}' });
    await expect(readSnapshotArchive("/tmp/snapshot.zip", run)).resolves.toEqual({
      schemaVersion: 1,
    });
    expect(run.mock.calls).toEqual([
      [["-Z1", "/tmp/snapshot.zip"]],
      [["-p", "/tmp/snapshot.zip", SNAPSHOT_FILENAME]],
    ]);
  });
});
