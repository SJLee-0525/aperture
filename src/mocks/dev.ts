import type { DevConfig, DevProject } from "@/types/dev";

type AwardProjectSeed = {
  id: string;
  title: { ko: string; en: string };
  category: { ko: string; en: string };
  year: string;
  period: { ko: string; en: string };
  summary: { ko: string; en: string };
  achievement: { ko: string; en: string };
  techTags: string[];
  order: number;
};

/**
 * 수상 딥링크가 로컬·데모에서도 실제 상세 모달을 열도록 하는 최소 프로젝트 fixture.
 *
 * @param {AwardProjectSeed} seed
 * @returns {DevProject}
 */
const awardProject = (seed: AwardProjectSeed): DevProject => ({
  ...seed,
  position: { ko: "Frontend · SSAFY 팀 프로젝트", en: "Frontend · SSAFY team project" },
  overview: seed.summary,
  features: [],
  roles: [],
  troubleshooting: [],
  achievements: [seed.achievement],
  links: [],
  cover: null,
  images: [],
  published: true,
});

/**
 * 개발 섹션 mock — design/ver_2/dev.js 이식(ko) + en 번역. 콘텐츠 원본: github.com/SJLee-0525/portfolio.
 * Supabase 미설정(로컬 dev·데모)에서만 폴백. 실운영 데이터는 관리자 CMS(Phase C2)로 입력.
 */
