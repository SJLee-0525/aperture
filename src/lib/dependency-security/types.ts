type Severity = "low" | "medium" | "high" | "critical";
type DependencyScope = "runtime" | "development" | "unknown";
type DependencyRelationship = "direct" | "transitive" | "unknown";
type PriorityBand = "immediate" | "this-week" | "planned" | "watch";

type DependencySecurityFact = {
  alertNumber: number;
  packageName: string;
  installedVersions: string[];
  vulnerableInstalledVersions: string[];
  vulnerableVersionRange: string;
  firstPatchedVersion: string | null;
  scope: DependencyScope;
  relationship: DependencyRelationship;
  lockfileLocations: string[];
  severity: Severity;
  cvssScore: number | null;
  epssPercentage: number | null;
  ghsaId: string;
  cveId: string | null;
  summary: string;
  createdAt: string;
  alertUrl: string;
  priority: PriorityBand;
  isNew: boolean;
};

export type {
  DependencyRelationship,
  DependencyScope,
  DependencySecurityFact,
  PriorityBand,
  Severity,
};
