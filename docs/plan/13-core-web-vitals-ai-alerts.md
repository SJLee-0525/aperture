# Core Web Vitals AI 알림 구현 계획

> 작성일: 2026-08-30 KST
> 상태: 계획
> 관련: [Lighthouse 테스트](../testing.md#lighthouse),
> [Sentry 오류 알림 AI 트리아지](10-sentry-ai-triage.md),
> [분석·오류 수집 동의 원칙](../adr/0004-consent-gated-error-monitoring.md)
> 원칙 유지: 서버 0대, 월 $0.

## 1. 목표

운영 사이트의 LCP, INP, CLS 상태를 주기적으로 확인하고 기준을 벗어난 항목을 Discord에 보낸다.
카드에는 수치만 나열하지 않고 어떤 화면과 자원이 원인 후보인지, 먼저 확인할 코드와 검증 명령이
무엇인지 함께 적는다.

현재 CI는 홈, 사진, 음악, 프로젝트 화면을 Lighthouse로 한 번씩 측정한다. 접근성, Best Practices,
SEO는 실패 조건이고 성능 점수, LCP, CLS는 경고다. 이 검사는 배포 전 회귀를 찾는 실험 데이터다.
실제 방문자의 기기와 네트워크를 반영하지 않으며 INP를 판단할 수도 없다.

새 알림은 두 종류의 측정을 구분한다.

| 측정               | 출처                              | 용도                                  |
| ------------------ | --------------------------------- | ------------------------------------- |
| 실제 사용자 데이터 | Chrome UX Report(CrUX)의 28일 p75 | 운영 환경의 Core Web Vitals 상태 판정 |
| 실험 데이터        | 운영 URL을 대상으로 한 Lighthouse | 원인 후보와 개선 항목 확인            |

CrUX 데이터가 없는 URL은 통과로 판정하지 않는다. `insufficient_data`로 표시하고 Lighthouse 결과만
보낸다. 실험 데이터를 실제 사용자 데이터처럼 표현하지 않는다.

## 2. 이번 범위

범위 안:

- CrUX API에서 origin과 대표 URL의 LCP, INP, CLS 조회
- 운영 URL의 모바일 Lighthouse 반복 측정
- 이전 실행 결과와 비교한 회귀 판정
- 사실 기반 AI 분석과 Discord 카드
- AI가 실패해도 수치와 링크를 담아 보내는 기본 카드
- 수동 실행, 예약 실행과 최근 결과 artifact 보관

범위 밖:

- 브라우저에서 별도 Web Vitals 이벤트를 받는 자체 RUM 수집기
- Sentry performance tracing 활성화
- Search Console API 연동
- 자동 코드 수정과 Draft PR 생성
- 성능 점수를 이유로 배포를 자동 롤백하거나 PR을 자동 병합하는 동작

자체 RUM은 CrUX 표본 부족이 반복될 때 검토한다. 이 경우 수집 항목, 동의 분류, 보유 기간,
공개 ingest 남용 방지와 삭제 절차를 먼저 ADR로 정한다. 현재 `ap-consent:v3`의 의미나
개인정보처리방침을 이 계획에서 넓히지 않는다.

## 3. 전체 흐름

```text
GitHub Actions (화·금 10:17 KST, 수동 실행 가능)
  -> 운영 배포 상태 확인
  -> CrUX origin 및 대표 URL 조회
  -> 각 대표 URL을 모바일 Lighthouse로 3회 측정
  -> 중앙값과 주요 audit 추출
  -> 직전 정상 artifact와 비교
  -> 결정 규칙으로 상태와 회귀 여부 계산
  -> 문제가 있으면 LLM에 정규화한 사실만 전달
  -> AI 카드 또는 기본 카드를 Discord로 전송
  -> 이번 측정 JSON과 HTML 보고서를 artifact로 보관
```

정각을 피한 `17 1 * * 2,5`를 사용한다. GitHub Actions cron은 UTC이므로 KST 화요일과 금요일
10:17에 해당한다. 배포마다 실행하는 방식은 첫 버전에 넣지 않는다. 운영 트래픽이 적은 개인
포트폴리오에서 주 2회면 회귀 추세를 확인하기에 충분하고 API 호출과 알림량도 예측하기 쉽다.

## 4. 측정 대상

대표 URL은 코드에 흩어 두지 않고 workflow가 읽는 한 목록에서 관리한다.

```ts
type PerformanceTarget = {
  id:
    | "dev-projects"
    | "dev-articles"
    | "dev"
    | "dev-career"
    | "photo"
    | "photo-about"
    | "photo-albums"
    | "photo-map"
    | "music"
    | "music-media"
    | "home"
    | "contact";
  path:
    | "/ko/dev/projects"
    | "/ko/dev/articles"
    | "/ko/dev"
    | "/ko/dev/career"
    | "/ko/photo"
    | "/ko/photo/about"
    | "/ko/photo/albums"
    | "/ko/photo/map"
    | "/ko/music"
    | "/ko/music/media"
    | "/ko"
    | "/ko/contact";
};
```

한국어 공개 URL 열두 개를 측정한다. 영어 화면은 같은 컴포넌트와 자원을 사용하므로 별도
측정하지 않는다. 두 언어의 콘텐츠 길이나 자원이 달라져 성능 특성이 갈리면 영어 URL을 목록에
추가한다.

CrUX는 URL 표본이 부족할 수 있으므로 origin 조회를 항상 함께 한다. URL 값이 있으면 URL을 우선하고,
없으면 origin 값을 사이트 전체 상태로만 표시한다. origin 값을 특정 경로의 값으로 복사하지 않는다.

운영 URL은 `SITE_URL` 하나에서 만든다. 실행 전 다음을 확인한다.

- HTTPS URL이고 path, query, fragment가 없는 origin인지
- 대표 URL을 GET했을 때 최종 응답이 2xx HTML인지
- redirect의 최종 URL이 `SITE_URL`과 같은 origin인지
- redirect 뒤의 최종 측정 URL을 기록했는지

상태 확인이 실패하면 측정을 진행하지 않고 workflow를 실패시킨다. 이전 결과를 새 결과처럼
재전송하지 않는다. 현재 앱에는 `/api/status`가 없으므로 상태 확인용 API를 새로 만들지 않는다.
scheduled workflow의 commit SHA를 운영 배포의 release라고 가정하지도 않는다. 배포 revision을
확인할 출처가 없으면 snapshot의 `release`는 `null`로 둔다.

## 5. 실제 사용자 데이터

CrUX API의 `queryRecord`를 사용해 LCP, INP, CLS를 조회한다. form factor는 `PHONE`과 `DESKTOP`을
나눠 요청한다. 응답에서는 다음 값만 보존한다.

```ts
type FieldMetric = {
  name: "LCP" | "INP" | "CLS";
  p75: number;
  goodRatio: number;
  needsImprovementRatio: number;
  poorRatio: number;
};

type FieldRecord = {
  scope: "origin" | "url";
  formFactor: "phone" | "desktop";
  collectionPeriod: { firstDate: string; lastDate: string };
  metrics: FieldMetric[];
};
```

API metric 이름은 `largest_contentful_paint`, `interaction_to_next_paint`,
`cumulative_layout_shift` 세 개로 고정한다. LCP와 INP의 p75는 millisecond 정수이고 CLS p75는
문자열로 오므로 유한한 숫자로 변환한다. histogram의 세 density를 good, needs improvement, poor
비율에 순서대로 대응시키고 합이 반올림 오차 범위에서 1인지 확인한다. collection period는 metric이
아니라 record에서 한 번 읽는다.

CrUX는 최근 28일의 이동 집계다. 오늘 배포한 변경이 다음 실행에서 곧바로 드러난다고 가정하지 않는다.
직전 실행과 작은 차이가 나도 일일 변동으로 보고, 아래 회귀 규칙을 함께 만족할 때만 알린다.

API key는 `CRUX_API_KEY` GitHub Actions secret으로 둔다. 요청 URL, 응답 요약과 오류 코드만 로그에
남기고 key가 포함된 URL 전체를 출력하지 않는다.

## 6. Lighthouse 진단

현재 [lighthouserc.cjs](../../lighthouserc.cjs)는 CI의 mock production build를 데스크톱 preset으로
한 번 측정한다. 기존 검사는 그대로 두고, 운영 알림 workflow는 모바일 조건의 별도 설정을 쓴다.

- URL마다 3회 실행하고 metric별 중앙값을 사용한다.
- LCP, CLS, TTFB, FCP, Total Blocking Time, Speed Index와 performance score를 보존한다.
- INP는 Lighthouse 값으로 만들지 않는다. 상호작용 표본이 없는 탐색에서 실제 INP를 대신할 수 없다.
- LCP element, render-blocking request, unused JavaScript, image delivery, long main-thread task처럼
  조치와 연결되는 audit만 최대 5개 보존한다.
- HTML 전체를 LLM에 보내지 않는다.

운영 콘텐츠와 외부 네트워크 상태 때문에 한 번의 값이 흔들릴 수 있다. 세 번 중 한 번의 최악값이
아니라 중앙값으로 판정하되, 세 실행의 최솟값과 최댓값을 artifact에 함께 남겨 변동 폭을 확인한다.
audit 설명은 서로 다른 실행에서 짜깁기하지 않고 LHCI manifest의 `isRepresentativeRun`인 JSON에서
가져온다. fresh browser profile에 보이는 동의 배너도 첫 방문 화면의 일부로 측정하며, 이를 닫는
Puppeteer script는 사용하지 않는다.

## 7. 판정 규칙

상태는 LLM을 호출하기 전에 코드가 계산한다. 모델은 수치를 판정하지 않는다.

| 지표 |         좋음 |    개선 필요 |        나쁨 |
| ---- | -----------: | -----------: | ----------: |
| LCP  | `<= 2,500ms` | `<= 4,000ms` | `> 4,000ms` |
| INP  |   `<= 200ms` |   `<= 500ms` |   `> 500ms` |
| CLS  |     `<= 0.1` |    `<= 0.25` |    `> 0.25` |

CrUX p75가 표의 경계를 넘으면 `needs_improvement` 또는 `poor`로 분류한다. 회귀 알림은 다음 조건을
모두 만족할 때 만든다.

1. 현재 p75가 `needs_improvement` 또는 `poor`다.
2. 더 최근 collection period의 p75가 직전 측정보다 LCP·INP는 15% 이상, CLS는 0.03 이상 악화됐다.
3. 같은 target, form factor, metric, collection period로 이미 알리지 않았다.

`poor`로 처음 진입하면 변화율과 관계없이 알린다. URL별 CrUX가 없고 origin만 있으면 알림 제목을
사이트 전체 회귀로 적는다. `insufficient_data`는 처음 발생했을 때와 4회 연속일 때만 운영 메모로
보내고 성능 회귀로 세지 않는다.

collection period가 이전보다 오래됐으면 회귀 비교에서 제외한다. 같은 period면 고정 임계값 상태는
계산하되 회귀율을 다시 계산하거나 같은 경고를 보내지 않는다.

Lighthouse는 다음 조건 중 하나면 별도 lab 경고를 만든다.

- 3회 중앙 LCP가 3,000ms 초과
- 중앙 CLS가 0.1 초과
- performance score가 0.8 미만
- 직전 실행보다 LCP 또는 Total Blocking Time이 20% 이상 악화

field와 lab이 모두 나쁘면 한 카드로 합친다. 하나만 나쁘면 어느 측정에서 문제가 발생했는지 제목과
본문에 명시한다.

## 8. 이전 결과와 중복 방지

각 실행은 정규화한 `performance-snapshot.json`을 90일 artifact로 올린다. workflow는 GitHub API로
같은 workflow의 최근 성공 실행을 찾고 해당 artifact를 내려받아 비교한다.

이전 artifact가 없거나 schema version이 다르면 현재 값을 기준선으로 저장하고 회귀율은 계산하지
않는다. 고정 임계값 판정은 계속한다. artifact 조회가 실패하면 새 측정은 수행하되 비교 기반 알림은
생략하고 Actions summary에 이유를 남긴다.

snapshot에는 다음 식별자를 둔다.

```ts
type PerformanceSnapshot = {
  schemaVersion: 1;
  measuredAt: string;
  siteOrigin: string;
  release: string | null;
  cruxCollectionPeriod: string | null;
  targets: PerformanceTargetResult[];
  sentAlerts: Array<{ key: string; sentAt: string }>;
};
```

중복 키는 `target + formFactor + metric + status + collectionPeriod`로 만든다. 직전 artifact의
`sentAlerts`를 이어받되 `sentAt`이 90일보다 오래된 항목은 버린다.

## 9. AI 분석

AI는 문제가 있을 때만 호출한다. 입력은 CrUX와 Lighthouse에서 정규화한 사실, 직전 값과의 차이,
대상 경로, release와 audit 요약이다. 방문자 식별자, 원시 요청, HTML 본문, screenshot은 보내지 않는다.

출력 계약은 다음과 같다.

```ts
type PerformanceTriageResult = {
  summary: string;
  userImpact: string;
  likelyCauses: string[];
  inspectFirst: string[];
  recommendedChecks: string[];
  confidence: "high" | "medium" | "low";
};
```

프롬프트는 다음 제한을 둔다.

- field와 lab 데이터를 구분한다.
- Lighthouse audit에 없는 원인을 확인된 사실처럼 쓰지 않는다.
- INP를 Total Blocking Time으로 바꿔 말하지 않는다.
- release만으로 특정 commit이 원인이라고 단정하지 않는다.
- 확인할 파일을 입력으로 받지 않았다면 파일 경로를 만들지 않는다.
- 추천 검사는 저장소에 있는 명령만 사용한다.

제공자 선택과 primary/fallback 규약은 dependency security 분석을 따른다. 구현은 성능 도메인에
별도로 두고 채팅이나 보안 schema와 합치지 않는다. 양쪽 제공자가 실패하거나 schema 검증이 실패하면
AI 설명 없이 기본 카드를 보낸다.

환경변수 이름은 다음과 같다.

```text
PERFORMANCE_TRIAGE_PROVIDER=openai|gemini|mock
PERFORMANCE_TRIAGE_PROVIDER_API_KEY=
PERFORMANCE_TRIAGE_PROVIDER_MODEL=
PERFORMANCE_TRIAGE_FALLBACK_PROVIDER=
PERFORMANCE_TRIAGE_FALLBACK_PROVIDER_API_KEY=
PERFORMANCE_TRIAGE_FALLBACK_PROVIDER_MODEL=
```

## 10. Discord 카드

카드는 모바일에서 한 화면에 핵심 수치가 보이도록 구성한다.

- 제목: field 회귀, lab 회귀, 데이터 부족 중 하나
- 대상 URL과 form factor
- 현재 p75와 직전 p75, 변화량
- CrUX collection period와 측정 시각
- Lighthouse 중앙값과 실행 범위
- 단일 대상이면 AI 요약, 사용자 영향, 원인 후보와 확인 순서
- 여러 대상이면 코드가 집계한 현황, 공통 AI 요약과 원인 최대 3개, 우선 확인 3개,
  악화 폭이 큰 대상 3개, Actions run 및 전체 AI report 링크
- provider/model 또는 `AI 분석 없음`

Discord 제한에 맞춰 필드와 embed 전체 길이를 전송 전에 자른다. 사용자나 외부 데이터가 카드에
들어오지 않더라도 `allowed_mentions`는 빈 배열로 고정한다. 전송 실패 시 secret이 없는 오류를
Actions summary에 남기고 workflow를 실패시킨다.

정상 실행마다 성공 카드를 보내지는 않는다. 모든 대상이 기준 안이면 Actions summary와 artifact만
남긴다. `workflow_dispatch`에는 `send_baseline=true` 입력을 두어 설정 검증 때만 정상 카드를 보낸다.
`force_ai_analysis=true`이면 중복 억제 여부와 관계없이 현재 경고 대상 전체를 다시 분석한다. 여러
대상의 상세 분석은 Actions summary와 `core-web-vitals-ai-report` artifact에 모두 남긴다.

## 11. 파일 구조

예상 파일은 다음과 같다. 구현하면서 책임이 달라지면 이름은 바꿀 수 있지만, 수집, 판정, AI 호출,
표시를 한 파일에 합치지 않는다.

```text
.github/workflows/core-web-vitals-report.yml
scripts/core-web-vitals-report.ts
config/performance-targets.json
scripts/performance-targets.ts
src/lib/performance-alerts/
  crux-client.ts
  lighthouse-result.ts
  performance-status.ts
  snapshot.ts
  triage-provider.ts
  triage-prompt.ts
  triage-schema.ts
  discord-report.ts
```

2026-08-31 갱신: OpenAI·Gemini 호출과 폴백, provider 선택은 세 알림 계열이 공유하는
`src/lib/triage/`가 소유한다([ADR-0007](../adr/0007-shared-triage-transport.md)).
`triage-provider.ts`에는 이 계열의 계약(지시문, 입력 직렬화, 스키마, 파서, 토큰 예산)만
남는다. Discord embed 예산은 `src/lib/discord/embed-budget.ts`가 적용한다.

Lighthouse 실행을 TypeScript orchestration 안에 직접 구현하지 않는다. LHCI 또는 Lighthouse CLI가
만든 JSON을 읽고 정규화한다. 외부 호출과 파일 읽기는 script가 조립하고, 판정 로직은 순수 함수로 둔다.

## 12. workflow 권한과 설정

workflow는 저장소에 쓰지 않는다.

```yaml
permissions:
  actions: read
  contents: read
```

필수 설정:

| 종류            | 이름                              | 용도                         |
| --------------- | --------------------------------- | ---------------------------- |
| Variable        | `SITE_URL`                        | 운영 origin                  |
| Secret          | `CRUX_API_KEY`                    | CrUX API                     |
| Secret          | `DISCORD_PERFORMANCE_WEBHOOK_URL` | 성능 알림 채널               |
| Variable/Secret | `PERFORMANCE_TRIAGE_*`            | AI provider, model과 API key |

Discord는 보안 알림과 채널을 나눌 수 있도록 별도 webhook을 쓴다. 같은 채널을 원하면 두 secret에
같은 URL을 등록할 수 있다.

같은 실행이 겹치지 않도록 고정 concurrency group을 사용하고 `cancel-in-progress: false`로 둔다.
Lighthouse 36회와 Chromium 설치 시간을 고려해 job timeout은 30분으로 시작한다.

## 13. 실패 처리

| 상황                            | workflow | 알림                                 |
| ------------------------------- | -------- | ------------------------------------ |
| 운영 상태 확인 실패             | 실패     | Actions 기본 실패 알림               |
| CrUX API 전체 실패              | 실패     | 가능하면 Discord 설정 오류 카드      |
| 일부 URL의 CrUX 데이터 없음     | 성공     | `insufficient_data` 규칙 적용        |
| Lighthouse 한 URL 3회 모두 실패 | 실패     | 기본 오류 카드                       |
| Lighthouse 1회만 실패           | 성공     | 남은 2회 중 나쁜 값과 실패 횟수 표시 |
| 이전 artifact 없음              | 성공     | 기준선 저장, 고정 임계값만 판정      |
| 이전 artifact 조회 실패         | 성공     | 비교 생략 사실을 summary에 기록      |
| primary LLM 실패                | 성공     | fallback 분석                        |
| 두 LLM 모두 실패                | 성공     | 기본 성능 카드                       |
| Discord 전송 실패               | 실패     | Actions summary와 run log            |

CrUX와 Lighthouse가 모두 실패한 실행은 성능이 정상이라는 카드를 만들지 않는다. 불완전한 측정값도
직전 정상 snapshot을 대체하지 않는다.

### 첫 운영 검증에서 확인한 구현 간극

2026-08-31 KST baseline 실행에서 `/ko`의 세 번째 Lighthouse 요청이 HTTP 403으로 실패하자
`lhci autorun`이 즉시 종료됐다. 앞서 성공한 32회 결과도 filesystem upload 단계까지 도달하지 못해
artifact로 남지 않았고, `/ko/contact`와 이후 report 단계도 실행되지 않았다. 따라서 현재 workflow는
위 표의 "Lighthouse 1회만 실패" 처리와 실패 시 진단 artifact 보존을 아직 충족하지 않는다.

P4를 완료하기 전에 실행별 결과를 즉시 저장하고, 일시 오류를 제한적으로 재시도하며, 한 URL에서 2회가
성공하면 `partial`로 계속 진행하는 orchestration을 보완한다. 최종 report를 만들 수 없는 경우에도
수집된 원시 결과는 실패 진단용 artifact로 남긴다.

이 간극은 운영 Lighthouse를 URL·회차별 독립 프로세스로 분리해 보완했다. 실패한 회차는 15초 뒤 한
번 재시도하고, 재시도까지 실패해도 다음 회차와 URL을 계속 측정한다. URL별 성공이 2회면 `partial`로
manifest에 포함하며 2회 미만인 URL이 있을 때만 수집 단계가 최종 실패한다. JSON과 HTML은 각 성공
직후 저장하고 전체 시도 내역은 `collection-summary.json`에 남긴다.

## 14. 구현 순서

### P1. 측정 계약

- [x] 대표 URL과 `SITE_URL` 검증을 구현한다.
- [x] CrUX 응답을 화이트리스트 타입으로 정규화한다.
- [x] 모바일 Lighthouse 3회 실행과 중앙값 계산을 구현한다.
- [x] 현재 CI의 LHCI 설정과 운영 측정 script를 분리한다.

### P2. 결정적 판정과 이력

- [x] Core Web Vitals 상태와 회귀 규칙을 순수 함수로 구현한다.
- [x] snapshot schema와 artifact 업로드를 구현한다.
- [x] 최근 성공 artifact 조회와 schema 불일치 폴백을 구현한다.
- [x] AI 없이 기본 Discord 카드를 전송한다.

### P3. AI 분석

- [x] strict JSON schema와 길이 제한을 정의한다.
- [x] OpenAI, Gemini provider와 fallback을 구현한다.
- [x] Lighthouse의 외부 문구를 신뢰하지 않는 입력으로 처리한다.
- [x] LLM 실패 시 기본 카드가 유지되는지 검증한다.

### P4. 운영 검증

- [ ] `workflow_dispatch`로 baseline 카드를 받는다.
- [ ] CrUX가 있는 URL과 없는 URL을 각각 확인한다.
- [ ] 임계값을 낮춘 검증 실행으로 회귀 카드를 확인한 뒤 원래 값으로 되돌린다.
- [ ] 다음 예약 실행과 직전 artifact 비교를 확인한다.
- [ ] 한 달 뒤 알림 빈도와 CrUX URL 표본 유무를 검토한다.

### P5. 자체 RUM 재검토

다음 중 하나가 한 달 동안 이어질 때만 별도 ADR을 작성한다.

- origin CrUX는 있지만 중요한 URL의 CrUX가 4회 연속 없다.
- origin CrUX도 4회 연속 없어 실제 사용자 지표를 전혀 판단할 수 없다.
- 특정 배포 직후의 회귀를 28일 이동 집계보다 빨리 찾아야 한다.

ADR은 Next.js `useReportWebVitals`, 기존 GA4 전송, 별도 Supabase 집계 중 하나를 고른다. p75 계산 가능성,
동의 철회, 데이터 보유 기간, route 일반화, 공개 수집 경로의 abuse 상한과 무료 쿼터를 함께 비교한다.

## 15. 테스트

| 대상              | 필수 사례                                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| URL 검증          | HTTPS, trailing slash, path/query 포함, 잘못된 protocol, 상태 확인 실패          |
| CrUX client       | URL/origin, phone/desktop, 데이터 없음, 일부 metric 누락, 400, 403, 429, timeout |
| Lighthouse 정규화 | 3회 중앙값, 1회 실패, 전체 실패, audit 누락, 숫자 아님                           |
| 판정              | 경계값, 15%와 CLS 0.03 경계, poor 첫 진입, 데이터 부족 1회/4회, 중복 키          |
| snapshot          | schema version, 이전 artifact 없음, 손상 JSON, 오래된 중복 키 제거               |
| provider          | schema 고정, timeout, fallback, prompt injection 문자열, 두 제공자 실패          |
| Discord           | field/lab 결합, 기본 카드, 길이 제한, 링크, `allowed_mentions`                   |
| orchestration     | 정상 무알림, baseline 강제 전송, 부분 실패, Discord 실패 exit code               |

외부 API, LLM과 Discord는 단위 테스트에서 mock한다. CrUX 실호출과 운영 Lighthouse는 수동 workflow로
각각 한 번 확인한다.

전체 구현 후 다음 검사를 통과한다.

```text
npm test
npm run check
npm run lint
npm run format:check
npm run knip
npm run deps:check
npm run build
```

## 16. 완료 조건

1. 예약 실행과 수동 실행이 같은 측정 경로를 사용한다.
2. CrUX의 LCP, INP, CLS p75를 URL과 origin, form factor별로 구분한다.
3. CrUX 데이터가 없을 때 Lighthouse 수치를 실제 사용자 지표로 표시하지 않는다.
4. 운영 URL의 Lighthouse를 세 번 실행하고 중앙값과 변동 폭을 저장한다.
5. 상태와 회귀 여부는 코드가 계산하며 LLM 출력에 의존하지 않는다.
6. AI가 실패해도 현재 수치, 이전 수치와 보고서 링크가 있는 기본 카드가 도착한다.
7. 정상 실행은 Discord에 카드를 보내지 않고 summary와 artifact만 남긴다.
8. 같은 collection period와 상태에 대한 중복 알림이 발생하지 않는다.
9. API key, provider key와 webhook URL이 Actions log나 artifact에 남지 않는다.
10. 한 번의 실제 예약 실행이 직전 snapshot을 읽어 비교하는 것을 확인한다.

## 17. 참고 문서

- [Next.js `useReportWebVitals`](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)
- [CrUX 도구별 데이터 범위](https://developer.chrome.com/docs/crux/methodology/tools)
- [CrUX API](https://developer.chrome.com/docs/crux/api)
- [CrUX History API](https://developer.chrome.com/docs/crux/history-api)
- [web.dev Core Web Vitals 기준](https://web.dev/articles/vitals)
- [GitHub Actions artifact REST API](https://docs.github.com/en/rest/actions/artifacts)
