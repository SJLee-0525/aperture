import type { DevConfig, DevProject } from "@/types/dev";

/**
 * 개발 섹션 mock — design/ver_2/dev.js 이식(ko) + en 번역. 콘텐츠 원본: github.com/SJLee-0525/portfolio.
 * Firebase 미설정(로컬 dev·데모)에서만 폴백. 실운영 데이터는 관리자 CMS(Phase C2)로 입력.
 */
const MOCK_DEV_PROJECTS: DevProject[] = [
  {
    id: "portfolio",
    title: { ko: "개인 포트폴리오", en: "Personal Portfolio" },
    category: { ko: "웹 · 개인", en: "Web · Personal" },
    year: "2025",
    summary: {
      ko: "GSAP 애니메이션과 반응형 레이아웃으로 만든 개발자 포트폴리오. Lighthouse 50 → 90+.",
      en: "A developer portfolio built with GSAP animation and responsive layout. Lighthouse 50 → 90+.",
    },
    overview: {
      ko: "개발자로서의 성장과 경험을 정리하고, 기술 스택과 프로젝트를 소개하기 위해 제작한 개인 포트폴리오 웹사이트.",
      en: "A personal portfolio site built to organise my growth as a developer and present my tech stack and projects.",
    },
    roles: [
      {
        ko: "메인·기술스택·자기소개·프로젝트 목록 페이지 UI/UX 설계 및 구현",
        en: "Designed and built the main, tech-stack, about, and project-list pages",
      },
      {
        ko: "GSAP·CSS Keyframes 기반 섹션 단위 애니메이션과 로딩 단계 처리",
        en: "Section-level animation and loading stages with GSAP and CSS keyframes",
      },
      {
        ko: "네비게이션 클릭 시 부드러운 스크롤 이동",
        en: "Smooth scroll navigation on nav click",
      },
      {
        ko: "React createPortal 기반 프로젝트 상세 모달",
        en: "Project detail modal via React createPortal",
      },
      { ko: "TailwindCSS 반응형 웹 구현", en: "Responsive web with TailwindCSS" },
    ],
    troubleshooting: [
      {
        ko: "스크롤 방지 시 스크롤바 제거로 레이아웃 깨짐 → 스크롤바 너비만큼 padding-right 보정",
        en: "Scroll-lock removed the scrollbar and shifted layout → compensated with padding-right equal to the scrollbar width",
      },
      {
        ko: "새로고침 시 스크롤 위치 복원 → scrollRestoration='manual' + hash 초기화",
        en: "Scroll position restored on refresh → scrollRestoration='manual' + hash reset",
      },
      {
        ko: "타이핑 효과 한글 깨짐 → spread operator로 완성형 문자 기준 배열화",
        en: "Hangul broke in the typing effect → arrayified by composed characters via the spread operator",
      },
    ],
    techTags: ["React", "TypeScript", "TailwindCSS", "GSAP", "Vite", "Zustand"],
    links: [
      { label: "GitHub", href: "https://github.com/SJLee-0525/portfolio" },
      { label: "Live", href: "https://sjlee12.netlify.app/" },
    ],
    cover: null,
    images: [],
    order: 0,
    published: true,
  },
  {
    id: "photo-portfolio",
    title: { ko: "사진 포트폴리오", en: "Photo Portfolio" },
    category: { ko: "웹 · 개인", en: "Web · Personal" },
    year: "2025",
    summary: {
      ko: "사진가를 위한 메타데이터 중심 갤러리. EXIF 스펙시트·지도·프레임 내보내기.",
      en: "A metadata-driven gallery for photographers — EXIF spec sheet, map, and frame export.",
    },
    overview: {
      ko: "조리개·셔터·ISO 등 EXIF를 계기판처럼 보여주고, 앨범·지도·라이트박스·내보내기 프레임까지 갖춘 사진 포트폴리오.",
      en: "A photo portfolio that shows EXIF (aperture, shutter, ISO) like a dashboard, with albums, a map, a lightbox, and export frames.",
    },
    roles: [
      {
        ko: "EXIF 스펙시트·노출 삼각형 컴포넌트",
        en: "EXIF spec sheet and exposure-triangle components",
      },
      {
        ko: "메이슨리/정사각 그리드 + 라이트박스 모달",
        en: "Masonry/square grid + lightbox modal",
      },
      {
        ko: "촬영 위치 지도 + 6종 내보내기 프레임",
        en: "Shooting-location map + six export frames",
      },
    ],
    troubleshooting: [
      {
        ko: "웹컴포넌트 shadow DOM 이미지 캡처 이슈 → 상태 검증으로 우회",
        en: "Web-component shadow-DOM image capture issue → worked around via state validation",
      },
      {
        ko: "프레임 텍스트 오버플로 → overflow 클리핑 + 말줄임",
        en: "Frame text overflow → overflow clipping + ellipsis",
      },
    ],
    techTags: ["React", "HTML/CSS", "Canvas", "Vanilla JS"],
    links: [{ label: "열기", href: "#" }],
    cover: null,
    images: [],
    order: 1,
    published: true,
  },
  {
    id: "realtime-dashboard",
    title: { ko: "실시간 협업 대시보드", en: "Realtime Collaboration Dashboard" },
    category: { ko: "웹 · 팀", en: "Web · Team" },
    year: "2024",
    summary: {
      ko: "WebSocket 기반 팀 대시보드. 상태 동기화와 낙관적 업데이트.",
      en: "A WebSocket-based team dashboard with state sync and optimistic updates.",
    },
    overview: {
      ko: "여러 사용자가 동시에 작업하는 대시보드. 실시간 상태 동기화와 낙관적 UI 업데이트를 구현.",
      en: "A dashboard for simultaneous multi-user work, with real-time state sync and optimistic UI updates.",
    },
    roles: [
      {
        ko: "WebSocket 이벤트 기반 상태 스토어 설계",
        en: "WebSocket-event-driven state store design",
      },
      { ko: "낙관적 업데이트와 롤백 처리", en: "Optimistic updates with rollback" },
      { ko: "권한별 뷰 렌더링", en: "Role-based view rendering" },
    ],
    troubleshooting: [
      {
        ko: "동시 편집 충돌 → 서버 타임스탬프 기준 병합",
        en: "Concurrent-edit conflicts → merged by server timestamp",
      },
      { ko: "재연결 시 상태 복원 로직", en: "State restoration logic on reconnect" },
    ],
    techTags: ["React", "TypeScript", "WebSocket", "Zustand"],
    links: [{ label: "GitHub", href: "#" }],
    cover: null,
    images: [],
    order: 2,
    published: true,
  },
  {
    id: "design-system",
    title: { ko: "디자인 시스템 UI 키트", en: "Design System UI Kit" },
    category: { ko: "라이브러리 · 팀", en: "Library · Team" },
    year: "2024",
    summary: {
      ko: "재사용 가능한 컴포넌트 라이브러리와 토큰 시스템.",
      en: "A reusable component library and token system.",
    },
    overview: {
      ko: "팀 전반에서 쓰는 버튼·폼·모달 등 컴포넌트를 토큰 기반으로 정리한 UI 키트.",
      en: "A UI kit organising team-wide components (buttons, forms, modals) on a token system.",
    },
    roles: [
      { ko: "CSS 변수 기반 라이트/다크 토큰", en: "Light/dark tokens via CSS variables" },
      { ko: "접근성 고려한 폼·모달 컴포넌트", en: "Accessible form and modal components" },
      { ko: "Storybook 문서화", en: "Storybook documentation" },
    ],
    troubleshooting: [
      {
        ko: "토큰 네이밍 충돌 → 시맨틱 레이어 분리",
        en: "Token naming collisions → separated a semantic layer",
      },
    ],
    techTags: ["React", "TypeScript", "Storybook", "CSS Vars"],
    links: [{ label: "GitHub", href: "#" }],
    cover: null,
    images: [],
    order: 3,
    published: true,
  },
];

