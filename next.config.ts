import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright는 실행 중인 로컬 dev 서버와 충돌하지 않도록 전용 distDir를 주입한다.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    // Firebase Storage 다운로드 URL (P2부터). getDownloadURL은 firebasestorage.googleapis.com 반환.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
  },
  // 사진 섹션이 /photo/* 로 이동(A1) — 기존 URL 보존. `/` 는 (public)/page.tsx 가 처리.
  // permanent:false(307) — 활성 개발 중 브라우저 강캐시 회피. 안정화 후 true(308)로 전환 검토.
  async redirects() {
    return [
      { source: "/albums", destination: "/photo/albums", permanent: false },
      { source: "/albums/:id", destination: "/photo/albums/:id", permanent: false },
      { source: "/map", destination: "/photo/map", permanent: false },
      { source: "/about", destination: "/photo/about", permanent: false },
    ];
  },
};

export default nextConfig;
