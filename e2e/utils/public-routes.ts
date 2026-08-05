type PublicRoute = {
  path: string;
  expectedText: string | RegExp;
};

/** 공개 경로는 로케일 프리픽스 필수(/ko 기본) — 무-로케일 접근은 /ko로 308 리다이렉트된다. */
const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/ko", expectedText: "Sungjoon Lee." },
  { path: "/ko/dev", expectedText: "기술 스택" },
  { path: "/ko/dev/about", expectedText: "Developer" },
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
  { path: "/ko/search", expectedText: "검색 · 태그 / 장비 / 장소" },
  // en 스팟 체크 — /en 경로가 영어 UI로 SSR 되는지 대표 페이지만 검증
  { path: "/en", expectedText: "Sungjoon Lee." },
  { path: "/en/dev", expectedText: "Stack" },
];

export { PUBLIC_ROUTES };
export type { PublicRoute };
