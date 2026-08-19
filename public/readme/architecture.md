# 프로젝트 아키텍처

이 저장소에는 공개 포트폴리오와 개인용 콘텐츠 관리 도구가 하나의 Next.js 애플리케이션에 들어 있습니다. 방문자 화면과 관리자 기능은 라우트와 데이터 접근 방식부터 나뉩니다.

## 전체 구성

```text
방문자
├─ 공개 페이지 ─ src/lib/content ─ Mock 또는 PostgREST
├─ 통합 검색 ─ 브라우저 내 검색
├─ 포트폴리오 챗봇 ─ RAG 검색 ─ 채팅 제공자
└─ 분석 동의 ─ 허용 후에만 Google Analytics

관리자
└─ Admin CMS ─ Supabase Auth · Postgres · Storage

운영
└─ Sentry Alert ─ 공식 Discord Integration · 자체 웹훅의 AI 트리아지 카드
```

공개 페이지는 콘텐츠를 읽고, 인증된 Admin은 콘텐츠를 변경합니다. 방문자 UI는 관리자 인증 상태나 supabase-js를 불러오지 않습니다.

## 공개 페이지

공개 라우트는 [`src/app/[lang]/(public)`](<../../src/app/[lang]/(public)>) 아래에 있습니다. 각 `page.tsx`는 서버에서 콘텐츠를 읽고 화면에 필요한 feature 컴포넌트에 전달합니다.

```text
page.tsx
└─ src/lib/content getter
   ├─ 개발·E2E: src/mocks
   └─ 운영: PostgREST
```

[`src/lib/content`](../../src/lib/content)의 getter가 데이터 소스를 선택합니다. 화면 컴포넌트에는 mock과 Supabase가 같은 형태의 데이터를 전달합니다. 공개 페이지는 1시간 단위 재검증을 사용하고, 관리자가 콘텐츠를 저장하면 관련 캐시를 무효화합니다.

## Admin CMS

[`src/app/admin`](../../src/app/admin)은 로그인, 사진, 앨범, 음악, 개발 프로젝트, 블로그 글과 사이트 설정을 관리합니다. 서버 레이아웃은 검색엔진 제외 메타데이터를 제공하고, [`AdminLayoutClient`](../../src/app/admin/_components/AdminLayoutClient.tsx)가 인증 확인과 관리자 화면을 담당합니다.

관리 기능은 supabase-js를 사용합니다. 접근 제어는 Postgres RLS가 담당하며, 관리자 판별은 계정의 role 클레임입니다.

- Auth: 관리자 한 명의 로그인 상태 확인
- Postgres: 콘텐츠 생성, 수정, 공개 상태와 정렬 순서 저장
- Storage: 사진, 포스터, 프로젝트와 블로그 본문 이미지 저장
- RAG 동기화: 변경된 콘텐츠의 임베딩 갱신 요청

## 개발 블로그 본문

블로그 본문은 한국어 Markdown 원문 하나만 저장합니다. 제목, 요약과 태그는 다른 콘텐츠처럼
한국어와 영어를 함께 저장하지만, 본문 번역은 제공하지 않습니다.

렌더 경로에는 HTML 문자열 단계가 없습니다. `mdast`가 만든 트리에서 허용한 노드만 React
요소로 직접 매핑하므로 sanitizer나 `dangerouslySetInnerHTML`이 필요하지 않습니다. 코드
하이라이트는 서버에서만 실행하고 토큰만 내려보내, 문법 정의와 테마를 브라우저 번들에
포함하지 않습니다. 라이트와 다크 테마는 CSS 변수 한 쌍으로 갈립니다.

목록과 상세는 정적 생성 후 재검증하며, 글을 발행하면 해당 상세 경로의 캐시를 함께
무효화합니다. 초안은 공개 getter가 걸러내므로 검색, RAG, 챗봇, sitemap 어디에도
나타나지 않습니다.

## UI 계층

의존 방향은 `app → features → components`입니다.

| 계층                                 | 역할                                             |
| ------------------------------------ | ------------------------------------------------ |
| [`app`](../../src/app)               | 라우팅, 서버 데이터 조회와 화면 조립             |
| [`features`](../../src/features)     | 검색, 모달, 필터, 폼처럼 사용자 행동이 있는 기능 |
| [`components`](../../src/components) | props로 내용을 받아 표시하는 공용 UI             |

Feature 폴더는 필요에 따라 `_components`, `_hooks`, `_lib`, `_types`로 나눕니다. 화면, 상태 로직과 순수 함수의 위치를 구분해 관련 코드를 찾기 쉽게 구성했습니다.

## 다국어 라우팅

공개 URL은 `/ko`와 `/en`으로 나뉩니다. URL의 언어 값이 서버 렌더링, 내부 링크, canonical과 hreflang의 기준이 됩니다.

