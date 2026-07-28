type PublicRoute = {
  path: string;
  expectedText: string | RegExp;
};

const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/", expectedText: "Sungjoon Lee." },
  { path: "/dev", expectedText: "기술 스택" },
  { path: "/dev/about", expectedText: "Developer" },
  { path: "/dev/career", expectedText: "경력" },
  { path: "/dev/projects", expectedText: "개인 포트폴리오" },
  { path: "/photo", expectedText: "새벽의 항구" },
  { path: "/photo/about", expectedText: "Aperture." },
  { path: "/photo/albums", expectedText: "도시의 밤" },
  { path: "/photo/albums/city-night", expectedText: "도시의 밤" },
  { path: "/photo/map", expectedText: /spots/ },
  { path: "/music", expectedText: "겨울 나그네" },
  { path: "/music/about", expectedText: "Pianist" },
  { path: "/music/career", expectedText: "국제 피아노 콩쿠르" },
  { path: "/music/media", expectedText: "슈베르트 · 즉흥곡" },
  { path: "/contact", expectedText: "연락" },
  { path: "/search", expectedText: "검색 · 태그 / 장비 / 장소" },
];

export { PUBLIC_ROUTES };
export type { PublicRoute };
