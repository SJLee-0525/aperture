const SNAPSHOT_FILENAME = "performance-snapshot.json";

type ZipRunner = (args: readonly string[]) => Promise<{ stdout: string }>;

const archiveEntry = (listing: string): string => {
  const entries = listing.split(/\r?\n/).filter(Boolean);
  if (entries.length !== 1 || entries[0] !== SNAPSHOT_FILENAME) {
    throw new Error(`Invalid snapshot archive entries: ${entries.join(", ") || "empty"}`);
  }
  return entries[0];
};

/**
 * ZIP을 디렉터리에 풀지 않고 검증한 파일 한 개만 stdout으로 읽는다.
 * 예상 밖 entry와 상위 경로 entry는 파일 시스템에 쓰기 전에 거부한다.
 */
const readSnapshotArchive = async (archivePath: string, run: ZipRunner): Promise<unknown> => {
  const listing = await run(["-Z1", archivePath]);
  const entry = archiveEntry(listing.stdout);
  const extracted = await run(["-p", archivePath, entry]);
  try {
    return JSON.parse(extracted.stdout) as unknown;
  } catch {
    throw new Error("Snapshot artifact contains invalid JSON");
  }
};

export { archiveEntry, readSnapshotArchive, SNAPSHOT_FILENAME };