const MOCK_DEV_PROJECTS: DevProject[] = [
  {
    id: "portfolio",
    title: { ko: "개인 포트폴리오", en: "Personal Portfolio" },
    category: { ko: "웹 · 개인", en: "Web · Personal" },
    year: "2025",
    period: { ko: "2025. 08. — 2025. 10.", en: "Aug 2025 — Oct 2025" },
    position: {
      ko: "개인 프로젝트 · 기획/디자인/개발 전담",
      en: "Solo project · planning, design, development",
    },
    summary: {
      ko: "GSAP 애니메이션과 반응형 레이아웃으로 만든 개발자 포트폴리오. Lighthouse 50 → 90+.",
      en: "A developer portfolio built with GSAP animation and responsive layout. Lighthouse 50 → 90+.",
    },
    overview: {
      ko: "개발자로서의 성장과 경험을 정리하고, 기술 스택과 프로젝트를 소개하기 위해 제작한 개인 포트폴리오 웹사이트.",
      en: "A personal portfolio site built to organise my growth as a developer and present my tech stack and projects.",
    },
    features: [
      {
        ko: "섹션 단위 스크롤 내비게이션과 타이핑 인트로",
        en: "Section-based scroll navigation and a typing intro",
      },
      {
        ko: "프로젝트 상세 모달과 기술 스택 필터",
        en: "Project detail modal and tech-stack filter",
      },
      {
        ko: "GSAP 타임라인 기반 진입 애니메이션",
        en: "GSAP-timeline entrance animations",
      },
    ],
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
        title: { ko: "스크롤 잠금 시 레이아웃 시프트", en: "Layout shift on scroll lock" },
        problem: {
          ko: "스크롤 방지 시 스크롤바 제거로 레이아웃 깨짐",
          en: "Scroll-lock removed the scrollbar and shifted the layout",
        },
        solution: {
          ko: "스크롤바 너비만큼 padding-right 보정",
          en: "Compensated with padding-right equal to the scrollbar width",
        },
        result: {
          ko: "모달 개폐 시 화면 흔들림 제거",
          en: "No more visual jump when opening the modal",
        },
      },
      {
        title: { ko: "새로고침 스크롤 위치 복원", en: "Scroll restoration on refresh" },
        problem: {
          ko: "새로고침 시 브라우저가 이전 스크롤 위치를 복원해 인트로가 스킵됨",
          en: "The browser restored the previous scroll position on refresh, skipping the intro",
        },
        solution: {
          ko: "scrollRestoration='manual' + hash 초기화",
          en: "scrollRestoration='manual' + hash reset",
        },
      },
      {
        title: { ko: "타이핑 효과 한글 깨짐", en: "Hangul breaking in the typing effect" },
        problem: {
          ko: "글자 단위 슬라이스에서 한글 자모가 분리돼 표시됨",
          en: "Per-character slicing tore Hangul into jamo fragments",
        },
        solution: {
          ko: "spread operator로 완성형 문자 기준 배열화",
          en: "Arrayified by composed characters via the spread operator",
        },
      },
    ],
    achievements: [
      {
        ko: "Lighthouse 성능 50점대 → 90+ 개선",
        en: "Improved Lighthouse performance from the 50s to 90+",
      },
      {
        ko: "이미지 lazy-load·코드 스플리팅으로 초기 로드 40% 단축",
        en: "Cut initial load by 40% with image lazy-loading and code splitting",
      },
    ],
    techTags: ["React", "TypeScript", "TailwindCSS", "GSAP", "Vite", "Zustand"],
    links: [
      { label: "GitHub", href: "https://github.com/SJLee-0525/portfolio" },
      { label: "Live", href: "https://sjlee12.netlify.app/" },
    ],
    cover: null,
    // 캐러셀 UI 테스트용 샘플 (design-samples 재사용) — 실데이터는 관리자 업로드 이미지.
    images: [
      { url: "/design-samples/tone01.png", path: "design-samples/tone01.png", w: 1600, h: 900 },
      { url: "/design-samples/tone02.png", path: "design-samples/tone02.png", w: 1600, h: 900 },
      { url: "/design-samples/tone03.png", path: "design-samples/tone03.png", w: 1600, h: 900 },
    ],
    order: 0,
    published: true,
  },
  {
    id: "photo-portfolio",
    title: { ko: "사진 포트폴리오", en: "Photo Portfolio" },
    category: { ko: "웹 · 개인", en: "Web · Personal" },
    year: "2025",
    period: { ko: "2025. 11. — 현재", en: "Nov 2025 — Present" },
    position: {
      ko: "개인 프로젝트 · 기획/디자인/개발 전담",
      en: "Solo project · planning, design, development",
    },
    summary: {
      ko: "사진가를 위한 메타데이터 중심 갤러리. EXIF 스펙시트·지도·프레임 내보내기.",
      en: "A metadata-driven gallery for photographers — EXIF spec sheet, map, and frame export.",
    },
    overview: {
      ko: "조리개·셔터·ISO 등 EXIF를 계기판처럼 보여주고, 앨범·지도·라이트박스·내보내기 프레임까지 갖춘 사진 포트폴리오.",
      en: "A photo portfolio that shows EXIF (aperture, shutter, ISO) like a dashboard, with albums, a map, a lightbox, and export frames.",
    },
    features: [
      {
        ko: "EXIF 계기판(조리개·셔터·ISO)과 노출 삼각형 시각화",
        en: "EXIF dashboard (aperture, shutter, ISO) with an exposure-triangle visual",
      },
      {
        ko: "촬영 좌표 지도 핀과 앨범 묶음",
        en: "Map pins from shooting coordinates and album grouping",
      },
      {
        ko: "프레임 6종 EXIF 각인 내보내기",
        en: "Six frame styles with EXIF-engraved export",
      },
    ],
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
        title: { ko: "shadow DOM 이미지 캡처 실패", en: "Shadow-DOM image capture failure" },
        problem: {
          ko: "웹컴포넌트 shadow DOM 내부 이미지가 canvas 캡처에서 누락됨",
          en: "Images inside web-component shadow DOM were missing from canvas capture",
        },
        solution: {
          ko: "로드 상태 검증 후 직접 드로잉으로 우회",
          en: "Worked around by validating load state and drawing directly",
        },
      },
      {
        title: { ko: "프레임 텍스트 오버플로", en: "Frame text overflow" },
        problem: {
          ko: "긴 촬영지·렌즈명이 프레임 여백을 침범",
          en: "Long place and lens names overflowed the frame margins",
        },
        solution: {
          ko: "overflow 클리핑 + 말줄임 처리",
          en: "Overflow clipping + ellipsis",
        },
      },
    ],
    achievements: [
      {
        ko: "업로드 파이프라인(EXIF 추출→webp 압축→업로드) 자동화",
        en: "Automated the upload pipeline (EXIF extraction → webp compression → upload)",
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
    period: { ko: "2024. 03. — 2024. 08.", en: "Mar 2024 — Aug 2024" },
    position: {
      ko: "Frontend 리드 · 5인 팀 (FE 2 · BE 3)",
      en: "Frontend lead · team of 5 (FE 2 · BE 3)",
    },
    summary: {
      ko: "WebSocket 기반 팀 대시보드. 상태 동기화와 낙관적 업데이트.",
      en: "A WebSocket-based team dashboard with state sync and optimistic updates.",
    },
    overview: {
      ko: "여러 사용자가 동시에 작업하는 대시보드. 실시간 상태 동기화와 낙관적 UI 업데이트를 구현.",
      en: "A dashboard for simultaneous multi-user work, with real-time state sync and optimistic UI updates.",
    },
    features: [
      {
        ko: "실시간 다중 사용자 편집과 변경 사항 브로드캐스트",
        en: "Real-time multi-user editing with change broadcasting",
      },
      {
        ko: "권한(뷰어/편집자/관리자)별 화면 구성",
        en: "Views composed by role (viewer / editor / admin)",
      },
    ],
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
        title: { ko: "동시 편집 충돌", en: "Concurrent-edit conflicts" },
        problem: {
          ko: "두 사용자가 같은 항목을 동시에 수정하면 마지막 쓰기가 이전 변경을 덮어씀",
          en: "Two users editing the same item caused last-write-wins data loss",
        },
        solution: {
          ko: "서버 타임스탬프 기준 병합 전략 도입",
          en: "Introduced a merge strategy keyed on server timestamps",
        },
        result: {
          ko: "편집 유실 리포트 0건 유지",
          en: "Zero lost-edit reports since",
        },
      },
      {
        title: { ko: "재연결 시 상태 불일치", en: "State divergence on reconnect" },
        problem: {
          ko: "네트워크 재연결 후 로컬 상태가 서버와 어긋남",
          en: "Local state diverged from the server after network reconnects",
        },
        solution: {
          ko: "재연결 시 스냅숏 재수신 후 로컬 큐 재적용",
          en: "Re-fetched a snapshot on reconnect and replayed the local queue",
        },
      },
    ],
    achievements: [
      {
        ko: "동시 접속 30명 기준 실시간 동기화 지연 200ms 이하",
        en: "Kept sync latency under 200ms with 30 concurrent users",
      },
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
    period: { ko: "2024. 09. — 2024. 12.", en: "Sep 2024 — Dec 2024" },
    position: {
      ko: "디자인 시스템 담당 · 4인 팀 (FE 3 · 디자인 1)",
      en: "Design-system owner · team of 4 (FE 3 · Design 1)",
    },
    summary: {
      ko: "재사용 가능한 컴포넌트 라이브러리와 토큰 시스템.",
      en: "A reusable component library and token system.",
    },
    overview: {
      ko: "팀 전반에서 쓰는 버튼·폼·모달 등 컴포넌트를 토큰 기반으로 정리한 UI 키트.",
      en: "A UI kit organising team-wide components (buttons, forms, modals) on a token system.",
    },
    features: [
      {
        ko: "라이트/다크 토큰과 시맨틱 컬러 레이어",
        en: "Light/dark tokens with a semantic colour layer",
      },
      {
        ko: "버튼·폼·모달 등 공용 컴포넌트와 Storybook 문서",
        en: "Shared components (buttons, forms, modals) with Storybook docs",
      },
    ],
    roles: [
      { ko: "CSS 변수 기반 라이트/다크 토큰", en: "Light/dark tokens via CSS variables" },
      { ko: "접근성 고려한 폼·모달 컴포넌트", en: "Accessible form and modal components" },
      { ko: "Storybook 문서화", en: "Storybook documentation" },
    ],
    troubleshooting: [
      {
        title: { ko: "토큰 네이밍 충돌", en: "Token naming collisions" },
        problem: {
          ko: "컴포넌트별 색 토큰이 난립하며 이름이 충돌하고 다크모드 매핑이 어긋남",
          en: "Per-component colour tokens proliferated, colliding in name and breaking dark-mode mapping",
        },
        solution: {
          ko: "원시 토큰과 시맨틱 레이어를 분리해 참조 방향을 고정",
          en: "Split primitive tokens from a semantic layer with a fixed reference direction",
        },
      },
    ],
    achievements: [
      {
        ko: "공용 컴포넌트 20종 배포 — 신규 화면 개발 시간 단축",
        en: "Shipped 20 shared components, cutting new-screen build time",
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

/** 수상 모달 딥링크에서만 조회하며 공개 프로젝트 목록에는 노출하지 않는 fixture. */
const MOCK_DEV_PROJECT_DETAILS: DevProject[] = [
  awardProject({
    id: "aidap",
    title: { ko: "아이답 (AIDAP)", en: "AIDAP" },
    category: { ko: "SSAFY 관통 프로젝트 · 금융", en: "SSAFY Team Project · FinTech" },
    year: "2024",
    period: { ko: "2024. 11. 18. ~ 2024. 11. 26.", en: "Nov 18, 2024 to Nov 26, 2024" },
    summary: {
      ko: "금융상품 비교, 이자 계산, 맞춤 추천과 AI 상담을 제공하는 금융 서비스.",
      en: "A financial service for product comparison, interest calculations, recommendations, and AI consultation.",
    },
    achievement: {
      ko: "SSAFY 12기 1학기 관통 프로젝트 최우수상 수상",
      en: "Won the top award in the SSAFY 12th cohort first-semester final project",
    },
    techTags: ["Vue 3", "Django", "JavaScript"],
    order: 4,
  }),
  awardProject({
    id: "myhero",
    title: { ko: "영웅이", en: "MyHero" },
    category: { ko: "SSAFY 공통 프로젝트 · AIoT", en: "SSAFY Team Project · AIoT" },
    year: "2025",
    period: { ko: "2025. 01. 06. ~ 2025. 02. 21.", en: "Jan 6, 2025 to Feb 21, 2025" },
    summary: {
      ko: "독거노인의 안전과 정서 상태를 살피는 AIoT 실버케어 플랫폼.",
      en: "An AIoT care platform monitoring the safety and emotional well-being of seniors living alone.",
    },
    achievement: {
      ko: "SSAFY 12기 공통 프로젝트 우수상 수상",
      en: "Won an excellence award in the SSAFY 12th cohort common project",
    },
    techTags: ["React", "TypeScript", "AIoT"],
    order: 5,
  }),
  awardProject({
    id: "recipedia",
    title: { ko: "레시피디아", en: "Recipedia" },
    category: {
      ko: "SSAFY 특화 프로젝트 · 생성형 AI",
      en: "SSAFY Team Project · Generative AI",
    },
    year: "2025",
    period: { ko: "2025. 02. 24. ~ 2025. 04. 11.", en: "Feb 24, 2025 to Apr 11, 2025" },
    summary: {
      ko: "냉장고 속 재료와 가족별 취향을 바탕으로 레시피를 만드는 서비스.",
      en: "A smart-fridge service that creates recipes from ingredients and family preferences.",
    },
    achievement: {
      ko: "삼성전자 DA사업부 연계 프로젝트 우수상(2위) 수상",
      en: "Won second place in a project with Samsung Electronics' Digital Appliances Business",
    },
    techTags: ["React", "TypeScript", "TanStack Query", "Zustand"],
    order: 6,
  }),
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
      category: "Workflow · Collaboration",
      items: [
        { name: "Figma", bg: "#f24e1e", fg: "#000000" },
        { name: "Jira", bg: "#0052cc", fg: "#ffffff" },
        { name: "Git", bg: "#f05032", fg: "#000000" },
        { name: "Claude Design", bg: "#d97757", fg: "#000000" },
        { name: "Claude Code", bg: "#d97757", fg: "#000000" },
        { name: "Codex", bg: "#10a37f", fg: "#000000" },
        { name: "Google Antigravity", bg: "#4285f4", fg: "#000000" },
      ],
    },
    {
      category: "AI · Services",
      items: [
        { name: "OpenAI API", bg: "#10a37f", fg: "#000000" },
        { name: "Google Gemini", bg: "#1967d2", fg: "#ffffff" },
        { name: "ElevenLabs", bg: "#1f1f1f", fg: "#ffffff" },
      ],
    },
    {
      category: "Frontend",
      items: [
        { name: "Next.js 16", bg: "#111111", fg: "#ffffff" },
        { name: "React 19", bg: "#61dafb", fg: "#000000" },
        { name: "TypeScript", bg: "#3178c6", fg: "#ffffff" },
        { name: "JavaScript", bg: "#f7df1e", fg: "#000000" },
        { name: "Vue 3", bg: "#42b883", fg: "#000000" },
        { name: "TanStack Query", bg: "#ff4154", fg: "#000000" },
        { name: "Zustand", bg: "#443e38", fg: "#ffffff" },
        { name: "Vite", bg: "#646cff", fg: "#000000" },
        { name: "Electron 35", bg: "#47848f", fg: "#000000" },
        { name: "WebSocket", bg: "#374151", fg: "#ffffff" },
      ],
    },
    {
      category: "UI · Interaction",
      items: [
        { name: "CSS Modules", bg: "#1572b6", fg: "#ffffff" },
        { name: "Tailwind CSS", bg: "#06b6d4", fg: "#000000" },
        { name: "Bootstrap", bg: "#7952b3", fg: "#ffffff" },
        { name: "Motion", bg: "#fff312", fg: "#000000" },
        { name: "GSAP", bg: "#0ae448", fg: "#000000" },
        { name: "Web Audio API", bg: "#9333ea", fg: "#ffffff" },
      ],
    },
    {
      category: "Backend · Data",
      items: [
        { name: "FastAPI", bg: "#009688", fg: "#000000" },
        { name: "Python 3.12", bg: "#3776ab", fg: "#ffffff" },
        { name: "Django", bg: "#092e20", fg: "#ffffff" },
        { name: "SQLAlchemy", bg: "#d71f00", fg: "#ffffff" },
        { name: "PostgreSQL", bg: "#336791", fg: "#ffffff" },
        { name: "pgvector", bg: "#336791", fg: "#ffffff" },
        { name: "Redis", bg: "#dc382d", fg: "#ffffff" },
        { name: "Firebase", bg: "#ffca28", fg: "#000000" },
        { name: "SQLite", bg: "#003b57", fg: "#ffffff" },
      ],
    },
    {
      category: "Testing · Quality",
      items: [
        { name: "Vitest", bg: "#6e9f18", fg: "#000000" },
        { name: "Playwright", bg: "#2e8067", fg: "#ffffff" },
        { name: "Pytest", bg: "#0a9edc", fg: "#000000" },
      ],
    },
    {
      category: "Infra · Deployment",
      items: [
        { name: "Vercel", bg: "#111111", fg: "#ffffff" },
        { name: "Hugging Face Spaces", bg: "#ffd21e", fg: "#000000" },
        { name: "Docker Compose", bg: "#2496ed", fg: "#000000" },
      ],
    },
  ],
  education: [
    {
      period: "2024 — 2025",
      title: {
        ko: "삼성 청년 SW 아카데미(SSAFY) 12기",
        en: "Samsung Software Academy For Youth (SSAFY), 12th Cohort",
      },
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
  awards: [
    {
      id: "recipedia-award",
      year: "2025",
      projectId: "recipedia",
      name: {
        ko: "삼성전자 DA사업부 연계 프로젝트 우수상",
        en: "Samsung Electronics DA Collaboration Project Excellence Award",
      },
      place: { ko: "2위", en: "2nd Place" },
      description: {
        ko: "SSAFY 특화 프로젝트 Recipedia로 수상했습니다.",
        en: "Awarded for Recipedia, a SSAFY specialized project.",
      },
    },
    {
      id: "myhero-award",
      year: "2025",
      projectId: "myhero",
      name: {
        ko: "SSAFY 12기 공통 프로젝트 우수상",
        en: "SSAFY 12th Cohort Common Project Excellence Award",
      },
      place: { ko: "우수상", en: "Excellence Award" },
      description: {
        ko: "AIoT 프로젝트 MyHero로 수상했습니다.",
        en: "Awarded for MyHero, an AIoT project.",
      },
    },
    {
      id: "aidap-award",
      year: "2024",
      projectId: "aidap",
      name: {
        ko: "SSAFY 12기 1학기 관통 프로젝트 최우수상",
        en: "SSAFY 12th Cohort First-Semester Final Project Top Award",
      },
      place: { ko: "최우수상", en: "Top Award" },
      description: {
        ko: "핀테크 프로젝트 AIDAP으로 수상했습니다.",
        en: "Awarded for AIDAP, a fintech project.",
      },
    },
  ],
};

export { MOCK_DEV_PROJECTS, MOCK_DEV_PROJECT_DETAILS, MOCK_DEV_CONFIG };
