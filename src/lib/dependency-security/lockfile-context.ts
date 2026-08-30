import semver from "semver";

import type { DependencySecurityFact } from "@/lib/dependency-security/types";

type LockEntry = { version?: unknown; link?: unknown };
type PackageLock = { lockfileVersion?: unknown; packages?: unknown };

/** 마지막 node_modules 구간을 사용해 hoist된 패키지와 nested 패키지를 같은 이름으로 찾는다. */
const packageNameAt = (location: string): string | null => {
  const marker = "node_modules/";
  const index = location.lastIndexOf(marker);
  if (index < 0) return null;
  const tail = location.slice(index + marker.length);
  const parts = tail.split("/");
  return parts[0]?.startsWith("@") ? parts.slice(0, 2).join("/") || null : parts[0] || null;
};

/** workspace link에는 설치 버전이 없으므로 취약 범위 계산에서 제외한다. */
const addLockfileContext = (
  fact: DependencySecurityFact,
  value: unknown,
): DependencySecurityFact => {
  const lockfile: PackageLock =
    typeof value === "object" && value !== null ? (value as PackageLock) : {};
  const packages =
    typeof lockfile.packages === "object" && lockfile.packages !== null
      ? (lockfile.packages as Record<string, LockEntry>)
      : {};
  const matches = Object.entries(packages).filter(
    ([location, entry]) => packageNameAt(location) === fact.packageName && entry.link !== true,
  );
  const locations = matches.map(([location]) => location);
  const versions = [
    ...new Set(
      matches.map(([, entry]) => entry.version).filter((v): v is string => typeof v === "string"),
    ),
  ];
  const vulnerable = versions.filter((version) =>
    semver.satisfies(version, fact.vulnerableVersionRange, { includePrerelease: true }),
  );
  return {
    ...fact,
    installedVersions: versions.sort(semver.compare),
    vulnerableInstalledVersions: vulnerable.sort(semver.compare),
    lockfileLocations: locations.sort(),
  };
};

export { addLockfileContext, packageNameAt };
