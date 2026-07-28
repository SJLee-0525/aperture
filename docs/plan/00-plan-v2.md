# Sungjoon Lee. 통합 포트폴리오 마스터 플랜 (v2)

> 사진 포트폴리오 `Aperture.`(v1, [`00-plan.md`](00-plan.md) — P1·P2 대부분 완료)를 **이성준 개인 통합 포트폴리오 `Sungjoon Lee.`** 로 확장하는 로드맵.
> 결정의 배경·원칙은 [`CLAUDE.md`](../../CLAUDE.md), 디자인은 [`design/README.md`](../../design/README.md)(→ `design/ver_2/`),
> 데이터·Rules 상세는 [`firebase` agent](../../.claude/agents/firebase.md), UI 규칙은 [`frontend` agent](../../.claude/agents/frontend.md)(§13–15).
> 이 문서는 **무엇을 어떤 순서로 만드는가**에 집중한다.

---

## 0. 현재 상태 & 목표

- **현재**: 사진 포트폴리오 `Aperture.` 완성 — 작업/앨범/지도(클러스터링)/소개 + 상세 모달 + 관리자 CMS + Firebase(Auth·Firestore·Storage) + 익명 좋아요. `/`·`/albums`·`/map`·`/about`·`/admin/*` 라우트.
- **목표**: 하나의 셸(mega-menu + 랜딩 허브) 아래 **3섹션**으로 확장.
  - **사진** `/photo/*` — 기존 구현 계승(서브브랜드 `Aperture.`), 액센트 **블루**.
  - **음악** `/music/*` — 피아니스트: 연주 목록(`/music`)·공연 일정·수상·영상 **개별 페이지**(사진 섹션처럼). **히어로·연락처 없음**. 액센트 **레드**.
  - **개발** `/dev/*` — 프론트엔드: 기술 스택(`/dev`)·프로젝트·경력 **개별 페이지**. **소개 없음**. 액센트 **그린**.
  - 랜딩(`/`)은 이름(항상 "Sungjoon Lee") + **역할 타이핑**(Photographer/Pianist/Developer). 타이핑 효과는 여기로 모음(음악 히어로에서 이동).
  - **랜딩** `/` — 이름·태그라인 + 3섹션 진입 허브.

### 확정 결정 (사용자, 2026-07-03)

1. **콘텐츠 관리 = 전 섹션 CMS 통일** — 음악·개발도 Firestore 컬렉션 + 관리자 CMS + Security Rules(사진과 동일 패턴).
2. **이중언어 = 전 섹션 ko/en** — 음악·개발 콘텐츠도 `{ko,en}`. 디자인 원본은 ko-only → **en 번역 채움 필요**.
3. **라우팅 = 랜딩 `/` + 사진 `/photo/*`** — 기존 사진 URL(`/albums`·`/map`·`/about`)은 `/photo/*` 로 **redirect** 보존.

---

## 1. 작업 순서 원칙

1. **셸 → 데이터 → 공개 뷰 → 관리자 CMS** 순으로 섹션마다 쌓는다. 셸(Phase A)이 먼저 서야 음악·개발이 붙을 자리가 생긴다.
2. **사진 섹션은 라우트만 옮기고 로직은 무변경.** `/photo/*` 이동은 순수 리팩터 — 기능/디자인 회귀 0.
3. **`lib/content/get-*` getter 뒤에 데이터 소스를 숨긴다** — mock ↔ Firestore REST 교체점. 신규 getter도 `Promise` + published 필터 + `order` 정렬 완료 상태로 반환.
4. **각 슬라이스는 반응형·다크·ko/en 3종을 항상 함께** 마감.
5. **매 슬라이스 종료 시 `npm run build` + `npm run lint` 통과** 유지 (hook 컨벤션 경고 0). Rules 변경 시 **Emulator 테스트 후 배포**.
6. 커밋은 `feature/*` 브랜치 + `[TYPE] 한글제목`, 슬라이스 단위.
7. **디자인 단일 출처 = `design/ver_2/`.** 임의 변경 금지(문서화된 의도적 이탈 제외). 섹션 색은 `--accent`(=`[data-section]`)만 참조.

---

## 2. Phase A — 셸 & 랜딩 (라우트 재구성 + 통합 네비)

### Slice A0 — 타입 · 상수 · 라우트 골격

