import { MOCK_SITE } from "@/mocks/site";
import type { SiteConfig } from "@/types/site";

/** site/config 문서. ★ P2에서 Firestore로 교체(호출부 무변경). */
const getSite = async (): Promise<SiteConfig> => MOCK_SITE;

export { getSite };
