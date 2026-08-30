const GITHUB_API = "https://api.github.com";

type WorkflowRun = { id: number; createdAt: string };
type SnapshotArtifact = {
  id: number;
  runId: number;
  createdAt: string;
};
type ArtifactLookup =
  | { status: "found"; artifact: SnapshotArtifact }
  | { status: "cold_start" }
  | { status: "lookup_failed"; reason: string };

type GitHubDependencies = { request?: typeof fetch };

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid GitHub ${label}`);
  }
  return value as Record<string, unknown>;
};

const integer = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid GitHub ${label}`);
  }
  return value;
};

const headers = (token: string): HeadersInit => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
});

const json = async (response: Response, label: string): Promise<unknown> => {
  if (!response.ok) throw new Error(`GitHub ${label} failed (${response.status})`);
  return response.json();
};

const workflowRuns = (value: unknown, currentRunId: number): WorkflowRun[] => {
  const runs = object(value, "workflow runs").workflow_runs;
  if (!Array.isArray(runs)) throw new Error("Invalid GitHub workflow_runs");
  return runs
    .map((value, index) => {
      const run = object(value, `workflow_runs[${index}]`);
      return {
        id: integer(run.id, `workflow_runs[${index}].id`),
        createdAt:
          typeof run.created_at === "string"
            ? run.created_at
            : (() => {
                throw new Error(`Invalid GitHub workflow_runs[${index}].created_at`);
              })(),
      };
    })
    .filter((run) => run.id !== currentRunId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const artifactFrom = (
  value: unknown,
  run: WorkflowRun,
  artifactName: string,
): SnapshotArtifact | null => {
  const artifacts = object(value, "artifacts").artifacts;
  if (!Array.isArray(artifacts)) throw new Error("Invalid GitHub artifacts");
  const matches = artifacts
    .map((value, index) => object(value, `artifacts[${index}]`))
    .filter((artifact) => artifact.name === artifactName && artifact.expired === false)
    .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
  const artifact = matches[0];
  if (!artifact) return null;
  if (typeof artifact.created_at !== "string")
    throw new Error("Invalid GitHub artifact.created_at");
  return {
    id: integer(artifact.id, "artifact.id"),
    runId: run.id,
    createdAt: artifact.created_at,
  };
};

/**
 * 같은 workflow의 성공 실행만 역순으로 확인하고 현재 run은 제외한다.
 * 조회 실패는 측정 실패가 아니므로 예외 대신 비교 생략 사유를 반환한다.
 */
const findPreviousSnapshotArtifact = async (
  repository: string,
  token: string,
  currentRunId: number,
  workflowFile: string,
  artifactName: string,
  dependencies: GitHubDependencies = {},
): Promise<ArtifactLookup> => {
  if (!/^[^/]+\/[^/]+$/.test(repository)) {
    return { status: "lookup_failed", reason: "GITHUB_REPOSITORY is invalid" };
  }
  if (!token.trim()) return { status: "lookup_failed", reason: "GITHUB_TOKEN is not configured" };
  const request = dependencies.request ?? fetch;
  const workflow = encodeURIComponent(workflowFile);

  try {
    const runResponse = await request(
      `${GITHUB_API}/repos/${repository}/actions/workflows/${workflow}/runs?status=success&per_page=20`,
      { headers: headers(token) },
    );
    const runs = workflowRuns(await json(runResponse, "workflow runs"), currentRunId);
    for (const run of runs) {
      const response = await request(
        `${GITHUB_API}/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`,
        { headers: headers(token) },
      );
      const artifact = artifactFrom(await json(response, "artifacts"), run, artifactName);
      if (artifact) return { status: "found", artifact };
    }
    return { status: "cold_start" };
  } catch (error) {
    return {
      status: "lookup_failed",
      reason: error instanceof Error ? error.message : "GitHub artifact lookup failed",
    };
  }
};

/** artifact 다운로드 URL은 redirect될 수 있으며 인증값은 Authorization header로만 전달한다. */
const downloadArtifactArchive = async (
  repository: string,
  token: string,
  artifactId: number,
  dependencies: GitHubDependencies = {},
): Promise<Uint8Array> => {
  const request = dependencies.request ?? fetch;
  const response = await request(
    `${GITHUB_API}/repos/${repository}/actions/artifacts/${artifactId}/zip`,
    { headers: headers(token), redirect: "follow" },
  );
  if (!response.ok) throw new Error(`GitHub artifact download failed (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
};

export { downloadArtifactArchive, findPreviousSnapshotArtifact };