```text
/ko/photo
/en/photo
/ko/dev/projects
/en/dev/projects
```

언어가 없는 루트 `/`는 [`src/proxy.ts`](../../src/proxy.ts)에서 명시적 언어 쿠키,
`Accept-Language`, 한국어 기본값 순서로 `/ko` 또는 `/en`을 고르고 307로 이동합니다. 이미 언어가
포함된 URL은 자동 전환하지 않습니다. 언어 메뉴에서 선택하면 같은 페이지의 다른 언어 경로로
이동하고 선택을 30일 동안 저장합니다. Admin과 API는 언어 경로 밖에 두어 공개 페이지의 URL
정책과 분리했습니다. 상세한 결정은 [ADR-0002](../../docs/adr/0002-path-based-i18n.md)에 있습니다.

## 방문자 저장과 외부 전송

언어 선택과 분석 동의는 서로 다른 저장소와 목적으로 관리합니다. 언어 쿠키는 루트의 다음 방문
언어를 기억하는 데만 사용합니다. 분석 선택은 localStorage에 저장하며, 허용 전에는 Google tag를
불러오지 않습니다. Footer에서 선택을 다시 열어 거부하거나 허용할 수 있습니다.

개인정보처리방침, 사이트 이용 및 콘텐츠 정책, 접근성 안내는
[`src/features/legal`](../../src/features/legal)의 공용 문서 화면과 중앙 문서 데이터로 관리합니다.
한국어와 영어 페이지가 같은 구조를 사용하므로 정책을 바꿀 때 두 언어 원문을 함께 검토합니다.

## 오류 알림

브라우저와 서버 오류는 Sentry가 수집합니다. 공개 브라우저에서는 방문자가 오류 보고를 허용한 뒤에만 SDK를 내려받고, 이벤트는 같은 출처의 `/monitoring` 터널로 보냅니다.

Alert가 발동하면 알림이 두 경로로 나갑니다.

```text
Sentry Alert Rule (Production · 신규·회귀·escalated)
├─ 공식 Discord Integration ─ Discord 채널
└─ /api/sentry-alert ─ 서명 검증 ─ 트리아지 LLM ─ Discord 웹훅
```

[`src/app/api/sentry-alert`](../../src/app/api/sentry-alert)는 HMAC 서명을 확인한 뒤 바로 202를 반환하고 나머지 처리를 응답 이후로 미룹니다. Sentry는 응답이 늦으면 같은 알림을 다시 보내기 때문입니다. [`src/features/sentry-triage`](../../src/features/sentry-triage)는 화이트리스트로 추린 이벤트 요약만 LLM에 넘겨 심각도, 사용자 영향, 추정 원인과 조치를 받고 Discord 카드로 만듭니다. LLM이 실패하면 제목, 환경, 릴리즈와 Sentry 링크만 담은 기본 카드를 대신 보냅니다.

전달 기록은 Postgres에 남깁니다. 이 경로에는 사용자 세션이 없어 RLS를 쓸 수 없으므로, 공유 시크릿을 검증하는 `security definer` RPC 두 개만 쓰기 권한을 갖습니다. 같은 이슈와 이벤트 조합은 한 번만 기록되며, 웹훅이 중복 전달돼도 카드는 한 장만 나갑니다.

카드를 두 경로로 받는 이유는 경로 이중화입니다. 자체 파이프라인이 멈춰도 공식 카드가 도착하므로 알림이 오지 않는 것과 오류가 없는 것을 구분할 수 있습니다. 이슈 처리 버튼은 공식 카드에 있고, 판단에 필요한 정보는 AI 카드에 있습니다. 결정과 그 영향은 [ADR-0006](../../docs/adr/0006-ai-error-triage-alerts.md)에 정리했습니다.

## 외부 서비스 경계

- Supabase는 공개 콘텐츠, 관리자 인증, 이미지 저장과 RAG 벡터 검색을 담당합니다.
- MapLibre GL은 사진 위치를 지도에 표시합니다.
- OpenAI와 Gemini는 챗봇 응답, 분야 분류, 임베딩과 오류 트리아지 판정에 사용됩니다.
- Web3Forms는 문의 폼이 설정된 경우에만 사용됩니다.
- Upstash Redis는 배포 환경에서 챗봇 요청 제한(IP당 분당 10회·전역 일일 1,000회)과 트리아지 LLM 일일 상한을 공유합니다.
- Google Analytics는 방문자가 분석을 허용한 뒤에만 로드됩니다.
- Sentry는 오류를 수집하고 Alert를 발동합니다. 공개 브라우저 수집은 오류 보고 동의가 있을 때만 시작합니다.
- Discord는 공식 Integration과 웹훅 카드를 함께 받는 알림 채널입니다.

로컬에서는 외부 서비스 없이 mock 콘텐츠로 공개 화면을 확인할 수 있습니다.
