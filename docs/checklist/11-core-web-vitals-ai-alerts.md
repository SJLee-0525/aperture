# Core Web Vitals AI 알림 구현 체크리스트

> 기준 계획: [plan 13](../plan/13-core-web-vitals-ai-alerts.md)
> 상태: P1 구현 완료, P2 판정·snapshot·기본 카드 구현 중
> 이 문서는 구현 순서와 운영 설정을 기록한다. 수치 판정과 범위는 plan 13을 단일 출처로 삼는다.

## 0. 착수 전에 확정할 값

- [x] 운영 origin은 `https://sungjoon.works`다. Actions Variable에는 다음 값으로 등록한다.

  ```text
  SITE_URL=https://sungjoon.works
  ```

- [x] `https://sungjoon.works/`가 언어 설정에 따라 같은 origin의 `/ko` 또는 `/en`으로 307 이동하는지
      확인한다. `/`는 방문자마다 목적지가 달라지므로 Lighthouse와 URL 단위 CrUX 측정 대상에는 넣지 않는다.
- [x] 대표 경로 네 개가 운영 데이터와 외부 자원을 정상적으로 렌더하는지 브라우저에서 확인한다.
  - `https://sungjoon.works/ko`
  - `https://sungjoon.works/ko/photo`
  - `https://sungjoon.works/ko/music`
  - `https://sungjoon.works/ko/dev`
- [x] 네 경로 모두 redirect 없이 입력한 URL에 머무는 것을 확인했다.
- [x] 최종 측정 URL을 확정했다. 다른 origin으로 이동하는 경로는 측정 목록에서 뺀다.
- [x] Google Cloud 프로젝트에서 Chrome UX Report API를 켜고 API key를 발급한다.
- [x] API key의 API 제한을 Chrome UX Report API 하나로 설정한다. GitHub-hosted runner는 호출 IP가
      고정되지 않으므로 application restriction은 설정하지 않는다.
- [x] 성능 알림을 받을 Discord 채널과 webhook을 정한다.
- [x] AI primary와 fallback provider, model을 정한다. dependency security와 같은 key를 재사용할지는
      Vercel이 아니라 GitHub Actions secret 관리 범위에서 판단한다.
- [x] 저장소 Actions artifact 보존 정책이 90일 이상을 허용하는지 확인한다. 허용하지 않으면 계획과
      workflow의 `retention-days`를 저장소 상한에 맞춘다.

완료 기록:

```text
SITE_URL=https://sungjoon.works
root redirect=/ko 또는 /en, 측정 대상 아님
최종 측정 URLs=
- https://sungjoon.works/ko
- https://sungjoon.works/ko/photo
- https://sungjoon.works/ko/music
- https://sungjoon.works/ko/dev
CrUX key restriction=Chrome UX Report API
CrUX probe=PHONE origin 404 NOT_FOUND (표본 없음, 키와 API 제한은 정상)
Discord channel=#aperture-errors
primary/model=openai / gpt-5.6-luna
fallback/model=gemini / gemini-3.5-flash-lite
artifact retention=90 days
```

## 1. P1 측정 계약

### 1.1 타입과 대표 URL

- [x] `config/performance-targets.json`에 대표 경로 네 개를 정의하고 TypeScript와 LHCI가 함께 읽는다.
- [x] `scripts/performance-targets.ts`에서 `PerformanceTarget` 계약을 검증한다.
- [x] target ID가 snapshot과 Discord 중복 키에서 바뀌지 않는 식별자인지 테스트한다.
- [x] `SITE_URL` 파서를 만든다.
  - [x] HTTPS만 허용한다.
  - [x] username, password, port, path, query, fragment를 거부한다.
  - [x] trailing slash 유무를 같은 origin으로 정규화한다.
- [x] `/`의 언어 리다이렉트 계약을 별도로 확인한다.
  - [x] 응답 상태가 307인지 확인한다.
  - [x] `Location`의 origin이 `https://sungjoon.works`인지 확인한다.
  - [x] 최종 경로가 `/ko` 또는 `/en`인지 확인한다.
  - [x] 리다이렉트 결과를 대표 URL 목록이나 성능 snapshot에 추가하지 않는다.
