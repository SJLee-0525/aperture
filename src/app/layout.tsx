import { Newsreader, Noto_Serif_KR, Schibsted_Grotesk, Spline_Sans_Mono } from "next/font/google";

import { LangProvider } from "@/features/lang/_components/LangProvider";
import { MotionProvider } from "@/features/motion/_components/MotionProvider";
import { CustomCursor } from "@/features/pointer-chrome/_components/CustomCursor";
import { CustomScrollbar } from "@/features/pointer-chrome/_components/CustomScrollbar";

import { THEME_INIT_SCRIPT } from "@/features/theme/_lib/theme-script";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo/site-meta";
import { SITE_URL } from "@/lib/seo/site-url";
import { WEBMCP_ORIGIN_TRIAL_TOKEN } from "@/lib/webmcp/origin-trial-token";

import type { Metadata, Viewport } from "next";

import "./globals.css";

/* Newsreader — 제목·워드마크용 serif. 디자인이 optical sizing(opsz)을 사용 */
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

/* Noto Serif KR — Newsreader에 없는 한글 글리프용 editorial fallback */
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
});

/* Schibsted Grotesk — UI·본문·라벨용 sans */
const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
});

/* Spline Sans Mono — 좌표·EXIF 수치 등 기술 라벨용 mono */
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline-mono",
  display: "swap",
});

/* 기본 메타는 ko 기준(SSR 기본 언어) — 공개 페이지는 [lang] 세그먼트의 generateMetadata가 언어별로 덮어쓴다 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Sungjoon Lee",
  },
  description: SITE_DESCRIPTION.ko,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: "/" }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION.ko,
    url: "/",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION.ko,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      ...(process.env.NAVER_SITE_VERIFICATION
        ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
        : {}),
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

/**
 * 전역 메타데이터, 폰트, 테마, 언어 공급자를 설치하는 루트 레이아웃.
 * @param props 레이아웃 하위 콘텐츠.
 * @param props.children 모든 애플리케이션 라우트.
 * @returns 전역 html·body 셸.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${newsreader.variable} ${notoSerifKr.variable} ${schibstedGrotesk.variable} ${splineMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* WebMCP 오리진 트라이얼 — 토큰은 첫 파싱 시점에 있어야 하므로 metadata API 대신
            head 직접 삽입(metadata.other 는 name= meta 만 만들어 http-equiv 에 부적합). */}
        {WEBMCP_ORIGIN_TRIAL_TOKEN ? (
          <meta httpEquiv="origin-trial" content={WEBMCP_ORIGIN_TRIAL_TOKEN} />
        ) : null}
      </head>
      <body>
        <LangProvider>
          <MotionProvider>
            <CustomCursor />
            <CustomScrollbar />
            {children}
          </MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
