type PublicRoute = {
  path: string;
  expectedText: string | RegExp;
};

/** 공개 콘텐츠 경로는 로케일 프리픽스 필수. 루트만 선호 언어 307, 나머지 구 URL은 /ko 308이다. */
const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/ko", expectedText: "Sungjoon Lee." },
  { path: "/ko/dev", expectedText: "사용 기술" },
  { path: "/ko/dev/career", expectedText: "경력" },
  { path: "/ko/dev/projects", expectedText: "개인 포트폴리오" },
  { path: "/ko/photo", expectedText: "새벽의 항구" },
  { path: "/ko/photo/about", expectedText: "Aperture." },
  { path: "/ko/photo/albums", expectedText: "도시의 밤" },
  { path: "/ko/photo/albums/city-night", expectedText: "도시의 밤" },
  { path: "/ko/photo/map", expectedText: /spots/ },
  { path: "/ko/music", expectedText: "겨울 나그네" },
  { path: "/ko/music/about", expectedText: "Pianist" },
  { path: "/ko/music/career", expectedText: "국제 피아노 콩쿠르" },
  { path: "/ko/music/media", expectedText: "슈베르트 · 즉흥곡" },
  { path: "/ko/contact", expectedText: "문의" },
  { path: "/ko/privacy", expectedText: "개인정보 처리방침" },
  { path: "/ko/terms", expectedText: "사이트 이용 및 콘텐츠 안내" },
  { path: "/ko/accessibility", expectedText: "접근성 안내" },
  { path: "/ko/search", expectedText: "검색 · 태그 / 장비 / 장소" },
  // en 스팟 체크 — /en 경로가 영어 UI로 SSR 되는지 대표 페이지만 검증
  { path: "/en", expectedText: "Sungjoon Lee." },
  { path: "/en/dev", expectedText: "Tech Used" },
  { path: "/en/privacy", expectedText: "Privacy Policy" },
  { path: "/en/terms", expectedText: "Site Use & Content Notice" },
  { path: "/en/accessibility", expectedText: "Accessibility Statement" },
];

export { PUBLIC_ROUTES };
export type { PublicRoute };