- [x] 각 대표 URL을 GET해 2xx와 HTML content type을 확인한다.
- [x] redirect 최종 URL이 같은 origin인지 확인하고 최종 측정 URL로 저장한다.
- [x] 응답 실패, redirect loop, 다른 origin 이동을 구분해 오류를 낸다.
- [x] scheduled workflow SHA를 운영 release로 기록하지 않는다. 확인 가능한 release가 없으면 `null`을 쓴다.

### 1.2 CrUX client

- [x] `src/lib/performance-alerts/crux-client.ts`를 만든다.
- [x] endpoint는 `https://chromeuxreport.googleapis.com/v1/records:queryRecord`로 고정한다.
- [x] POST body에는 `origin` 또는 `url` 중 하나만 넣는다.
- [x] `PHONE`, `DESKTOP`을 각각 조회한다.
- [x] metric 요청 목록을 아래 세 개로 제한한다.
  - `largest_contentful_paint`
  - `interaction_to_next_paint`
  - `cumulative_layout_shift`
- [x] origin 2회와 URL별 2회, 총 10개 요청을 실행한다.
- [x] 요청별 timeout을 둔다.
- [x] 제한된 횟수로 429와 5xx를 재시도하고 `Retry-After`가 있으면 따른다.
- [x] 404 `NOT_FOUND`를 표본 없음으로 분류한다. 인증 실패나 잘못된 요청과 섞지 않는다.
- [x] p75를 정규화한다.
  - [x] LCP와 INP 정수를 millisecond로 보존한다.
  - [x] 문자열 CLS를 유한한 숫자로 변환한다.
  - [x] 음수, `NaN`, 무한대와 누락 값을 거부한다.
- [x] histogram density 세 개를 good, needs improvement, poor 비율로 변환한다.
- [x] density 합이 반올림 오차 범위에서 1인지 검사한다.
- [x] record 단위 collection period의 시작일과 종료일을 검증한다.
- [x] API key가 포함된 요청 URL과 원본 응답을 로그에 남기지 않는다.

### 1.3 운영 Lighthouse

- [x] 운영 측정용 LHCI config를 별도 파일로 만든다.
- [x] 기존 `lighthouserc.cjs`와 `npm run test:lighthouse`의 CI 계약을 바꾸지 않는다.
- [x] 대표 URL 네 개와 `numberOfRuns: 3`을 설정한다.
- [x] mobile form factor와 headless flag를 명시하고 실행 환경의 `CHROME_PATH`를 사용한다.
- [x] filesystem target으로 JSON, HTML, `manifest.json`을 남긴다.
- [x] fresh browser profile을 사용하고 동의 배너를 닫는 script를 넣지 않는다.
- [x] `src/lib/performance-alerts/lighthouse-result.ts`를 만든다.
- [x] 각 URL과 metric에 대해 세 실행의 중앙값, 최솟값, 최댓값을 계산한다.
- [x] LCP, CLS, TTFB, FCP, Total Blocking Time, Speed Index, performance score만 snapshot에 남긴다.
- [x] `isRepresentativeRun`인 보고서에서 허용한 audit를 최대 5개 읽는다.
- [x] audit의 id, title, numericValue, displayValue만 남기고 HTML과 screenshot은 버린다.
- [x] 한 번 실패하면 남은 두 값 중 나쁜 값을 사용하고 `partial` 상태를 기록한다.
- [x] 두 번 이상 실패하면 해당 URL 측정을 실패로 처리한다.

### 1.4 P1 테스트와 확인

- [x] URL 파서와 redirect 검증 단위 테스트를 작성한다.
- [x] CrUX 정상 응답 fixture를 PHONE과 DESKTOP 각각 만든다.
- [x] URL 데이터 없음, metric 일부 누락, 문자열 CLS, 400, 403, 404, 429, 500, timeout을 테스트한다.
- [x] Lighthouse 3회, 1회 실패, 2회 실패, representative run 누락과 audit 누락을 테스트한다.
- [x] 로컬 fixture로 snapshot 직전의 정규화 결과를 출력해 눈으로 확인한다.
- [x] 실제 CrUX API를 수동으로 한 번 호출하고 secret이 로그에 없는지 확인한다.
- [x] 운영 URL 한 개를 LHCI로 세 번 실행해 실행 시간과 결과 파일 구조를 확인한다.

