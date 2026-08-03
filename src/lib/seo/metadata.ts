import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description: string;
  pathname: string;
};

/**
 * 공개 페이지 메타데이터 공통 골격.
 * - ★ 탭 제목(title)은 영어 고정 — 워드마크·태그라인이 영문인 브랜드와 일치시키고,
 *   단일 URL + 클라 언어 토글 구조에서 언어별 <title> 전환이 hydration 재커밋과 경합해
 *   깜빡이는 문제를 원천 제거한다(클라 전환안은 시도 후 기각).
 * - description 은 ko — 주 방문자·검색 노출 기준. 네비 사전(DICTIONARY)과 별개인 SEO 전용 문구.
 * - locale ko_KR 고정: SSR 은 항상 ko 스냅샷으로 렌더한다(LangProvider 트레이드오프)는 결정과 짝.
 */
const pageMetadata = ({ title, description, pathname }: PageMetadataInput): Metadata => ({
  title,
  description,
  alternates: {
    canonical: pathname,
  },
  openGraph: {
    type: "website",
    siteName: "Sungjoon Lee",
    locale: "ko_KR",
    title,
    description,
    url: pathname,
  },
  twitter: {
    title,
    description,
  },
});

export { pageMetadata };
