const LOCAL_SITE_URL = "http://localhost:3000";

const normalizeSiteUrl = (value: string) => {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
};

const configuredSiteUrl =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL;

const SITE_URL = normalizeSiteUrl(configuredSiteUrl ?? LOCAL_SITE_URL);

const absoluteUrl = (pathname: string) => new URL(pathname, `${SITE_URL}/`).toString();

export { absoluteUrl, SITE_URL };
