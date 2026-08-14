import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import packageJson from "./package.json" with { type: "json" };
import { SECURITY_HEADERS } from "./src/constants/security-headers";
import { assertDeployableContentSource } from "./src/lib/content/assert-deployable-content-source";

const nextConfig: NextConfig = {
  // Playwright는 실행 중인 로컬 dev 서버와 충돌하지 않도록 전용 distDir를 주입한다.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    // 업로드 단계에서 메인(2048px)·썸네일(320px) WebP를 직접 생성한다.
    // Vercel Image Optimization 한도에 의존하지 않고 Storage 파일을 그대로 전달한다.
    unoptimized: true,
    // Firebase Storage 다운로드 URL (P2부터). getDownloadURL은 firebasestorage.googleapis.com 반환.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
  // 경로 기반 i18n(/ko·/en) — 루트 / 의 언어 협상은 proxy.ts가 307로 담당한다.
  // 아래 무-로케일·v1 URL은 검색 신호가 흔들리지 않게 기본 언어(ko)로 308 직행한다.
  // v1 사진 URL(/albums 등)도 체인 리다이렉트(308 두 번)를 피해 /ko/photo/* 로 직행한다.
  async redirects() {
    return [
      // /dev/about 은 /dev(소개)로 통합했다. redirects 는 첫 매치가 이기므로 아래 /dev/:path* 보다
      // 위에 둬야 무-로케일 유입이 /ko/dev/about 을 거치는 308 두 번(체인)이 되지 않는다.
      { source: "/dev/about", destination: "/ko/dev", permanent: true },
      { source: "/:lang(ko|en)/dev/about", destination: "/:lang/dev", permanent: true },
      { source: "/photo/:path*", destination: "/ko/photo/:path*", permanent: true },
      { source: "/music/:path*", destination: "/ko/music/:path*", permanent: true },
      { source: "/dev/:path*", destination: "/ko/dev/:path*", permanent: true },
      { source: "/contact", destination: "/ko/contact", permanent: true },
      { source: "/search", destination: "/ko/search", permanent: true },
      { source: "/albums", destination: "/ko/photo/albums", permanent: true },
      { source: "/albums/:id", destination: "/ko/photo/albums/:id", permanent: true },
      { source: "/map", destination: "/ko/photo/map", permanent: true },
      { source: "/about", destination: "/ko/photo/about", permanent: true },
    ];
  },
  // 백엔드가 없어 브라우저 측 방어는 응답 헤더가 전부다 — 목록은 constants/security-headers.ts.
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
};

// Sentry 오류 모니터링(ADR-0004). 브라우저 이벤트는 /monitoring 터널(동일 출처)로 보내
// security-headers.ts의 connect-src 화이트리스트를 넓히지 않는다. SDK init의 정책(동의 게이팅·
// 샘플링·dataCollection 잠금)은 features/monitoring과 sentry.*.config.ts가 담당한다.
const sentryConfig = withSentryConfig(nextConfig, {
  org: "yonsei-univ-yr",
  project: "javascript-nextjs",

  // CI 환경에서만 소스맵 업로드 로그를 출력한다.
  silent: !process.env.CI,

  // 스택 트레이스 가독성을 위해 소스맵 업로드 범위를 넓힌다.
  widenClientFileUpload: true,

  // 브라우저 이벤트의 동일 출처 터널. proxy.ts matcher는 "/"뿐이라 충돌하지 않는다.
  tunnelRoute: "/monitoring",

  // 배포별 릴리즈 태깅. Vercel은 commit SHA, 로컬 빌드는 package.json 버전을 사용한다.
  // SDK init에는 release를 넣지 않는다: 클라이언트 번들에는 VERCEL_GIT_COMMIT_SHA가
  // 인라인되지 않아 항상 폴백으로 평가되고 3개 런타임·소스맵의 릴리즈가 어긋난다.
  release: {
    name: process.env.VERCEL_GIT_COMMIT_SHA
      ? `aperture@${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)}`
      : `aperture@${packageJson.version}-local`,
    setCommits: { auto: true, ignoreMissing: true },
  },

  // 소스맵은 Sentry 업로드 후 프로덕션 번들에서 제거한다 (원본 코드 비노출).
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  webpack: {
    treeshake: { removeDebugLogging: true },
  },
});

/**
 * 함수형 설정으로 두는 이유는 phase 를 받기 위해서다.
 *
 * 배포 산출물이 mock 콘텐츠로 만들어지는 것은 여기서만 막을 수 있다 — 브라우저에는 배포
 * 환경을 알려 줄 값이 없다(`NEXT_PUBLIC_` 이 아닌 변수는 번들에 인라인되지 않는다).
 * `NODE_ENV` 가 아니라 phase 로 가르는 이유는 `next typegen` 처럼 산출물과 무관한 명령까지
 * 막지 않기 위함이다.
 *
 * @param {string} phase Next 가 넘기는 실행 단계.
 * @returns {NextConfig} Sentry 를 감싼 설정.
 */
const config = (phase: string): NextConfig => {
  assertDeployableContentSource(phase);
  return sentryConfig;
};

export default config;
