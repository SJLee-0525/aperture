# Sungjoon Lee.

사진, 음악, 소프트웨어 개발 작업을 한곳에서 소개하는 [이성준](https://github.com/SJLee-0525)의 개인 포트폴리오입니다.

[sungjoon.works에서 포트폴리오 보기](https://sungjoon.works)

<a href="https://sungjoon.works">
  <picture>
    <source media="(max-width: 640px)" srcset="./public/readme/landing-mobile.webp">
    <img src="./public/readme/landing-desktop.webp" alt="Sungjoon Lee 포트폴리오 랜딩 화면" width="960">
  </picture>
</a>

> 이 저장소는 포트폴리오의 제작 과정과 구현 결과를 공개하기 위한 저장소이며, 오픈소스 프로젝트가 아닙니다. 코드, 디자인, 문서, 이미지와 미디어의 재사용 권한은 부여되지 않습니다. 자세한 내용은 [LICENSE](./LICENSE)와 [NOTICE](./NOTICE)를 확인해 주세요.

## 주요 기능

- Photo, Music, Dev 세 영역을 연결하는 한국어·영어 포트폴리오
- 사진·앨범·촬영 지도와 연주·경력·수상·영상 아카이브
- 기술 스택·프로젝트·개발 경력과 코드 하이라이트·목차·태그 필터를 갖춘 Markdown 블로그
- 공개 콘텐츠를 관리하는 개인용 Supabase CMS
- 일반 검색, 현재 화면 문맥과 포트폴리오 RAG를 연결한 챗봇
- 외부 브라우저 에이전트용 WebMCP 도구 15종과 선언형 연락 폼
- Sentry 오류 알림을 LLM으로 판정해 Discord 카드로 보내는 트리아지 파이프라인
- Dependabot alert를 LLM으로 분석해 Discord에 보내는 주간 의존성 보안 리포트
- CrUX와 Lighthouse로 공개 URL 12개의 성능 회귀를 확인하고 AI 분석을 붙여 보내는 Discord 알림
- 브라우저 언어와 명시적 선택을 반영하는 한국어·영어 최초 진입
- 선택 전에는 Google tag를 로드하지 않는 분석 동의와 개인정보 설정
- 개인정보처리방침, 사이트 이용 및 콘텐츠 정책, 접근성 안내
- 라이트·다크 테마, 화면 크기에 맞춘 내비게이션과 접근성 검사

## 주요 경로

| 영역    | 경로                                   | 내용                                                |
| ------- | -------------------------------------- | --------------------------------------------------- |
| Entry   | `/`                                    | 쿠키·브라우저 언어에 따라 `/ko` 또는 `/en`으로 이동 |
| Landing | `/ko`, `/en`                           | Photo, Music, Dev로 이어지는 허브                   |
| Photo   | `/photo`                               | 사진, 앨범, 지도와 촬영 정보                        |
| Music   | `/music`                               | 연주, 음악 경력과 영상                              |
| Dev     | `/dev`, `/dev/projects`                | 개발자 소개, 프로젝트와 상세 기록                   |
| Blog    | `/dev/articles`                        | 개발 블로그 목록과 글 본문                          |
| Search  | `/search`                              | 전체 공개 콘텐츠 검색                               |
| Legal   | `/privacy`, `/terms`, `/accessibility` | 개인정보·이용 정책과 접근성 안내                    |
| Admin   | `/admin`                               | 개인용 콘텐츠 관리                                  |

언어가 포함된 실제 공개 URL은 `/ko/photo`, `/en/dev/projects`처럼 구성됩니다.

## 설계 특징

- 공개 포트폴리오와 관리자 한 명을 위한 Admin CMS를 분리했습니다.
- 한국어와 영어 콘텐츠를 같은 데이터 구조에서 관리합니다.
- 공개 페이지는 [`src/lib/content`](./src/lib/content)의 getter만 사용하므로 mock과 Supabase를 교체할 수 있습니다.
- 공개 데이터는 PostgREST로 읽고, 관리자 기능은 supabase-js로 인증·저장합니다. 접근 제어는 Postgres RLS가 담당합니다.
- Supabase DB와 `media` Storage는 매주 age로 암호화해 Backblaze B2에 보관합니다. 백업은 빈 프로젝트에 실제 복원해 Auth, RLS, RPC와 Storage까지 검증했습니다.
- 일반 검색은 브라우저에서 동작하고, 블로그 본문 일치만 서버에서 대조해 스니펫으로 보여 줍니다. 챗봇은 열린 사진·연주·수상·프로젝트를 공개 ID로 직접 조회하고, 범위가 넓은 질문에는 RAG 검색을 더합니다. 챗봇 요청은 IP당 분당 10회, 전역 일일 1,000회로 제한합니다.
- 내장 챗봇은 WebMCP를 사용하지 않습니다. WebMCP는 방문자가 데려온 외부 브라우저 에이전트가 공개 콘텐츠를 조회하고 현재 화면을 조작할 때만 사용합니다.
- Dependabot은 알려진 취약점을 계속 감시하고, PR의 Dependency Review는 새 High 이상 runtime 취약점이 `main`에 들어오는 것을 막습니다. 매주 월요일에는 열린 alert를 OpenAI 또는 Gemini가 분석해 Discord로 보냅니다.
- 의존 방향을 `app → features → components`로 제한해 라우팅, 사용자 행동, 공용 UI의 역할을 나눴습니다.

공개 페이지의 읽기 경로와 Admin의 쓰기 경로는 분리되어 있습니다. 외부 서비스까지 포함한 구성은 [프로젝트 아키텍처](./public/readme/architecture.md)에 정리했습니다.

## 기술 구성

- Next.js 16, React 19, TypeScript
- Supabase Auth, Postgres(pgvector), Storage
- MapLibre GL
- OpenAI 또는 Gemini 기반 채팅
- OpenAI 임베딩을 사용하는 포트폴리오 RAG 검색
- mdast 기반 Markdown 파싱과 서버 전용 Shiki 코드 하이라이트
- Sentry 오류 모니터링과 LLM 기반 오류 트리아지 알림
- Dependabot, Dependency Review와 LLM 기반 의존성 보안 리포트
- Chrome UX Report, Lighthouse CI와 LLM 기반 Core Web Vitals 알림
- Vitest, Playwright, Storybook, Lighthouse CI

## 프로젝트 구조

라우팅, 도메인 기능, 공용 UI와 데이터 접근 계층을 분리했습니다.

```text
src/
├── app/          라우트 · 레이아웃 · API
├── features/     도메인 UI와 사용자 행동
├── components/   props 기반 공용 UI
├── lib/          콘텐츠 · Supabase · AI · 검색
├── mocks/        로컬 개발과 E2E 데이터
└── types/        도메인과 API 타입

design/           디자인 프로토타입과 제작 기록
docs/             ADR과 운영 문서
e2e/              공개 흐름 · 접근성 · 시각 회귀
test/             Supabase RLS 통합 테스트
```

주요 폴더: [`app`](./src/app) · [`features`](./src/features) · [`components`](./src/components) · [`lib`](./src/lib) · [`design`](./design/) · [`docs`](./docs/)

<details>
<summary><strong>세부 구조 펼쳐보기</strong></summary>

<br>

```text
src/
├── app/
│   ├── layout.tsx                 # 전역 셸: 폰트, 테마 초기화, 언어·모션 Provider
│   ├── .well-known/security.txt/  # 보안 취약점 제보 연락처
│   ├── [lang]/                    # ko·en 경로 기반 다국어 공개 트리
│   │   ├── layout.tsx             # 정적 언어 경로 생성, DocumentLang 동기화
│   │   └── (public)/
│   │       ├── layout.tsx         # 공개 셸: 내비게이션, 챗봇, 분석 동의 경계
│   │       ├── page.tsx           # 랜딩: <LandingView/>
│   │       ├── photo/
│   │       │   ├── (work)/page.tsx       # 사진 그리드·필터, ?photo= 상세 모달
│   │       │   ├── albums/page.tsx       # 앨범 목록
│   │       │   ├── albums/[id]/page.tsx  # 앨범 상세
│   │       │   ├── map/page.tsx          # 촬영 위치와 MapLibre 지도
│   │       │   └── about/page.tsx        # 사진가 소개와 통계
│   │       ├── music/
│   │       │   ├── page.tsx       # 연주 목록, ?work= 상세 모달
│   │       │   ├── career/page.tsx # 학력·경력·수상
│   │       │   ├── media/page.tsx  # YouTube 연주 영상
│   │       │   └── about/page.tsx  # 피아니스트 소개
│   │       ├── dev/
│   │       │   ├── page.tsx       # 개발자 소개
│   │       │   ├── career/page.tsx # 개발 경력과 기술 스택
│   │       │   ├── projects/page.tsx # 프로젝트 목록, ?project= 상세 모달
│   │       │   ├── articles/page.tsx # 블로그 목록, 태그 필터와 페이지 이동
│   │       │   └── articles/[slug]/page.tsx # 블로그 본문, 목차와 연관 프로젝트
│   │       ├── search/page.tsx     # 공개 콘텐츠 통합 검색
│   │       ├── contact/page.tsx    # 문의 폼과 외부 연락 링크
│   │       └── privacy/ · terms/ · accessibility/ # 공용 legal 문서 화면
│   ├── admin/
│   │   ├── layout.tsx             # noindex 관리자 레이아웃
│   │   ├── _components/
│   │   │   └── AdminLayoutClient.tsx # AuthGuard, AdminChrome, RAG 상태 알림
│   │   ├── login/page.tsx
│   │   ├── photos/ · albums/ · tags/ · site/ # 사진·앨범·태그·사이트 CMS
│   │   ├── music/                  # works · awards · media · config
│   │   ├── dev/                    # projects · articles · config
│   │   └── maintenance/            # 임베딩·이미지 마이그레이션, 미참조 블로그 이미지 정리
│   └── api/
│       ├── chat/route.ts           # 스트리밍 포트폴리오 챗봇
│       ├── search-index/route.ts   # 공개 검색 문서
│       ├── photos/[id]/route.ts    # 사진 상세 on-demand 조회
│       ├── photo-map/[id]/route.ts # 지도 사진 상세 조회
│       ├── dev-projects/[id]/route.ts # 개발 프로젝트 상세 조회
│       ├── sentry-alert/route.ts   # Sentry 알림 웹훅, 서명 검증과 트리아지 위임
│       └── admin/                  # 이미지 원본·포트폴리오 임베딩 관리
├── features/                       # 도메인 UI와 사용자 행동
│   # 각 feature 내부: _components/ · _hooks/ · _lib/ · _types/
│   ├── landing/                    # 워드마크 애니메이션과 3개 섹션 진입
│   ├── gallery/                    # 사진 필터, 무한 스크롤, 갤러리
│   ├── photo-detail/               # 사진 모달, EXIF, 미니맵, 상세 캐시
│   ├── albums/ · map/ · about/     # 사진 앨범, 지도, 소개 화면
│   ├── music/                      # 연주·경력·영상·소개 화면
│   ├── dev/                        # 소개·경력·프로젝트 화면
│   ├── dev-blog/                   # Markdown 파싱·목차·코드 하이라이트와 블로그 본문
│   ├── search/ · chat/ · contact/  # 검색, RAG 챗봇, 문의
│   ├── analytics/ · legal/          # 분석 동의·GA 로딩 경계와 정책 문서
│   ├── site-header/ · site-footer/ # 데스크톱 mega-menu와 모바일 내비게이션
│   ├── lang/ · theme/ · motion/    # 언어, 테마, 애니메이션 상태
│   ├── auth/ · image-upload/       # 관리자 인증과 이미지 처리
│   ├── sentry-triage/              # Sentry 웹훅 정규화, LLM 판정과 Discord 카드
│   ├── admin-dev-articles/         # 블로그 작성·미리보기·발행 조건과 로컬 복구본
│   └── admin-*/                    # 도메인별 CMS 목록·폼·정렬·저장 로직
├── components/                     # props 기반 공용 UI
│   ├── Modal · PhotoTile · PhotoGrid · AlbumCard
│   ├── ImageCarousel · ImageLightbox · ExifStrip
│   ├── Chip · Select · RangeSlider · ViewToggle
│   └── icons/                      # 소셜·서비스 SVG 아이콘
├── lib/
│   ├── content/                    # 공개 getter, mock↔Supabase 전환 경계
│   ├── supabase/
│   │   ├── public/                 # 공개 PostgREST 읽기
│   │   ├── admin/                  # 행 인코딩, 정렬 RPC, 세션 가드
│   │   └── *.ts                    # supabase-js 클라이언트, CRUD, Storage, 인증, RAG
│   ├── ai/                         # RAG 청크·검색·임베딩
│   ├── dependency-security/        # Dependabot alert 정규화, LLM 분석과 Discord 리포트
│   ├── performance-alerts/         # CrUX·Lighthouse 판정, snapshot 이력과 AI 성능 알림
│   ├── search/                     # 일반 검색 점수와 추천
│   ├── seo/ · metadata/            # canonical, hreflang, 공유 메타데이터
│   └── i18n/ · security/ · cache/  # 다국어 유틸, URL 검증, 재검증
├── mocks/                          # 로컬 개발·E2E용 Photo·Music·Dev 데이터
├── types/                          # 도메인과 API TypeScript 타입
├── constants/                      # 라우트, 내비게이션, 컬렉션, 보안 설정
└── assets/fonts/                   # Newsreader·Spline Sans Mono와 OFL

src/proxy.ts                        # 루트의 쿠키·Accept-Language 기반 307

design/                             # 디자인 프로토타입, export, 제작 기록
docs/                               # ADR, 운영·테스트 문서, 프로젝트 설명
e2e/                                # Playwright 공개 흐름·접근성·시각 회귀
test/                               # 로컬 Supabase RLS 통합 테스트
```

</details>

## 챗봇 RAG 구조

<a href="./public/readme/chatbot-rag.md">
  <picture>
    <img src="./public/readme/chatbot-flowchart.webp" alt="화면 문맥과 RAG를 포함한 챗봇 처리 흐름도" width="720">
  </picture>
</a>

챗봇은 질문을 보낸 순간 열려 있던 사진·연주·수상·프로젝트·블로그 글을 공개 ID로 직접 조회합니다. 열린 블로그 글은 본문 전체를 문맥으로 함께 읽습니다. 사용자 메시지에는 함께 보낸 항목과 당시 URL을 기록해 원래 화면으로 돌아갈 수 있습니다. 더 넓은 포트폴리오 문맥이 필요하면 코사인 유사도와 키워드 점수를 결합한 RAG 검색으로 관련 청크를 찾습니다.

벡터는 Postgres(pgvector)에 저장하고 질문마다 벡터 검색 한 번으로 후보를 조회하므로 콘텐츠 변경이 다음 질문에 바로 반영됩니다. 콘텐츠가 바뀌면 해당 원본의 청크만 다시 생성합니다. 모델이 반환한 링크, 사진 필터, 참조 ID와 연락 초안은 서버 검증을 통과한 것만 UI에 전달합니다. 구조화 응답이 일부만 복구되면 본문만 사용합니다.

일반 `/search`는 이 흐름을 사용하지 않습니다. 공개 콘텐츠를 브라우저에서 바로 검색하고 블로그 본문 일치만 서버에서 대조하므로, 임베딩이나 채팅 모델 호출 비용이 들지 않습니다. 자세한 동작은 [챗봇과 RAG](./public/readme/chatbot-rag.md)에 정리했습니다.

## 로컬 실행

Node.js 20.9 이상과 npm이 필요합니다. CI와 `.nvmrc`는 Node.js 22를 사용합니다.

`nvm`을 사용한다면 먼저 `nvm use`를 실행합니다.

```bash
npm ci
npm run dev
```

`http://localhost:3000`에서 공개 포트폴리오를 확인할 수 있습니다. 기본 개발 모드는 환경변수나
외부 계정 없이 mock 콘텐츠를 사용합니다.

관리자 화면까지 mock으로 둘러보려면 `.env.example`을 `.env.local`로 복사하고 다음 두 값만
활성화합니다. 인증 우회는 개발 서버에서만 허용되며 프로덕션 빌드는 이 설정을 거부합니다.

```dotenv
NEXT_PUBLIC_USE_MOCK=1
NEXT_PUBLIC_ADMIN_TEST_SESSION=1
```

실제 Supabase 데이터를 확인할 때는 `.env.local`에 URL과 publishable key를 넣고
`NEXT_PUBLIC_USE_MOCK=0`으로 설정합니다. 전체 환경변수와 보안 주의사항은
[.env.example](./.env.example)에 정리되어 있습니다.

`npm run build`는 실제 배포 설정을 검사하는 명령입니다. Supabase 환경변수 없이 mock 기반
프로덕션 빌드와 공개 흐름을 확인하려면 `npm run test:e2e`를 사용합니다. 처음 실행하기 전에는
Playwright의 Chromium을 한 번 설치해야 합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

### 주요 명령어

```bash
npm run dev             # 개발 서버
npm run build           # 프로덕션 빌드
npm run lint            # ESLint
npm run check           # Next.js 타입 생성 및 TypeScript 검사
npm test                # Vitest 단위 테스트
npm run test:e2e        # Playwright E2E — 프로덕션 빌드 + 시각 회귀
npm run test:e2e:admin  # 관리자 E2E — dev 서버 (프로덕션 빌드는 인증 우회를 금지한다)
npm run test:visual     # 핵심 공개 화면의 데스크톱·모바일 시각 회귀
npm run test:chat-eval  # mock 챗봇 응답·RAG·참조 평가
npm run test:chat-eval:live # 실제 제공자 응답 품질·지연 평가
npm run test:coverage   # 커버리지 검사
npm run test:rules      # 로컬 Supabase의 RLS·RPC·Storage 권한 통합 테스트
npm run security:report # 열린 Dependabot alert를 분석해 Discord로 전송
npm run test:lighthouse:production # 운영 URL 12개를 모바일 Lighthouse로 각 3회 측정
npm run performance:report # CrUX·Lighthouse 결과를 판정하고 Discord와 snapshot에 기록
npm run deps:check      # 의존 방향과 순환 의존성 검사
npm run knip            # 미사용 파일·export·의존성 검사
npm run storybook       # 컴포넌트 Storybook
```

## 품질 검증

TypeScript와 ESLint 외에도 순환 의존성, 미사용 코드와 코드 중복을 정적 분석합니다. Vitest는 데이터 변환과 공용 로직을, Playwright는 데스크톱·모바일의 공개 탐색 흐름과 접근성을 검증합니다. 시각 회귀, Lighthouse CI와 로컬 Supabase RLS 통합 테스트도 별도로 구성했습니다.

도구별 검사 범위와 명령은 [테스트 전략](./public/readme/testing.md)에서 확인할 수 있습니다. RLS 통합 테스트에는 Docker와 Supabase CLI가 필요합니다.

## 관련 문서

| 문서                                                 | 내용                                  |
| ---------------------------------------------------- | ------------------------------------- |
| [프로젝트 아키텍처](./public/readme/architecture.md) | 공개 사이트, CMS와 데이터 계층        |
| [챗봇과 RAG](./public/readme/chatbot-rag.md)         | 화면 문맥, RAG 검색, 폴백과 응답 검증 |
| [디자인과 구현](./public/readme/design.md)           | 디자인 방향, 반응형 구조와 제작 과정  |
| [테스트 전략](./public/readme/testing.md)            | 정적 분석·단위·E2E·시각 회귀 테스트   |

구현 결정과 운영 절차는 아래 문서에서 이어서 볼 수 있습니다.

| 문서                                                                                      | 내용                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [도메인 컨텍스트](./CONTEXT.md)                                                           | 공개 영역, 아키텍처 경계와 E2E 계약             |
| [언어 진입·동의 운영 문서](./docs/plan/03-browser-language-entry-routing.md)              | 위험 분석, 테스트 사례, 배포와 트러블슈팅       |
| [WebMCP 에이전트 도구](./docs/plan/04-webmcp-agent-tools.md)                              | 브라우저 에이전트용 도구 설계, 보안과 평가      |
| [WebMCP 도구 평가 기록](./docs/troubleshooting/webmcp-tool-eval.md)                       | 명령형 도구와 선언형 연락 폼 평가               |
| [챗봇 화면 문맥 인식 계획](./docs/plan/06-chat-screen-context.md)                         | URL 화면 문맥, 사진 필터와 연락 초안 전달       |
| [개발 블로그 개편 계획](./docs/plan/07-dev-blog.md)                                       | 블로그 정보 구조, Markdown 계약과 발행 흐름     |
| [Supabase 이전 결정](./docs/adr/0005-supabase-migration.md)                               | 데이터 계층 이전 결정과 Firebase 해체 완료 기록 |
| [Supabase 이전 계획](./docs/plan/08-supabase-migration.md)                                | Firebase에서 Supabase로의 데이터 계층 이전      |
| [Supabase 관찰·해체 체크리스트](./docs/checklist/09-supabase-observation-teardown.md)     | 관찰 기준값, 운영 검증과 Firebase 해체 결과     |
| [Supabase 백업·복구](./docs/troubleshooting/supabase-backup-and-restore.md)               | B2 암호화 백업, 검증, 새 환경 설정과 복구 절차  |
| [Firebase 해체·백업 자동화 계획](./docs/plan/11-firebase-teardown-and-supabase-backup.md) | 기준값, 최종 복구본과 인프라 해체 실행 기록     |
| [오류 알림 AI 트리아지](./docs/plan/10-sentry-ai-triage.md)                               | Sentry 웹훅, LLM 판정과 Discord 알림 구성       |
| [의존성 보안 AI 리포트 계획](./docs/plan/12-dependency-security-ai-report.md)             | Dependabot 탐지, AI 분석과 PR 방어 설계         |
| [의존성 보안 리포트 설정](./docs/troubleshooting/dependency-security-report.md)           | GitHub 설정, 제공자 교체와 운영 확인 절차       |
| [Core Web Vitals AI 알림 계획](./docs/plan/13-core-web-vitals-ai-alerts.md)               | CrUX·Lighthouse 판정, 이력과 AI 알림 설계       |
| [Core Web Vitals AI 알림 설정](./docs/troubleshooting/core-web-vitals-alerts.md)          | Actions 설정, 수동 실행과 실패 점검             |
| [UI 품질 테스트](./docs/testing.md)                                                       | 시각 회귀, 접근성, 언어·분석 동의 검증 방법     |

### 코드 검토

| 날짜       | 검토 문서                                       | 완료 보고                                              | 범위        |
| ---------- | ----------------------------------------------- | ------------------------------------------------------ | ----------- |
| 2026-08-26 | [전수 검토](./docs/review/2026-08-26/README.md) | [처리 결과](./docs/review/2026-08-26/00-completion.md) | `src/` 전체 |

## 제작 및 AI 활용

기획, 디자인, 구현을 직접 맡았습니다. 생성형 AI는 아이디어 탐색과 디자인, 코드 작성 및 검토에 보조 도구로 사용했습니다. AI가 만든 초안은 직접 검토하고 수정해 프로젝트에 반영했습니다. AI 사용 여부는 이 저장소의 이용 조건에 영향을 주지 않습니다.

## 저작권과 자산

Copyright © 2026 Sungjoon Lee. All rights reserved.

- 원본 코드, UI, 디자인 프로토타입과 [`design/`](./design/) 산출물은 별도 허락 없이 복제·수정·배포할 수 없습니다.
- 사진, 인물 이미지, 포스터, 프로젝트 스크린샷, 발표 영상과 외부 Drive 자료에는 공동 권리자의 권리가 포함될 수 있습니다. 저장소나 사이트에 표시되었다는 이유만으로 이용 권한이 부여되지 않습니다.
- Newsreader, Noto Serif KR, Schibsted Grotesk와 Spline Sans Mono 폰트는 각각의 SIL Open Font License 1.1을 따릅니다. 세부 저작권 표기는 [NOTICE](./NOTICE)에 정리했습니다.
- 외부 서비스, 라이브러리와 그 상표는 각 권리자에게 귀속됩니다.

사용 또는 라이선스 문의는 [저장소 소유자](https://github.com/SJLee-0525)에게 연락해 주세요.