- `types/`: `music.ts`(MusicWork·MusicSchedule·MusicAward·MusicMedia), `dev.ts`(DevProject·DevConfig), `site.ts` 확장(tagline·landingLead·MusicConfig·DevConfig).
- `constants/`: `sections.ts`(SECTIONS + 액센트 메타), `navigation.ts` → **mega-menu 구조**(사진/음악/개발 + 하위 링크), `routes.ts`(PHOTO_WORK/ALBUMS/MAP/ABOUT·MUSIC·DEV·ADMIN_MUSIC__·ADMIN_DEV__), `collections.ts`(musicWorks·musicSchedule·musicAwards·musicMedia·devProjects + site 문서 id), `dictionary.ts`(섹션·네비 라벨 추가).
- `next.config.ts` **redirects**: `/albums→/photo/albums`, `/map→/photo/map`, `/about→/photo/about`.
- **완료**: 타입·상수 컴파일 통과, redirect 규칙 등록.

### Slice A1 — 사진 라우트 이동 (`/` → `/photo/*`)

- `(public)/(home)` → `(public)/photo/page.tsx`. `(public)/albums|map|about` → `(public)/photo/albums|map|about` (loading 파일 동반 이동).
- 내부 링크·`router.push`·`?photo=` 딥링크를 `ROUTES` 상수 경유로 정리(하드코딩 경로 전수 점검).
- **완료**: 사진 전 기능이 `/photo/*` 에서 **동일 동작**, old URL redirect 확인, `/design-check` 회귀 없음.

### Slice A2 — SiteHeader mega-menu 재작성

