import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site-url";

/**
 * 검색 엔진에 공개 경로와 차단 경로를 알린다.
 * @returns {MetadataRoute.Robots} 관리자·API를 제외하고 사이트맵을 연결한 robots 설정.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
