# ADR-0006: Sentry 오류 알림을 AI 트리아지로 가공해 Discord에 보낸다

## Status

Accepted — 2026-08-18 (구현 예정. 오류 수집 자체의 개인정보 원칙은 [ADR-0004](0004-consent-gated-error-monitoring.md),
저장 계층 제약은 [ADR-0005](0005-supabase-migration.md)를 따른다.)

## Context

현재 오류 알림은 Sentry 공식 Discord Integration이 보낸다([plan 05](../plan/05-sentry-error-monitoring.md) P1).
카드에는 이슈 제목, `environment`, `release`, `app_runtime`, `area`, `transaction`이 실린다.
알림을 받은 뒤 "무엇이 깨졌고, 방문자가 무슨 일을 겪었고, 지금 봐야 하는지 나중에 봐도 되는지"를
판단하려면 매번 Sentry로 들어가 스택을 읽어야 한다. 운영자가 1명이라 이 판단 비용이 알림의 가치를 깎는다.

이미 갖고 있어서 새로 만들지 않아도 되는 것:

- env로 모델을 교체하는 LLM 호출 구조와 primary/fallback 폴백 (`src/features/chat/_lib/chat-provider.ts`)
- 두 제공자 모두 JSON 스키마로 출력을 강제하는 구현 (`gemini-chat-provider.ts`, `openai-chat-provider.ts`)
- Upstash/KV 공유 카운터 기반 호출 상한 (`chat-rate-limit.ts`)
- PostgREST 직접 `fetch` + `server-only` 서버 전용 저장소 경계 (`src/lib/supabase/rag.ts`)
- 이벤트 분류 태그 `app_runtime`, `area` (plan 05 P1에서 이미 부착)

제약:

- ADR-0005: 런타임 코드에 `service_role` 키를 두지 않는다. RLS가 보안 경계의 전부다.
- ADR-0004: 오류 데이터는 최소 수집한다. 헤더, 본문, 쿠키, 방문자 식별자, 민감 쿼리를 담지 않는다.
- 서버 0대, 월 $0.

## Decision

1. Sentry Alert Rule의 알림 대상을 Internal Integration 웹훅으로 바꾸고, Vercel Route Handler
   `/api/sentry-alert`가 받는다. 서명(`Sentry-Hook-Signature`, HMAC-SHA256)을 검증한다.
   `/monitoring`은 Sentry 터널이 쓰는 경로라 접두사를 겹치지 않는다.
2. 라우트는 검증 직후 202를 반환하고, 실제 작업은 `after()`(`next/server`)에서 수행한다.
3. LLM은 화이트리스트로 추린 이벤트 요약을 받아 JSON 스키마 고정 출력을 낸다:
   `severity`, `isNoise`, `userImpact`, `probableCause`, `suspectArea`, `recommendedActions`, `confidence`.
4. 결과를 Discord 웹훅 embed로 보낸다. **LLM이 실패하면 제목·환경·릴리즈·Sentry 링크만 담은
   기본 카드를 반드시 보낸다.**
5. 제공자는 env로 교체한다. primary는 `openai` / `gpt-5.6-luna`, 폴백은 `gemini` / `gemini-3.5-flash-lite`.
   챗봇과 같은 이름 규약(`TRIAGE_PROVIDER`, `_API_KEY`, `_MODEL` + `TRIAGE_FALLBACK_*`)을 쓴다.
6. Supabase 기록은 `security definer` RPC 2개(`claim_sentry_alert`, `complete_sentry_alert`)를
   통해서만 한다. 두 함수 모두 공유 시크릿을 검증하고 `anon`에만 실행 권한을 준다.
   `claim`은 `(issue_id, event_id)` unique 제약으로 같은 웹훅 전달의 재처리까지 한 호출에서 막는다.
   `service_role`은 도입하지 않는다.
   이 경로에서 보안 경계는 RLS가 아니라 함수 실행 권한, 시크릿 검증, 함수 안의 입력 검증이다.
   `security definer`는 소유자 권한으로 실행되어 RLS를 우회하기 때문이다.
7. Sentry 공식 Discord Integration은 뺀다. plan 05의 "일반 Discord Webhook을 직접 호출하지 않는다"
   결정을 이 ADR이 대체한다.
8. Sentry 기본 이메일 알림은 파이프라인 자체가 죽었을 때의 백업으로 남긴다.

## 추론 과정

### 공식 Discord Integration을 왜 뺐나

공식 연동을 남긴 이유는 카드에서 바로 Assign·Ignore·Resolve를 누를 수 있다는 것이었다.
AI 카드를 함께 보내면 같은 이슈로 카드가 2장 오고, 알림 채널의 신호 대 잡음이 나빠진다.
운영자가 1명이면 Assign은 의미가 없고, Ignore·Resolve는 카드의 Sentry 링크를 한 번 더 눌러
처리해도 비용이 크지 않다. 반대로 "지금 봐야 하는가"의 판단은 알림을 받는 순간에 필요하다.
잃는 것보다 얻는 것이 크다고 봤다.

