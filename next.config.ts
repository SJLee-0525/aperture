import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
