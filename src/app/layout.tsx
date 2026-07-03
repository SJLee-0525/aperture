import type { Metadata } from "next";
import { Newsreader, Schibsted_Grotesk, Spline_Sans_Mono } from "next/font/google";

import { LangProvider } from "@/features/lang/_components/LangProvider";
import { MotionProvider } from "@/features/motion/_components/MotionProvider";
import { THEME_INIT_SCRIPT } from "@/features/theme/_lib/theme-script";

import "./globals.css";

/* Newsreader — 제목·워드마크용 serif. 디자인이 optical sizing(opsz)을 사용 */
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
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

export const metadata: Metadata = {
  title: "Aperture. — Sungjoon Lee",
  description: "사진작가 이성준(Sungjoon Lee)의 사진 포트폴리오. 작업 · 앨범 · 지도 · 소개.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${newsreader.variable} ${schibstedGrotesk.variable} ${splineMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <LangProvider>
          <MotionProvider>{children}</MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