실측 기록 (2026-08-31 KST):

```text
target=https://sungjoon.works/ko
runs=3
performance scores=0.86, 0.87, 0.87
median LCP=4,086.477ms
median CLS=0.000013416491307439514
median TBT=7ms
reports=JSON 3개, HTML 3개, representative run 1개
```

P1 품질 게이트:

```text
npm test -- performance
npm run check
npm run lint
npm run format:check
npm run knip
npm run deps:check
```

## 2. P2 판정, snapshot과 기본 카드

### 2.1 판정

- [x] `src/lib/performance-alerts/performance-status.ts`를 만든다.
- [x] LCP, INP, CLS의 good, needs improvement, poor 경계를 표 기반 테스트로 고정한다.
- [x] LCP와 INP의 15% 회귀를 계산한다.
- [x] 이전 값이 0이거나 없을 때 비율을 계산하지 않는다.
- [x] CLS의 절대 0.03 회귀를 계산한다.
- [x] poor 첫 진입은 변화율 없이 알림 대상으로 만든다.
- [x] field와 lab 판정을 별도 타입으로 유지한다.
- [x] URL별 CrUX가 없을 때 origin 결과를 해당 URL 결과로 복사하지 않는다.
- [x] `insufficient_data` 최초와 4회 연속 상태를 계산한다.
- [x] 한 metric 누락과 record 전체 없음의 상태를 구분한다.
- [x] 현재 collection period가 더 최근일 때만 field 회귀를 비교한다.
- [x] 같은 collection period는 상태만 계산하고 회귀율과 중복 알림을 만들지 않는다.
- [x] 이전보다 오래된 collection period는 비교에서 제외한다.
- [x] Lighthouse LCP, CLS, score와 Total Blocking Time 회귀 규칙을 구현한다.

### 2.2 snapshot과 이전 artifact

- [x] `src/lib/performance-alerts/snapshot.ts`를 만든다.
- [x] `schemaVersion: 1` parser가 모든 중첩 필드를 런타임에서 검증하게 한다.
- [x] `measuredAt`, `sentAt`, collection period를 ISO 날짜로 검증한다.
- [x] `sentAlerts`의 90일 만료와 중복 제거를 구현한다.
- [x] 중복 키를 target, scope, form factor, metric, status, collection period로 만든다.
- [x] 같은 workflow의 최근 완료 실행 중 현재 run 이전의 성공 실행만 찾는다.
- [x] artifact 이름을 `core-web-vitals-snapshot`으로 고정한다.
- [x] 여러 artifact가 있으면 가장 최신의 만료되지 않은 하나만 선택한다.
- [x] artifact ZIP을 임시 디렉터리에 풀지 않고 예상된 JSON 한 개만 읽는다.
- [x] path traversal이나 예상 밖 entry가 있는 ZIP을 거부한다.
- [x] 이전 artifact가 없으면 cold start로 분류한다.
- [x] 손상 JSON, 다른 schema version과 GitHub API 실패를 서로 구분한다.
- [x] 비교를 생략한 이유를 Actions summary에 남긴다.
- [x] 불완전한 현재 측정이 정상 snapshot을 덮지 않는 기준을 구현한다.

### 2.3 기본 Discord 카드

- [x] 기존 `src/lib/discord/send-webhook.ts`를 재사용한다.
- [x] `src/lib/performance-alerts/discord-report.ts`를 만든다.
- [x] field, lab, field와 lab 결합, 데이터 부족 카드를 각각 만든다.
- [x] 현재 값, 이전 값, 변화량, form factor와 collection period를 표시한다.
- [x] Lighthouse는 중앙값과 범위, partial 여부를 표시한다.
- [x] Actions run 링크와 artifact 이름을 넣는다.
- [x] AI 분석이 없을 때도 원인 없는 수치 카드를 완성한다.
- [x] Discord field별 길이와 embed 6,000자 제한을 전송 전에 적용한다.
- [x] `allowed_mentions`가 빈 배열인지 테스트한다.
- [x] 정상 상태에서는 카드를 만들지 않는다.
- [x] `send_baseline=true`일 때만 정상 baseline 카드를 만든다.

