import { EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchSiteConfig } from "@/lib/firebase/public/site";
import type { SiteConfig } from "@/types/site";

const getSite = async (): Promise<SiteConfig> => {
  if (shouldUseMockContent()) return (await import("@/mocks/site")).MOCK_SITE;
  return (await fetchSiteConfig()) ?? EMPTY_SITE_CONFIG;
};

export { getSite };
