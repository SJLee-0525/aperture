import type { NextConfig } from "next";

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
  // 사진 섹션이 /photo/* 로 이동(A1) — 기존 URL 보존. `/` 는 (public)/page.tsx 가 처리.
  // 이전 사진 URL은 308로 새 경로에 검색 신호와 북마크를 영구 이전한다.
  async redirects() {
    return [
      { source: "/albums", destination: "/photo/albums", permanent: true },
      { source: "/albums/:id", destination: "/photo/albums/:id", permanent: true },
      { source: "/map", destination: "/photo/map", permanent: true },
      { source: "/about", destination: "/photo/about", permanent: true },
    ];
  },
};

export default nextConfig;