### 2.4 orchestration script

- [x] `scripts/core-web-vitals-report.ts`를 만든다.
- [x] preflight, 이전 snapshot, CrUX, Lighthouse, 판정, 전송 순서를 명시한다.
- [x] 외부 의존성을 주입해 단위 테스트에서 network와 process를 분리한다.
- [x] CrUX와 Lighthouse 부분 실패가 plan 13의 실패 표와 같은 결과를 내는지 테스트한다.
- [x] Discord 실패 시 exit code 1로 끝낸다.
- [x] 오류 메시지에서 URL query와 secret 형태를 제거한다.
- [x] `package.json`에 운영 측정 script를 추가한다.

P2 품질 게이트:

```text
npm test -- performance
npm run check
npm run lint
npm run format:check
npm run knip
npm run deps:check
```

## 3. P3 AI 분석

### 3.1 입력과 schema

- [ ] `triage-prompt.ts`에서 LLM 입력 필드를 화이트리스트로 만든다.
- [ ] 원본 CrUX 응답, Lighthouse HTML, screenshot과 전체 audit details를 넣지 않는다.
- [ ] target, scope, form factor, 현재와 이전 수치, 상태, collection period, Lighthouse audit 요약만 넣는다.
- [ ] Lighthouse title과 displayValue를 신뢰하지 않는 문자열로 취급한다.
- [ ] field와 lab의 차이, TBT가 INP 대체값이 아니라는 제한을 instructions에 넣는다.
- [ ] 저장소에 실제로 있는 검증 명령만 prompt에 제공한다.
- [ ] `PerformanceTriageResult` strict JSON schema와 parser를 만든다.
- [ ] 문자열 길이, 배열 개수, enum과 추가 속성을 제한한다.

### 3.2 provider와 fallback

- [ ] OpenAI provider를 구현한다.
- [ ] Gemini provider를 구현한다.
- [ ] primary 실패 후 fallback을 한 번 호출한다.
- [ ] 각 provider에 timeout을 둔다.
- [ ] 양쪽 실패, schema 실패와 미설정을 기본 카드로 처리한다.
- [ ] provider/model만 카드에 기록하고 원본 응답은 로그에 남기지 않는다.
- [ ] 같은 fixture로 두 provider의 출력 계약을 검증한다.
- [ ] audit 문자열 안의 prompt injection이 instructions를 바꾸지 않는지 테스트한다.

### 3.3 카드 결합

- [ ] 기본 카드에 AI 요약, 사용자 영향, 원인 후보, 확인 순서와 confidence를 선택적으로 붙인다.
- [ ] AI 필드가 길이 제한을 넘으면 정보 우선순위대로 줄인다.
- [ ] AI 실패 카드와 AI 성공 카드가 같은 사실 수치를 표시하는지 테스트한다.

P3 품질 게이트:

```text
npm test -- performance
npm run check
npm run lint
npm run format:check
npm run knip
npm run deps:check
```

## 4. P4 GitHub Actions와 운영 설정

### 4.1 workflow

- [x] `.github/workflows/core-web-vitals-report.yml`을 만든다.
- [x] `schedule`에 `17 1 * * 2,5`를 넣는다.
- [x] `workflow_dispatch`에 boolean `send_baseline` 입력을 추가한다.
- [x] `permissions`를 `actions: read`, `contents: read`로 제한한다.
- [x] 고정 concurrency group과 `cancel-in-progress: false`를 설정한다.
- [x] Ubuntu, Node.js 22, npm cache와 `npm ci`를 설정한다.
- [x] Playwright Chromium을 설치하고 `CHROME_PATH`를 LHCI에 전달한다.
- [x] job timeout을 30분으로 둔다.
- [x] 이전 snapshot 다운로드는 현재 run을 제외한다.
- [x] 측정 script가 실패해도 디버깅 가능한 Lighthouse 결과를 artifact로 올린다.
- [x] 정상적으로 완성된 snapshot만 `core-web-vitals-snapshot` 이름으로 올린다.
- [x] snapshot과 Lighthouse 보고서의 `retention-days`를 90으로 둔다.
- [x] Actions summary에 target별 field와 lab 상태 표를 쓴다.