대신 알림 경로가 하나로 줄어드는 대가가 생긴다. Discord 웹훅 URL 만료, 라우트 500,
Sentry 쪽 웹훅 비활성화 중 무엇이 일어나도 "알림이 안 오는 것"과 "오류가 없는 것"이 구분되지 않는다.
그래서 Sentry 기본 이메일 알림을 백업으로 남긴다. 무료이고, Production 신규 이슈로 좁히면 노이즈도 적다.
같은 이유로 LLM 실패 시 기본 카드 전송은 선택 사항이 아니라 요구사항이다.
AI가 알림 파이프라인의 단일 장애점이 되면 안 된다.

### `service_role` 대신 RPC + 공유 시크릿을 고른 이유

웹훅에는 사용자 세션이 없어서 지금의 "사용자 JWT + RLS" 쓰기 경로를 쓸 수 없다. 두 가지 방법을 놓고 봤다.

`service_role`(신 API 키 체계의 secret key)은 RLS 우회에서 끝나지 않는다. Auth Admin API
(`/auth/v1/admin/*`)까지 열리므로, 그 키 하나로 새 계정을 만들고 `app_metadata.role = "admin"`을
붙여 `is_admin()`을 통과시킬 수 있다. 즉 유출 시 상한이 "DB 오염"이 아니라 "사이트 탈취"다.

유출 확률 자체는 이 저장소에서 낮다. `NEXT_PUBLIC_` 없는 env는 브라우저 번들에서 `undefined`이고,
`server-only`가 이미 쓰이고 있으며, Sentry의 `MINIMAL_DATA_COLLECTION`이 헤더·본문·스택 로컬을 제외한다.
Vercel의 Sensitive 환경변수와 Production 전용 스코프를 쓰면 사람에 의한 유출과
공개 저장소 프리뷰 배포 경로도 막힌다.

문제는 확률이 아니라 두 가지다. 첫째, 보관 방식은 유출 확률을 낮출 뿐 폭발 반경을 바꾸지 못한다.
둘째, 같은 배포 안의 모든 서버 코드가 `process.env`를 똑같이 읽으므로 "이 라우트에서만 쓴다"는
컨벤션이지 경계가 아니다. 그 결과 해당 표면에서는 RLS가 아니라 코드의 정확성이 두 번째 보안 경계가 된다.
앞으로 그 라우트에 사용자 입력을 PostgREST 필터로 넘기는 코드가 한 줄 들어가면 전 테이블 유출로 이어진다.

RPC + 공유 시크릿은 SQL 20줄이면 되고, 시크릿이 유출돼도 할 수 있는 일은 테이블 하나에 행을 넣는 것뿐이다.
덤으로 중복 판정을 같은 호출에서 원자적으로 처리해 왕복도 하나 줄인다.
특권 쓰기가 이 알림 하나뿐인 지금 시점에서는 이쪽이 싸고 안전하다.

`security definer` 함수 자체가 권한 상승 표면이라는 점은 인지하고 있다.
`set search_path = ''` + 완전 수식 참조는 이 저장소 마이그레이션이 이미 전부 지키는 규약이라 그대로 따른다.

### 모델을 env로 두는 이유와 기본값 선택

트리아지 품질은 모델 교체로 조정하게 될 값이고, 챗봇이 이미 같은 문제를 env로 풀어놨다.
코드가 모델을 알 필요가 없도록 이름 규약까지 그대로 복사한다.

기본값은 `gpt-5.6-luna`(입력 $0.20 / 출력 $1.20 per 1M)다. 스택을 읽고 원인을 추정하는 작업이라
분류기보다 추론 쪽 능력이 필요하고, 이 가격대에서 그 조건을 만족한다.
폴백은 챗봇이 쓰는 Gemini 키를 재사용해 `gemini-3.5-flash-lite`로 둔다.
공식 연동을 뺀 이상 한쪽 제공자가 죽었을 때 기본 카드로 강등되는 것보다 폴백으로 온전한 카드가 나가는 편이 낫다.

챗봇 provider를 일반화해서 공유하지 않는다. 채팅은 스트리밍과 `links`/`references`/`contactDraft`
계약에 묶여 있고 트리아지는 단발 JSON이다. 합치면 양쪽 다 복잡해진다.
공유하는 것은 코드가 아니라 규약(env 이름, `withFallback` 형태, mock provider, symmetry 테스트)이다.

OpenAI 쪽은 Responses API를 쓰고 `temperature`를 보내지 않는다. 추론 모델이 이 값을 받지 않는 것은
`chat-tuning.ts`에 이미 기록된 제약이다. 추론 토큰이 `max_output_tokens`를 함께 소모하는 것도 같다.

