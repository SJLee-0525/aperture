// LHCI는 동기 CommonJS 설정을 읽으므로 JSON 단일 출처도 이 경계에서 require한다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const performanceTargets = require("./config/performance-targets.json");

const configuredSiteUrl = process.env.SITE_URL;
if (!configuredSiteUrl) throw new Error("SITE_URL is required for production Lighthouse");

const siteUrl = new URL(configuredSiteUrl);
if (
  siteUrl.protocol !== "https:" ||
  siteUrl.username ||
  siteUrl.password ||
  siteUrl.port ||
  siteUrl.pathname !== "/" ||
  siteUrl.search ||
  siteUrl.hash
) {
  throw new Error("SITE_URL must be an HTTPS origin without path, query, fragment, or port");
}

const origin = siteUrl.origin;

module.exports = {
  ci: {
    collect: {
      // `/`는 언어 설정에 따라 이동하므로 측정하지 않는다. 첫 버전은 한국어 대표 화면만 고정한다.
      url: performanceTargets.map(({ path }) => `${origin}${path}`),
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-gpu",
        formFactor: "mobile",
      },
    },
    assert: {
      assertions: {},
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-production-report",
    },
  },
};