- `site-header/SiteHeader`: 워드마크 `Sungjoon Lee.` + **mega-menu**(사진/음악/개발 + hover 드롭다운) + spacer + **SearchBox(사진 한정, 우측)** + LangMenu + ThemeToggleButton + 모바일 burger. **`.avatar` 제거**(의도적 이탈 #5).
- `MobileTabBar`/`MobileMenuOverlay`: **섹션별 탭 세트** + 버거 아코디언(사진/음악/개발 + 검색).
- `site-header/SectionAccent`(client): pathname → `document.documentElement.dataset.section`(`home`/`photo`/`music`/`dev`). `(public)/layout.tsx` 마운트.
- `globals.css`: `design/ver_2/styles/site.css` 의 `html[data-section]` 액센트 규칙 이식. mega-menu·랜딩 스타일은 컴포넌트 `.module.css`.
- **완료**: 데스크톱 드롭다운, 검색 사진 한정·우측, 섹션 전환 시 `--accent` 색 변화, 모바일 탭/메뉴 3섹션, `[data-section]` no-flash(초기 flash 없음 — §11 리스크).

### Slice A3 — 랜딩 허브 (`/`)

- `features/landing/LandingView`: 이름·태그라인(Photographer · Pianist · Developer)·소개(`landingLead`) + 사진/음악/개발 진입 행 + **reveal-on-scroll**. 데이터 = `getSite()`.
- `(public)/page.tsx` = `<LandingView site={...}/>`, `revalidate`.
- **완료**: `/` 랜딩, 개발 행 클릭 → 프로젝트(`/dev/projects`)로 바로 이동, 사진·음악 행 클릭 → 각 섹션 루트로 이동, reveal 애니(reduced-motion 대응), 반응형·다크.

**완료기준(MA)**: Slice A0–A3 → 통합 셸 위에서 사진 섹션이 `/photo/*`, 랜딩이 `/`, 음악·개발은 placeholder 라우트로 진입 가능.

---

## 3. Phase B — 음악 섹션 (`/music`)

### Slice B0 — 데이터 계층 (firebase agent 협업)

- `mocks/music.ts`: `design/ver_2/music.js`(WORKS·SCHEDULE·AWARDS·VIDEOS) 이식 + **en 번역 placeholder**(우선 ko, en 폴백).
- `lib/content/`: `get-music-works.ts`·`get-music-schedule.ts`·`get-music-awards.ts`·`get-music-media.ts`·`get-music-config.ts`(site/music) — mock↔REST.
- `lib/firebase/firestore-rest.ts`: `restToMusicWork` 등 매핑 추가. `firestore.ts`: 관리자 write 래퍼.
- **Rules**: `musicWorks·musicSchedule·musicAwards·musicMedia` (read=published·write=admin, **무인증 쓰기 없음**). `firestore.indexes.json` **인덱스 4개**(published+order). **Emulator 테스트**(무인증 write 거부 포함) 통과 후 배포.
- **완료**: getter가 mock/실데이터 반환, Rules·인덱스 배포, 좋아요 예외가 photos에만 있음 확인.

### Slice B1 — 공개 음악 뷰 (개별 페이지 4개) ✅

- **사진 섹션처럼 개별 페이지**: `/music`(연주 목록)·`/music/schedule`·`/music/awards`·`/music/media`. 히어로·연락처 없음(타이핑은 랜딩으로 이동). 네비는 mega-menu + 모바일 탭.
- 뷰: `MusicWorksView`(포스터 그리드)·`MusicScheduleView`(상태 배지 onSale/soon)·`MusicAwardsView`·`MusicMediaView`(YouTube facade). 각 페이지 `.main`+`.title`(사진 뷰 패턴), 빈 상태 = `comingSoon`.
- 페이지: `(public)/music/{page,schedule,awards,media}/page.tsx` = 해당 getter + 뷰, `revalidate`.
- **B1-b(남음)**: 연주/수상 **모달** + `?work=` 딥링크 + 영상 **YouTube iframe**(facade 클릭 재생).
- 참고: `use-typing` 은 `hooks/`로 승격(랜딩·개발 공유). `MusicConfig`(히어로·연락처용)는 현재 미사용 — 정리 후보.

### Slice B2 — 음악 관리자 CMS

- `admin/music/works|schedule|awards|media|config` + `features/admin-music-*/`(_Form + use-_-admin + **dnd 정렬**). 포스터 업로드(**EXIF 없이** 압축→Storage `music/{id}/`). `LocalizedTextField`·`ImageUploader` 재사용, 새 색 금지.
- **완료**: 관리자가 연주·일정·수상·영상·설정 CRUD + 드래그 정렬 → 공개 페이지 반영.

**완료기준(MB)**: Slice B0–B2 → 음악 섹션 공개+관리 완결.

---

## 4. Phase C — 개발 섹션 (`/dev`)

### Slice C0 — 데이터 계층

- `mocks/dev.ts`: `design/ver_2/dev.js`(STACK·QA·PROJECTS·TIMELINE) 이식 + en 번역 placeholder. 콘텐츠 원본은 `github.com/SJLee-0525/portfolio`.
- `lib/content/`: `get-dev-projects.ts` + `get-dev-config.ts`(site/dev — interview·stack·timeline·links). REST 매핑.
- **Rules**: `devProjects`(read=published·write=admin). 인덱스 **1개**. Emulator 통과 후 배포.
- **완료**: getter 반환, Rules·인덱스 배포.

### Slice C1 — 공개 DevView

- **음악처럼 개별 페이지**(사용자 확정): 기술 스택(`/dev`)·프로젝트(`/dev/projects`)·경력(`/dev/career`). **소개(인터뷰) 없음**. 네비는 mega-menu + 모바일 탭(이미 3개로 정리됨).
- 뷰: `DevStackView`(카테고리 칩)·`DevProjectsView`(카드)·`DevCareerView`(타임라인). `.main`+`.title` 패턴. reveal-on-scroll(`use-reveal`)·프로젝트 모달(`?project=`)은 선택.
- components: `ProjectCard`, `StackGroup`, `TimelineRow`.
- `(public)/dev/{page,projects,career}/page.tsx`: 해당 getter + 뷰, `revalidate`. (GSAP·Zustand 미도입 — `motion`/IntersectionObserver로 재현.)

### Slice C2 — 개발 관리자 CMS

- `admin/dev/projects|config` + `features/admin-dev-*/`. 프로젝트 폼(썸네일 업로드·roles/troubleshooting 배열 편집·links·techTags). config 폼(interview·stack·timeline·소개). dnd 정렬.
- **완료**: 관리자 CRUD + 정렬 → 반영.

**완료기준(MC)**: Slice C0–C2 → 개발 섹션 공개+관리 완결.

---

## 5. Phase D — 마감 & 배포

- **ko/en 번역 채움**: 음악·개발 콘텐츠 en(관리자 폼 또는 mock). pickText 폴백으로 미완성도 안 깨지나 실제 품질은 수동 확인.
- **SEO/OG**: 섹션별 `metadata`(title·description·og), `sitemap`(`/`·`/photo`·`/music`·`/dev`·`/photo/albums/[id]`), `robots`.
- **점검**: 전 섹션 반응형(~390px)·다크·접근성(포커스 트랩·aria·키보드), `/design-check` 전 화면, `/deploy-check` 통과.
- **배포**: Vercel. Rules·인덱스 최종 배포. GCP 예산 알림 $1 유지.

**완료기준(MD)**: 통합 포트폴리오 배포, 3섹션 CMS 실동작.

---

## 6. 데이터 모델 요약 (신규)

> 상세는 [`CLAUDE.md`](../../CLAUDE.md) §데이터 모델 · [`firebase` agent](../../.claude/agents/firebase.md).

- **음악**: `musicWorks` · `musicSchedule` · `musicAwards` · `musicMedia` + `site/music`.
- **개발**: `devProjects` + `site/dev`.
- **전역/사진 config 확장**: `site/config` 에 `tagline{ko,en}` · `landingLead{ko,en}` 추가.
- **공통**: 리스트 컬렉션은 `order`·`published`·`createdAt`·`updatedAt`. 서술 필드만 `{ko,en}`, 곡명·techTags·URL은 평면.
- **인덱스**: 컬렉션당 `published+order` 1개 → **총 7개**(photos·albums·musicWorks·musicSchedule·musicAwards·musicMedia·devProjects).
- **Rules**: 신규 전 컬렉션 `read=published || admin` · `write=admin`. **좋아요 +1 무인증 예외는 photos 전용** — 음악·개발 복붙 금지.
- **이미지**: `music/{id}/`·`dev/{id}/` 경로. Storage Rules(image/*·10MB·관리자)는 전 경로 공통이라 추가 규칙 불필요. **EXIF 추출은 사진만.**

---

## 7. 의존성 추가 시점

| 시점   | 패키지                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------ |
| A~D    | **신규 없음** — `motion`(이미 사용, 랜딩·개발 reveal/타이핑) + 기존 스택(next/image·CSS Modules) |
| 관리자 | 기존 `@dnd-kit/*`·`browser-image-compression` 재사용 (음악 포스터·개발 썸네일 업로드)            |
| P3     | `@huggingface/transformers`(AI 태그 — 사진 전용, 선택)                                           |

> 개발 섹션은 원본이 GSAP/Zustand지만 **도입하지 않는다**(frontend §7). 인터랙션만 CSS/`motion`으로 재현.

## 8. 관리자(본인) 셋업 — 코드와 별개

- **Firestore**: 신규 컬렉션은 스키마리스 — 관리자 CMS로 문서 생성하면 됨. **인덱스만 `firebase deploy --only firestore:indexes`** 선반영.
- **콘텐츠**: 음악(연주·일정·수상·영상), 개발(프로젝트·스택·경력·인터뷰) 실데이터 입력 + **en 번역**. 초기엔 mock으로 화면 확인 후 이관.
- **결제 표면은 여전히 Firebase 하나** (지도 CARTO 무료). 예산 알림 $1 유지.

## 9. 마일스톤

| #   | 내용                                         | Phase | 완료 기준                                 |
| --- | -------------------------------------------- | ----- | ----------------------------------------- |
| MA  | 셸(mega-menu)·랜딩·사진 `/photo/*` 이동      | A     | 3섹션 진입 셸 + 사진 회귀 0 + 액센트 전환 |
| MB  | 음악 섹션 (공개 + 관리자 CMS + Rules·인덱스) | B     | 연주·일정·수상·영상 CRUD → 공개 반영      |
| MC  | 개발 섹션 (공개 + 관리자 CMS + Rules·인덱스) | C     | 프로젝트·스택·경력 CRUD → 공개 반영       |
| MD  | ko/en·SEO·접근성 마감 + 배포                 | D     | `/design-check`·`/deploy-check` 통과·배포 |

## 10. 리스크 & 열린 질문

- **라우트 이동 회귀** — `?photo=` 딥링크·내부 링크·redirect 누락 위험. `ROUTES` 상수 경유 + old URL redirect + 전수 점검으로 흡수. **Slice A1을 순수 리팩터로 격리**(기능 변경 동반 금지).
- **`[data-section]` 초기 flash** — SSR 시 섹션 미상 → 첫 페인트에 잘못된 액센트 가능. pathname은 서버에서 알 수 있으므로 `(public)/layout.tsx`에서 `<html data-section>`(또는 route-group별 wrapper)로 서버 세팅 검토. 안 되면 no-flash 스크립트에 section 추가.
- **음악·개발 = 개별 페이지**(사진처럼) — 각 요소가 별도 URL이라 SEO·딥링크 유리. 각 페이지 h1·메타 충실히. (단일 스크롤 계획에서 변경됨.)
- **en 번역 부채** — pickText 폴백으로 안 깨지지만 en 품질은 수동. Phase D에서 일괄 채움.
- **Firestore 읽기** — 공개 페이지 3개 증가하지만 ISR 캐싱으로 5만/일 여유. 좋아요 외 쓰기는 관리자만.
- **콘텐츠 실재성** — 음악(공연 이력)·개발(프로젝트) 데이터는 본인 실제 이력으로 교체 필요(mock은 디자인 예시).

---

> 세부 슬라이스가 커지면 `docs/plan/01-*.md`(음악), `02-*.md`(개발) 등으로 분할 기록.