### 즉시 응답 + `after()`

Sentry 웹훅은 응답이 늦으면 실패로 보고 재전송한다. LLM 호출 5~15초를 동기로 기다리면
중복 카드가 나간다. 서명 검증까지만 동기로 하고 나머지는 응답 이후로 미룬다.

### LLM에 보내는 입력을 화이트리스트로 고정하는 이유

오류 데이터가 새 외부 수신자에게 나간다. ADR-0004가 Sentry에 대해 세운 최소 수집 원칙이
LLM 제공자에게도 그대로 적용돼야 한다. 보내는 항목은 이슈 제목, culprit, level, environment,
release, 태그(`app_runtime`/`area`/`transaction`), 예외 타입과 메시지, in-app 스택 프레임,
`web_url`, 발동한 규칙 이름으로 고정한다.
URL 쿼리, 헤더, 본문, 방문자 식별자, Replay는 보내지 않는다.

발생 횟수는 넣지 않는다. issue alert 페이로드에 없어서 Sentry API를 한 번 더 호출해야 하고,
그러면 토큰이 하나 더 늘어난다. 심각도 판단은 스택과 태그로 하고 빈도는 Sentry 화면에서 본다.

## Consequences

- 알림 카드에서 Assign·Ignore·Resolve 버튼이 사라진다. 카드의 Sentry 링크로 대체한다.
- 오류 데이터의 수신자에 OpenAI와 Google이 추가된다.
  `src/features/legal/_lib/legal-documents.tsx`의 처리방침(수신자, 국가, 항목)을 갱신해야 하고,
  ADR-0004의 수신자 서술과도 정합성을 맞춘다.
- 비용은 이벤트당 $0.002 미만이다(입력 4k · 출력 600 토큰 가정). Alert Rule을
  Production의 신규·회귀·escalated로 좁히면 월 수십 건 수준이라 사실상 0에 수렴한다.
  그래도 `SENTRY_TRIAGE_DAILY_LIMIT`으로 상한을 건다.
- 이 라우트가 던진 오류를 Sentry가 잡으면 다시 알림이 오고 다시 이 라우트가 호출된다.
  Alert Rule에서 해당 transaction을 제외하고, 라우트는 내부 오류를 삼키고 항상 2xx를 반환한다.
- Supabase에 테이블 2개(`sentry_alerts`, 시크릿 보관용 private 테이블)와 RPC 2개가 늘고,
  권한·제약 검증 대상에 포함된다. RLS는 관리자 읽기에만 관여한다.
- `security definer` 함수가 이 저장소에 처음 생긴다. 앞으로 이 함수가 만지는 범위를 넓힐 때는
  RLS가 막아 주지 않는다는 전제로 검토해야 한다.
- plan 05의 "일반 Discord Webhook 직접 호출 금지"와
  `docs/troubleshooting/sentry-error-alerts.md`의 같은 지침을 이 ADR을 근거로 고친다.
- 환경변수 10종(필수 9 + 선택 1)이 늘어난다. 전부 Vercel Sensitive + Production 스코프로
  등록한다. Preview에는 넣지 않는다.

```
SENTRY_ALERT_WEBHOOK_SECRET      # Internal Integration client secret (HMAC 검증)
SENTRY_ALERT_LOG_SECRET          # Supabase RPC 인가용
DISCORD_ALERT_WEBHOOK_URL
TRIAGE_PROVIDER=openai
TRIAGE_PROVIDER_API_KEY=
TRIAGE_PROVIDER_MODEL=gpt-5.6-luna
TRIAGE_FALLBACK_PROVIDER=gemini
TRIAGE_FALLBACK_PROVIDER_API_KEY=
TRIAGE_FALLBACK_PROVIDER_MODEL=gemini-3.5-flash-lite
SENTRY_TRIAGE_DAILY_LIMIT=50     # 선택, 기본값 있음
```

## 재검토 조건

- 서버 측 특권 쓰기가 이 알림 외에 하나 더 생기면(cron 정리, 운영 대시보드, 배치 재색인 등)
  공유 시크릿을 늘리지 말고 secret key 도입을 다시 검토한다. 시크릿 3개가 흩어지는 것은 키 1개보다 나쁘다.
- 트리아지 판정이 반복해서 빗나가면 모델을 올리기 전에 입력 화이트리스트에 빠진 신호가 있는지 먼저 본다.
- 알림량이 하루 상한에 자주 닿으면 Alert Rule 조건부터 좁힌다. 상한을 올리는 것은 그다음이다.

## 착수 전 확인이 필요한 것

Sentry Internal Integration의 웹훅 헤더 이름과 `event_alert` 페이로드 형태는 현재 문서로 확인한 뒤
서명 검증을 구현한다. 여기가 틀리면 정상 요청이 401로 튕기거나 인증이 무력화된다. 추측으로 넘어가지 않는다.