const MOCK_DEV_CONFIG: DevConfig = {
  heroLead: {
    ko: "사용자에게 명확하게 전달되는 흐름을 설계하고, GSAP 기반 애니메이션과 반응형 레이아웃으로 주목도를 높이는 프론트엔드 개발자입니다.",
    en: "A frontend developer who designs clear user flows and heightens focus with GSAP-based animation and responsive layouts.",
  },
  interview: [
    {
      q: { ko: "Q. 어떤 개발자인가요?", en: "Q. What kind of developer are you?" },
      a: {
        ko: "사용자에게 명확하게 전달되는 흐름을 설계하고, 인터랙션으로 주목도를 높이는 프론트엔드 개발자입니다.",
        en: "A frontend developer who designs clear user flows and raises attention through interaction.",
      },
    },
    {
      q: { ko: "Q. 무엇을 중요하게 여기나요?", en: "Q. What do you value?" },
      a: {
        ko: "정적인 화면을 넘어 반응형 레이아웃과 부드러운 전환으로, 정보가 자연스럽게 읽히는 경험을 만드는 것.",
        en: "Going beyond static screens — responsive layouts and smooth transitions that let information read naturally.",
      },
    },
    {
      q: { ko: "Q. 최근 관심사는?", en: "Q. Recent interests?" },
      a: {
        ko: "GSAP 기반 타임라인 애니메이션, 코드 스플리팅과 Lazy Loading을 통한 성능·접근성 개선.",
        en: "GSAP timeline animation, and performance/accessibility gains via code splitting and lazy loading.",
      },
    },
  ],
  stack: [
    {
      category: "Language",
      items: [
        { name: "TypeScript", bg: "#3178c6", fg: "#ffffff" },
        { name: "JavaScript", bg: "#f7df1e", fg: "#000000" },
        { name: "HTML5", bg: "#e34f26", fg: "#ffffff" },
      ],
    },
    {
      category: "Framework · Library",
      items: [
        { name: "React.js", bg: "#61dafb", fg: "#000000" },
        { name: "React Router", bg: "#ca4245", fg: "#ffffff" },
        { name: "Zustand", bg: "#443e38", fg: "#ffffff" },
      ],
    },
    {
      category: "Styling · Motion",
      items: [
        { name: "TailwindCSS", bg: "#06b6d4", fg: "#ffffff" },
        { name: "GSAP", bg: "#0ae448", fg: "#000000" },
        { name: "clsx", bg: "#6b7280", fg: "#ffffff" },
      ],
    },
    {
      category: "Build · Runtime",
      items: [
        { name: "Vite", bg: "#646cff", fg: "#ffffff" },
        { name: "Node.js", bg: "#339933", fg: "#ffffff" },
        { name: "Yarn PnP", bg: "#2188b6", fg: "#ffffff" },
      ],
    },
    {
      category: "Quality",
      items: [
        { name: "ESLint", bg: "#4b32c3", fg: "#ffffff" },
        { name: "Prettier", bg: "#f7b93e", fg: "#000000" },
        { name: "Lighthouse 90+", bg: "#f44b21", fg: "#ffffff" },
      ],
    },
  ],
  timeline: [
    {
      period: "2025 —",
      title: { ko: "프론트엔드 개발자", en: "Frontend Developer" },
      role: { ko: "개인 프로젝트 · 프리랜스", en: "Personal projects · Freelance" },
      desc: {
        ko: "React·TypeScript 기반 웹 애플리케이션과 인터랙티브 포트폴리오를 설계·구현.",
        en: "Designing and building React/TypeScript web apps and interactive portfolios.",
      },
    },
    {
      period: "2024",
      title: { ko: "프론트엔드 부트캠프 수료", en: "Frontend Bootcamp" },
      role: { ko: "SSAFY / 우수 수료", en: "SSAFY / Honors" },
      desc: {
        ko: "알고리즘·CS 기초와 실전 프로젝트. 팀 프로젝트에서 프론트엔드 리드.",
        en: "Algorithms/CS fundamentals and real projects; frontend lead on the team project.",
      },
    },
    {
      period: "2023",
      title: { ko: "첫 웹 프로젝트", en: "First Web Project" },
      role: { ko: "Vanilla JS · React 입문", en: "Vanilla JS · React basics" },
      desc: {
        ko: "JavaScript로 시작해 React 생태계로 확장. 상태관리와 컴포넌트 설계를 학습.",
        en: "Started with JavaScript and expanded into React; learned state management and component design.",
      },
    },
  ],
};

export { MOCK_DEV_PROJECTS, MOCK_DEV_CONFIG };
