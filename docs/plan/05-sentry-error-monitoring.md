# Sentry 오류 모니터링 구현 및 운영 TODO

> 코드 구현과 로컬 검증은 완료됐다. 남은 작업은 배포 환경 확인, Sentry 대시보드 설정,
> Discord 알림 구성과 운영 데이터에 근거한 노이즈 정리다. 개인정보 처리 원칙은
> [ADR-0004](../adr/0004-consent-gated-error-monitoring.md)를 따른다. 배포 검증 중 이벤트나
> 알림이 보이지 않을 때는 [Sentry 오류 수집과 Discord 알림](../troubleshooting/sentry-error-alerts.md)을 본다.
>
> ⚠️ 알림 전송 경로는 [ADR-0006](../adr/0006-ai-error-triage-alerts.md)이 하나 더 늘렸다.
> 공식 Discord Integration을 남긴 채 자체 웹훅 파이프라인이 AI 트리아지 카드를 함께 보낸다(P1 절 참고).
> 이 문서의 나머지 결정(수집 범위, 동의, 태그, 노이즈 정책)은 그대로 유효하다.

## 현재 런타임 계약

| 표면            | 시작 조건                      | Replay      | 수집 범위               |
| --------------- | ------------------------------ | ----------- | ----------------------- |
| 공개 브라우저   | 사용자가 오류 보고를 별도 허용 | 오류 세션만 | 오류와 정제된 화면 기록 |
| 관리자 브라우저 | 관리자 UID 확인 뒤             | 없음        | 오류                    |
| Node·Edge       | 프로덕션 + DSN/지역 설정       | 없음        | 최소화된 오류           |

방문 분석과 오류 보고는 `ap-consent:v3`에서 따로 선택한다. 공개 브라우저에서는 동의 전까지
Sentry 청크를 내려받지 않는다. 동의를 철회하면 Replay 리스너와 세션 저장값을 정리한 뒤
클라이언트를 닫는다.

## 완료된 구현

### SDK와 배포

- [x] `@sentry/nextjs`를 브라우저·Node·Edge 런타임에 연결
- [x] 브라우저 이벤트를 동일 출처 `/monitoring` 터널로 전송
- [x] 소스맵 업로드와 릴리즈 이름을 Sentry 빌드 플러그인에서 관리
- [x] Vercel commit SHA와 로컬 package 버전을 릴리즈 이름에 사용
- [x] 업로드한 소스맵을 프로덕션 산출물에서 삭제
- [x] `@opentelemetry/core` 2.x를 운영 의존성으로 고정
- [x] DSN과 데이터 저장 지역이 없거나 일치하지 않으면 세 런타임 모두 비활성화
- [x] Vercel 환경값이 없으면 `NODE_ENV`로 environment 태그 폴백
- [x] 성능 추적과 프로파일링 비활성화

### 동의와 Replay

- [x] 방문 분석과 오류 보고를 각각 선택하는 동의 배너
- [x] 기존 v1·v2 단일 동의값을 승계하지 않고 다시 선택하도록 처리
- [x] 공개 브라우저 SDK를 오류 보고 동의 후 동적 import
- [x] 공개 오류 세션에서만 Replay 수집
- [x] 입력값 마스킹과 챗봇 대화 영역 차단
- [x] 동의 철회와 public/admin 전환 때 Replay를 먼저 중지
- [x] 관리자 UID 확인 전과 `/admin/login`에서는 관리자 모니터링 비활성화

### 개인정보 보호와 법률 문서

- [x] Sentry `dataCollection`의 모든 자동 수집 범주를 최소화
- [x] 인증 헤더, 쿠키, 요청 본문과 민감한 URL 쿼리를 전송 전에 재차 제거
- [x] breadcrumb와 Replay URL의 `q`, `token`, `code` 값 제거
- [x] 개인정보 처리방침에 수신자, 국가, 항목, 시기·방법, 목적, 보유기간과 거부 영향을 고지
- [x] Sentry가 비활성화된 빌드에서는 Sentry 처리·저장소·국외 이전 고지를 숨김
- [x] 동의 배너에서 실제 DSN 지역에 맞는 이전 국가 표시

### 검증

- [x] 실제 DSN으로 첫 테스트 오류 수신 및 이벤트 ID 확인
- [x] 원본 `.tsx` 소스 스택 확인
- [x] 동의 저장·철회·재허용 단위 및 E2E 테스트
- [x] 관리자 인증 전후 모니터링 수명주기 테스트
- [x] 민감정보 스크럽과 DSN 지역 검증 테스트
- [x] npm 10 lockfile, TypeScript, ESLint와 프로덕션 빌드 통과

## 운영 TODO

### P0. 배포 전에 확인

- [x] Vercel Production과 Preview에 `NEXT_PUBLIC_SENTRY_DSN` 등록
- [x] `NEXT_PUBLIC_SENTRY_DATA_REGION=US|DE`가 DSN ingest 지역과 일치하는지 확인
- [x] `SENTRY_AUTH_TOKEN`을 Vercel Sensitive 환경변수로 등록
- [x] Vercel의 **Automatically expose System Environment Variables** 활성화
- [x] Sentry Developer 플랜의 이벤트 보유기간이 30일인지 확인
- [x] Sentry 프로젝트의 Spike Protection 활성화
- [x] 서버 측 Data Scrubbing 활성화 후 인증·쿠키·본문 규칙 확인
- [x] Production 배포에서 개인정보 처리방침의 이전 국가와 실제 DSN 지역 비교