### 4.2 repository 설정

- [ ] Actions Variable `SITE_URL`을 등록한다.
- [ ] Secret `CRUX_API_KEY`를 등록한다.
- [ ] Secret `DISCORD_PERFORMANCE_WEBHOOK_URL`을 등록한다.
- [ ] `PERFORMANCE_TRIAGE_PROVIDER`와 model을 Variables에 등록한다.
- [ ] provider API key를 Secrets에 등록한다.
- [ ] fallback provider와 model, API key를 같은 방식으로 등록한다.
- [ ] Actions workflow 실패 알림을 받을 수 있는지 GitHub 계정 설정을 확인한다.

### 4.3 수동 운영 검증

- [ ] `send_baseline=true`로 수동 실행해 정상 카드를 받는다.
- [ ] Actions log, summary와 artifact에 API key와 webhook URL이 없는지 확인한다.
- [ ] CrUX URL 데이터가 있는 target과 없는 target의 표시가 정확한지 확인한다.
- [ ] HTML 보고서 네 개가 아니라 3회 실행분 모두 보존됐는지 확인한다.
- [ ] snapshot에 원본 API 응답이나 Lighthouse HTML이 들어 있지 않은지 확인한다.
- [ ] 임시 임계값으로 lab 회귀 카드를 한 번 확인한 뒤 원래 값으로 되돌린다.
- [ ] AI primary를 의도적으로 실패시켜 fallback 카드를 확인한다.
- [ ] 두 provider를 비활성화하고 기본 카드를 확인한다.
- [ ] Discord webhook을 넣지 않은 검증은 별도 브랜치나 로컬 mock에서 수행한다. 운영 secret을 지우지 않는다.
- [ ] 다음 예약 실행이 이전 snapshot을 찾아 비교하는지 확인한다.
- [ ] 같은 collection period와 상태의 카드가 중복되지 않는지 확인한다.

## 5. 문서와 마감

- [ ] `.env.example`에는 GitHub Actions 전용 secret을 넣지 않고 주석으로 관리 위치만 안내한다.
- [ ] `README.md`의 운영 자동화 목록과 디렉터리 구조를 갱신한다.
- [ ] `docs/testing.md`에 로컬 fixture 테스트와 운영 LHCI 수동 실행법을 추가한다.
- [ ] 장애 조사 절차를 `docs/troubleshooting/core-web-vitals-alerts.md`에 작성한다.
- [ ] `CLAUDE.md`에 성능 알림 모듈과 Actions 설정을 요약한다.
- [ ] 개인정보처리방침을 바꾸지 않았음을 확인한다. 자체 RUM을 추가하지 않는 동안 새 방문자 데이터
      수신자는 없다.
- [ ] plan 13의 P1부터 P4와 완료 조건을 실제 상태에 맞게 체크한다.
- [ ] 이 체크리스트의 상태를 구현 완료 또는 운영 검증 중으로 바꾼다.

최종 품질 게이트:

```text
npm test
npm run check
npm run lint
npm run format:check
npm run knip
npm run deps:check
npm run build
```

## 6. 한 달 뒤 재검토

- [ ] 실행당 CrUX 요청 성공 수와 `insufficient_data` target 수를 기록한다.
- [ ] field와 lab 카드 수, 중복 억제 수와 AI fallback 횟수를 기록한다.
- [ ] false positive로 판단한 경고와 실제로 수정한 회귀를 구분한다.
- [ ] origin 또는 중요 URL에 CrUX가 4회 연속 없는지 확인한다.
- [ ] 28일 이동 집계보다 빠른 실사용 신호가 필요한지 판단한다.
- [ ] 조건을 만족하면 자체 RUM ADR을 작성한다. 조건을 만족하지 않으면 현재 구조를 유지한다.
