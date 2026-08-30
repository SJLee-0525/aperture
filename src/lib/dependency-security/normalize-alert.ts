import { isNewAlert, priorityFor } from "@/lib/dependency-security/priority";

import type {
  DependencyRelationship,
  DependencyScope,
  DependencySecurityFact,
  Severity,
} from "@/lib/dependency-security/types";

type Json = Record<string, unknown>;
const object = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
const string = (value: unknown): string | null => (typeof value === "string" ? value : null);
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const severityOf = (value: unknown): Severity | null =>
  value === "low" || value === "medium" || value === "high" || value === "critical" ? value : null;
const scopeOf = (value: unknown): DependencyScope =>
  value === "runtime" || value === "development" ? value : "unknown";
const relationshipOf = (value: unknown): DependencyRelationship =>
  value === "direct" || value === "transitive" ? value : "unknown";

const cvssScore = (advisory: Json): number | null => {
  const severities = object(advisory.cvss_severities);
  return (
    number(object(severities?.cvss_v4)?.score) ??
    number(object(severities?.cvss_v3)?.score) ??
    number(object(advisory.cvss)?.score)
  );
};

/**
 * GitHub 응답에서 리포트와 LLM에 허용한 필드만 남긴다.
 * 필수 식별자가 빠진 항목은 불완전한 사실을 알리지 않도록 제외한다.
 */
const normalizeDependabotAlert = (
  value: unknown,
  now = new Date(),
): DependencySecurityFact | null => {
  const alert = object(value);
  const dependency = object(alert?.dependency);
  const pkg = object(dependency?.package);
  const advisory = object(alert?.security_advisory);
  const vulnerability = object(alert?.security_vulnerability);
  const patched = object(vulnerability?.first_patched_version);
  const epss = object(advisory?.epss);
  const alertNumber = number(alert?.number);
  const packageName = string(pkg?.name);
  const severity = severityOf(advisory?.severity);
  const ghsaId = string(advisory?.ghsa_id);
  const createdAt = string(alert?.created_at);
  const alertUrl = string(alert?.html_url);
  const vulnerableVersionRange = string(vulnerability?.vulnerable_version_range);

  if (
    alertNumber === null ||
    !packageName ||
    !severity ||
    !ghsaId ||
    !createdAt ||
    !alertUrl ||
    !vulnerableVersionRange
  ) {
    return null;
  }

  const scope = scopeOf(dependency?.scope);
  return {
    alertNumber,
    packageName,
    installedVersions: [],
    vulnerableInstalledVersions: [],
    vulnerableVersionRange,
    firstPatchedVersion: string(patched?.identifier),
    scope,
    relationship: relationshipOf(dependency?.relationship),
    lockfileLocations: [],
    severity,
    cvssScore: cvssScore(advisory ?? {}),
    epssPercentage: number(epss?.percentage),
    ghsaId,
    cveId: string(advisory?.cve_id),
    summary: (string(advisory?.summary) ?? "설명 없음").slice(0, 512),
    createdAt,
    alertUrl,
    priority: priorityFor(severity, scope),
    isNew: isNewAlert(createdAt, now),
  };
};

export { normalizeDependabotAlert };