### P1. 이벤트 분류 태그

- [x] 모든 런타임에 `app_runtime=browser|node|edge` 태그 추가 (`runtime`은 Sentry 예약 태그)
- [x] 서버와 Edge에 `area=server|proxy` 태그 추가
- [x] 브라우저의 기존 `area=public|admin` 태그 유지
- [x] Event Highlights에 `environment`, `release`, `app_runtime`, `area`, `transaction` 등록
- [x] URL 전체, 사용자 입력, 오류 메시지처럼 값 종류가 계속 늘어나는 데이터는 태그로 넣지 않기

### P1. Discord 알림 — [ADR-0006](../adr/0006-ai-error-triage-alerts.md)이 AI 카드를 더함

> 같은 Alert Rule이 알림 대상 2개를 갖는다. 공식 Integration이 기존 카드를, 자체 웹훅 파이프라인이
> AI 트리아지 카드를 보낸다. 구현 계획은 [plan 10](10-sentry-ai-triage.md).
> 아래 항목은 공식 Integration 쪽 구성이며 그대로 유효하다.

- [x] Sentry의 공식 Discord Integration 설치
- [x] Discord에 `#aperture-errors` 채널 생성 및 연결
- [x] 알림 카드 표시 태그를 `environment,release,app_runtime,area,transaction`으로 설정
- [x] 공개 브라우저 오류는 새 이슈 또는 짧은 시간 내 반복 증가 시에만 알림
- [x] Preview에서 공개 브라우저 이슈의 Resolve → Regressed 전환과 Discord 알림 확인
- [x] Production의 새 서버·Edge·관리자 이슈를 즉시 알림 (plan 10 §10의 Alert Rule 조건으로 이관)
- [x] Production에서 해결 후 다시 발생한 Regressed 이슈를 즉시 알림 (같은 항목으로 이관)
- [x] 테스트 오류로 카드의 제목, 태그, 릴리즈와 원본 스택 링크 확인 (plan 10 §10의 6단계로 이관)
- [x] Spike Protection 발생 알림은 Sentry 기본 이메일 알림으로 받는다

일반 Discord Webhook을 직접 호출하지 않는다는 기존 결정은 유지하지 않는다.
공식 카드는 무엇이 발생했는지까지 알려주고, 무엇이 깨졌으며 지금 봐야 하는지는 Sentry에서 스택을
읽어야 판단이 섰다. 그 판단을 AI 카드가 대신한다. 근거와 대가는 ADR-0006에 있다.

두 카드를 함께 받으므로 같은 이슈로 카드가 두 장 온다. 대신 한쪽 경로가 죽어도 다른 카드가 오기 때문에
"알림이 오지 않는 것"과 "오류가 없는 것"이 구분된다. 두 경로가 모두 죽었을 때를 대비해
Sentry 기본 이메일 알림도 백업으로 남긴다.

### P2. 노이즈 필터

- [ ] 운영 1주 차에는 SDK `ignoreErrors`나 `denyUrls`를 추가하지 않고 발생 패턴 관찰
- [ ] 수정할 수 없는 외부 스크립트·브라우저 확장 오류는 먼저 Sentry에서 Archive 처리
- [ ] 앱 코드 스택이 없고 진단 가치도 없는 오류만 정확한 메시지 또는 URL 패턴으로 필터링
- [ ] 필터 추가 전 대표 이벤트 JSON과 스택을 보관하고 회귀 테스트 작성
- [ ] `ResizeObserver loop`, `Failed to fetch`, `AbortError`, `ChunkLoadError`를 이름만 보고 일괄 제외하지 않기
- [ ] 기본 grouping이 실제로 잘못된 사례가 확인된 뒤에만 custom fingerprint 추가

## 배포 후 수동 검증

- [ ] 오류 보고 미선택 상태에서 Sentry 청크와 `/monitoring` 요청이 없는지 확인
- [ ] 오류 보고 허용 후 테스트 오류와 Replay가 도착하는지 확인
- [ ] 동의 철회 뒤 새 `/monitoring` 요청이 없는지 확인
- [ ] 공개 페이지에서 admin으로 이동한 뒤 로그인 화면과 CMS Replay가 없는지 확인
- [ ] `/ko/search?q=secret` 오류의 이벤트와 Replay에서 검색어 원문이 제거됐는지 확인
- [ ] Replay에서 챗봇 대화 영역과 입력값이 보이지 않는지 확인
- [ ] 서버 이벤트에 인증 헤더, 쿠키, 본문, 방문자 IP와 스택 로컬 변수가 없는지 확인
- [ ] Production과 Preview 이벤트가 서로 다른 environment로 분류되는지 확인
- [ ] CSP 위반과 Lighthouse 회귀가 없는지 확인

첫 Production 배포 후 24시간과 7일 시점에 이벤트·Replay 쿼터와 Discord 알림량을 확인한다.
노이즈 필터와 Replay 표본 비율은 이 관찰 결과를 근거로 조정한다.
