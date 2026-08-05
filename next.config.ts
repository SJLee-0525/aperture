import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./src/constants/security-headers";

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
  // 경로 기반 i18n(/ko·/en) — 무-로케일 URL은 기본 언어(ko)로 308 직행.
  // Accept-Language 분기 없는 결정적 이전 (구글 권장: 언어 기반 자동 리다이렉트 금지).
  // v1 사진 URL(/albums 등)도 체인 리다이렉트(308 두 번)를 피해 /ko/photo/* 로 직행한다.
  async redirects() {
    return [
      { source: "/", destination: "/ko", permanent: true },
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

export default nextConfig;
