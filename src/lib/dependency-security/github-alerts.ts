import { normalizeDependabotAlert } from "@/lib/dependency-security/normalize-alert";

import type { DependencySecurityFact } from "@/lib/dependency-security/types";

type FetchAlertsOptions = { fetcher?: typeof fetch; now?: Date };

const nextLink = (header: string | null): string | null => {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match?.[1]) return match[1];
  }
  return null;
};

/**
 * 모든 open alert 페이지를 받은 뒤에만 결과를 반환한다.
 * 중간 페이지 실패는 일부 목록을 정상 리포트로 보내지 않도록 예외로 끝낸다.
 */
const fetchDependabotAlerts = async (
  repository: string,
  token: string,
  options: FetchAlertsOptions = {},
): Promise<DependencySecurityFact[]> => {
  if (!repository.trim()) throw new Error("GITHUB_REPOSITORY is not configured");
  if (!token.trim()) throw new Error("GITHUB_TOKEN is not configured");
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  let url: string | null =
    `https://api.github.com/repos/${repository}/dependabot/alerts?state=open&per_page=100`;
  const facts: DependencySecurityFact[] = [];

  while (url) {
    const response = await fetcher(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2026-03-10",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Dependabot alerts API failed (${response.status})`);
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error("Dependabot alerts API returned a non-array body");
    for (const item of body) {
      const fact = normalizeDependabotAlert(item, now);
      if (fact) facts.push(fact);
    }
    url = nextLink(response.headers.get("link"));
  }
  return facts;
};

export { fetchDependabotAlerts, nextLink };
