# 검토 방법

## 왜 이렇게 했나

이 저장소는 자동 검사를 이미 전부 통과한다. `tsc --noEmit`, ESLint, dependency-cruiser,
knip 어느 것도 문제를 잡지 못한다. 그래서 도구가 못 보는 층위를 사람이 보는 방식으로,
다만 여러 관점에서 동시에 보도록 구성했다.

한 번에 다 보려는 시도는 반드시 얕아진다. 98,817줄을 한 관점으로 훑으면 눈에 익은 것만
걸린다. 대신 역할을 나눠 같은 코드를 다른 눈으로 보게 했고, 그 결과를 다시 코드에 대조했다.

## 1단계: 역할별 병렬 검토

11개 에이전트가 각자 담당 범위의 파일을 전부 열어 읽었다. 샘플링은 금지했다.

| 담당 | 범위 | 적용 기준 |
| --- | --- | --- |
| 인증·인가 | `lib/auth`, `lib/supabase/admin`, `features/auth`, API 라우트의 토큰 검증, `proxy.ts` | auth-implementation-patterns |
| 서버 경계 보안 | `app/api/**`, 챗 핸들러, sentry-triage, `lib/ai`, `lib/monitoring` | security-and-hardening |
| 클라이언트 보안 | dev-blog 마크다운 파이프라인, 업로드, analytics, legal, contact | security-and-hardening |
| 공개 UI | gallery, photo-detail, albums, map, music, dev, search, contact, `components/` | frontend-ui-engineering |
| 셸·횡단 UI | site-header/footer, theme, lang, 커스텀 커서·스크롤바, 챗 UI, `hooks/` | frontend-ui-engineering + fixing-motion-performance |
| 관리자 UI | `features/admin-*`, `app/admin/**` | frontend-ui-engineering |
| 데이터 아키텍처 | `lib/**`, `constants/`, `types/`, `mocks/` | improve-codebase-architecture |
| 앱 계층 아키텍처 | `features/**` 구조, `app/**` 라우팅 | improve-codebase-architecture |
| 서버 정확성 | 챗, 마크다운, 유지보수, supabase, cache, search | code-review |
| 클라이언트 정확성 | `hooks/**`, 모든 `_hooks/`, i18n 경로, 필터 | code-review + react-state-management |
| 규약·테스트 | `src/**` 전체의 주석 규칙·컨벤션·테스트 범위 | CLAUDE.md 직접 대조 |

결과 258건.

## 2단계: 적대적 재검증

4개 에이전트가 258건을 나눠 받아 **기각을 목표로** 다시 봤다. "이 주장이 틀렸다면 왜
틀렸을까"를 먼저 묻게 했고, 인용된 파일과 줄번호를 전수 대조하게 했다.

이 단계가 실제로 한 일:

- 하위 주장 10건이 코드로 무너졌다. 예를 들어 "포커스 표시가 없는 요소 19종"이라는 주장은
  `outline: none` 선언이 저장소 전체에 7곳뿐이라는 사실로 무너졌다. Sentry 관련 토큰 폭탄
  시나리오는 SDK가 예외 메시지를 250자로 자른다는 사실(`@sentry/core` 소스 확인)로 무너졌다.
- 집계 숫자 10여 개가 정정됐다. `"use client"` 비율은 87%가 아니라 59%였고, 그 주장의 근거로
  든 파일은 문제의 훅을 쓰지도 않았다.
- 대비비는 직접 계산해 원 수치 3개를 보정했다.
- 한 보고서의 줄번호 4건이 파일 길이를 넘길 만큼 어긋난 것이 드러났다.
- 아무도 못 찾은 것 10여 건이 추가로 나왔다. CLAUDE.md에 적힌 섹션 액센트 색 3개가 전부
  실제 값과 다르다는 사실이 그중 하나다.

기각·보류·정정 내역은 [07-rejected.md](07-rejected.md)에 전부 남겼다.

## 심각도를 매긴 기준

일반적인 기업용 기준을 그대로 쓰지 않았다. 이 프로젝트는 관리자가 본인 한 명이고, 상시
서버가 없으며, 보안 경계가 Supabase RLS 하나다. 그 맥락에서 다시 매겼다.

- 공개 화면에서 방문자가 막히는 것은 높게 잡았다. 관리자 화면의 보조기술 전용 결함은 낮췄다.
- 관리자 화면이라도 데이터를 잃는 것은 높게 잡았다.
- 계정이 하나뿐이라 성립하지 않는 위협 모델은 낮추거나 정보성으로 내렸다.
- 콘텐츠가 수십 건 규모라 실익이 없는 성능 제안은 내렸다.

그래서 원 보고서에서 높음이던 것 여럿이 중간으로 내려갔고, 반대로 낮음이던 것 하나는
범위가 넓다는 사실이 드러나 올라갔다.

## 확인한 측정값

리뷰 시작 시점에 직접 실행한 값이다.

| 항목 | 결과 |
| --- | --- |
| `tsc --noEmit` | 통과 |
| `eslint` | 0건 |
| `depcruise src` | 위반 0건 (1,079 모듈 / 3,037 의존) |
| `knip` | 0건 |
| `vitest run --coverage` | 2,115개 중 2,114개 통과 |
| `jscpd src` | 36 clones / 687줄 / 1.29% |

테스트 1건(`ArticleBody.test.tsx`)이 실패했으나 11개 에이전트가 동시에 도는 부하 상태에서
기본 5초 타임아웃을 넘긴 것이고, 단독 재실행 시 2.2초에 통과했다. 코드 결함이 아니라
부하에서 드러난 취약한 타임아웃이다.

## 이 보고서를 읽는 법

- 각 항목에는 원 보고서의 ID가 붙어 있다. 상세 근거를 다시 확인하려면 그 ID로 추적하면 된다.
- 심각도는 재검증 후 값이다. 원 보고서 값과 다를 수 있다.
- 줄번호는 재검증에서 대조한 값이다. 정정된 것은 정정값을 썼다.
- "실측 필요"로 표시된 것은 코드만으로는 크기를 판단할 수 없어 보류한 것이다. 브라우저나
  프로파일러로 확인해야 한다.
- 기각된 주장을 수정 계획에 넣지 않도록 [07-rejected.md](07-rejected.md)를 먼저 훑기를 권한다.

## 한계

- 브라우저에서 실제로 렌더해 보지 않았다. CSS 캐스케이드는 코드로 추적했으나 실제 픽셀은
  확인하지 않았다.
- 성능 주장은 코드 경로만 확인했고 프로파일링하지 않았다.
- RLS 정책 자체는 마이그레이션 SQL을 읽어 확인했을 뿐 실행해 보지 않았다.
- 외부 SaaS 설정(Web3Forms 대시보드, Sentry 프로젝트 설정)은 저장소 밖이라 확인할 수 없었다.
