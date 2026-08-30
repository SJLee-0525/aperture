type TargetPath = {
  id: string;
  path: `/${string}`;
};

type ResolvedTarget = TargetPath & {
  url: string;
};

type Requester = (input: string, init?: RequestInit) => Promise<Response>;

const MAX_REDIRECTS = 5;
const LOCALE_PATHS = new Set(["/ko", "/en"]);

/**
 * 운영 측정의 기준 origin을 검증한다.
 * path를 허용하면 대표 경로를 결합할 때 일부 구간이 덮어써져 다른 URL을 측정할 수 있다.
 */
const siteOrigin = (value: string | undefined): string => {
  if (!value?.trim()) throw new Error("SITE_URL is required");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("SITE_URL must be a valid URL");
  }

  if (parsed.protocol !== "https:") throw new Error("SITE_URL must use HTTPS");
  if (parsed.username || parsed.password) throw new Error("SITE_URL must not contain credentials");
  if (parsed.port) throw new Error("SITE_URL must not contain a port");
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("SITE_URL must be an origin without path, query, or fragment");
  }

  return parsed.origin;
};

const targetUrls = (origin: string, targets: readonly TargetPath[]): ResolvedTarget[] =>
  targets.map((target) => ({ ...target, url: new URL(target.path, `${origin}/`).toString() }));

const locationFrom = (response: Response, currentUrl: string): URL => {
  const location = response.headers.get("location");
  if (!location) throw new Error(`Redirect from ${currentUrl} is missing Location`);
  return new URL(location, currentUrl);
};

const assertSameOrigin = (url: URL, origin: string): void => {
  if (url.origin !== origin) throw new Error(`Redirect left the configured origin: ${url.origin}`);
};

/**
 * 방문자별 언어 선택은 재현하지 않고 `/`의 라우팅 계약만 확인한다.
 * `redirect: manual`은 fetch가 최종 응답으로 이동해 307과 Location을 숨기지 않게 한다.
 */
const verifyRootLocaleRedirect = async (origin: string, request: Requester): Promise<string> => {
  const response = await request(`${origin}/`, {
    headers: { "Accept-Language": "ko" },
    redirect: "manual",
  });
  if (response.status !== 307)
    throw new Error(`Root must redirect with 307, received ${response.status}`);

  const destination = locationFrom(response, `${origin}/`);
  assertSameOrigin(destination, origin);
  if (!LOCALE_PATHS.has(destination.pathname) || destination.search || destination.hash) {
    throw new Error(`Root redirected to an unsupported locale path: ${destination.pathname}`);
  }
  return destination.toString();
};

/**
 * redirect를 한 단계씩 검증해 외부 origin을 측정하거나 redirect loop에 머무는 것을 막는다.
 */
const resolveHtmlTarget = async (
  initialUrl: string,
  origin: string,
  request: Requester,
): Promise<string> => {
  let current = new URL(initialUrl);
  const visited = new Set<string>();

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    assertSameOrigin(current, origin);
    if (visited.has(current.toString())) throw new Error(`Redirect loop detected at ${current}`);
    visited.add(current.toString());

    const response = await request(current.toString(), { redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      current = locationFrom(response, current.toString());
      continue;
    }
    if (!response.ok) throw new Error(`Target ${current} returned ${response.status}`);

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Target ${current} did not return HTML`);
    }
    return current.toString();
  }

  throw new Error(`Target exceeded ${MAX_REDIRECTS} redirects: ${initialUrl}`);
};

/**
 * 예약 측정 전에 루트 언어 이동과 대표 URL의 최종 HTML 응답을 같은 규칙으로 확인한다.
 */
const preflightPerformanceTargets = async (
  configuredSiteUrl: string | undefined,
  targets: readonly TargetPath[],
  request: Requester = fetch,
): Promise<{ origin: string; rootDestination: string; targets: ResolvedTarget[] }> => {
  const origin = siteOrigin(configuredSiteUrl);
  const rootDestination = await verifyRootLocaleRedirect(origin, request);
  const resolved = await Promise.all(
    targetUrls(origin, targets).map(async (target) => ({
      ...target,
      url: await resolveHtmlTarget(target.url, origin, request),
    })),
  );
  return { origin, rootDestination, targets: resolved };
};

export {
  preflightPerformanceTargets,
  resolveHtmlTarget,
  siteOrigin,
  targetUrls,
  verifyRootLocaleRedirect,
};
