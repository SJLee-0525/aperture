# Sentry 오류 알림 AI 트리아지 구현 계획

> 상태: **계획 (미착수)**. 작성일 2026-08-18
> 선행 결정: [ADR-0006](../adr/0006-ai-error-triage-alerts.md) (이 계획의 결정과 근거)
> 관련: [ADR-0004](../adr/0004-consent-gated-error-monitoring.md) (오류 수집 개인정보 원칙),
> [ADR-0005](../adr/0005-supabase-migration.md) (런타임 service_role 금지), [plan 05](05-sentry-error-monitoring.md) (현재 알림 구성)
> 원칙 유지: 서버 0대, 월 $0.
>
> 보안 경계: 일반 데이터 접근은 RLS가 경계다. 사용자 세션이 없는 이 웹훅 쓰기 경로는
> RLS를 쓸 수 없으므로 최소 권한 `security definer` RPC와 공유 시크릿이 별도 경계를 이룬다.
> `security definer` 함수는 소유자 권한으로 실행되어 RLS를 우회하므로, 이 경로의 실질적인
> 경계는 함수 실행 권한, 시크릿 검증, 함수 안의 입력 검증 세 가지다.

## 1. 목표와 범위

Sentry 알림이 도착한 시점에 "무엇이 깨졌고, 방문자가 무엇을 겪었고, 지금 봐야 하는지"까지
카드 안에서 판단할 수 있게 한다. 지금은 Sentry로 들어가 스택을 읽어야 그 판단이 선다.

범위 안:

- Sentry Alert 웹훅을 받는 Route Handler 1개
- env로 모델을 교체하는 트리아지 provider (OpenAI primary, Gemini 폴백)
- Discord 웹훅 카드 전송 (AI 카드 + LLM 실패 시 기본 카드)
- Supabase 기록 테이블 1개와 그 쓰기 경로 RPC 2개
- Sentry 공식 Discord Integration 제거

범위 밖:

- 관리자 화면에서 `sentry_alerts` 를 조회하는 UI. 필요해지면 후속 과제로 다룬다.
- Discord에서 이슈를 Resolve·Ignore 하는 상호작용. 카드의 Sentry 링크로 대체한다(ADR-0006).
- Sentry Seer 등 Sentry 자체 AI 기능 도입.

## 2. 전체 흐름

```
Sentry Alert Rule (Production · new/regressed/escalating)
  └→ Internal Integration webhook
       └→ POST /api/sentry-alert                       (Vercel · nodejs · maxDuration 60)
            ├ 서명 검증 실패 → 401 (여기서 끝)
            ├ 202 즉시 반환
            └ after() {
                 ├ 1. 화이트리스트 정규화
                 ├ 2. claim_sentry_alert RPC       → null 이면 같은 전달이 이미 처리됨. 종료
                 ├ 3. 일일 상한 확인 (Upstash)     → 초과면 LLM 건너뛰고 5로
                 ├ 4. 트리아지 provider 호출        → 실패·타임아웃이면 5로
                 ├ 5. Discord 카드 전송 (AI 카드 또는 기본 카드)
                 └ 6. complete_sentry_alert RPC (결과·전송 여부 기록)
               }
```

라우트 경로를 `/api/monitoring/*` 이 아니라 `/api/sentry-alert` 로 둔다.
`/monitoring` 은 `next.config.ts:91` 의 Sentry `tunnelRoute` 가 이미 쓰는 경로다. 접두사 충돌을 만들지 않는다.

## 3. 데이터 계층

### 3.1 마이그레이션 파일

`supabase/migrations/<타임스탬프>_sentry_alerts.sql` 하나에 담는다.

```sql
-- RPC 의 시크릿 해시 비교가 extensions.digest 를 쓴다. 이 저장소가 지금까지 만든 확장은
-- vector 하나뿐이라 여기서 켠다. 없으면 함수 생성은 성공하고 실행 시점에 실패한다.
create extension if not exists pgcrypto with schema extensions;

-- 시크릿 보관 스키마. PostgREST 에 노출되지 않는다.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table private.webhook_secrets (
  name text primary key,
  secret_sha256 text not null
);
```

시크릿 원문은 마이그레이션에 넣지 않는다. 값은 배포 시 대시보드 SQL 에디터에서 1회 삽입한다(§10).
평문 대신 SHA-256 해시를 저장해 DB 덤프가 유출돼도 시크릿이 드러나지 않게 한다.

```sql
create table public.sentry_alerts (
  id uuid primary key default gen_random_uuid(),
  issue_id text not null,
  alert_date date not null default (now() at time zone 'utc')::date,
  event_id text,
  short_id text,
  title text not null,
  culprit text,
  level text,
  environment text,
  release text,
  web_url text,
  -- 트리아지 결과
  severity text,
  is_noise boolean,
  user_impact text,
  probable_cause text,
  suspect_area text,
  recommended_actions jsonb,
  confidence text,
  provider text,
  model text,
  -- 처리 상태
  triage_status text not null default 'pending',
  triage_error text,
  latency_ms integer,
  notified boolean not null default false,
  notify_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint sentry_alerts_severity_check
    check (severity is null or severity in ('critical', 'high', 'medium', 'low')),
  constraint sentry_alerts_confidence_check
    check (confidence is null or confidence in ('high', 'medium', 'low')),
  constraint sentry_alerts_status_check
    check (triage_status in ('pending', 'ok', 'failed', 'skipped')),
  constraint sentry_alerts_actions_check
    check (recommended_actions is null or jsonb_typeof(recommended_actions) = 'array')
);

create unique index sentry_alerts_delivery on public.sentry_alerts (issue_id, event_id);

alter table public.sentry_alerts enable row level security;
create policy "sentry_alerts_admin_read" on public.sentry_alerts
  for select using (public.is_admin());
```

쓰기 정책은 만들지 않는다. 아래 두 함수가 유일한 쓰기 경로다.

CHECK 제약을 거는 이유는 이 표의 값이 LLM 출력에서 오기 때문이다. 스키마 강제가 뚫리거나
제공자를 바꿨을 때 enum 밖의 값이 조용히 들어오면 나중에 집계가 어긋난다.

**중복 키는 이슈가 아니라 전달 단위다.** `(issue_id, event_id)` 는 같은 웹훅 전달이
재전송됐을 때만 걸린다. 초안은 `(issue_id, alert_date)` 로 "이슈당 하루 한 번"을 걸었는데,
그러면 같은 날 신규 → 해결 → 회귀가 일어나도 첫 알림만 나가고 회귀 알림이 사라진다.
회귀 즉시 통보는 이 파이프라인이 지키려는 신호 중 하나이므로(plan 05 P1) 그 설계를 버린다.

빈도 억제는 DB가 아니라 두 곳이 담당한다. Sentry Alert Rule 의 action interval 이 같은 이슈의
반복 발동을 막고, §8의 일일 상한이 LLM 비용을 막는다. `alert_date` 는 집계용 컬럼으로만 남긴다.

`event_id` 가 없는 페이로드는 정규화 단계에서 본문 SHA-256 앞 32자를 대신 넣는다.
키가 비면 unique 제약이 무력해져 재전송이 그대로 통과한다.

### 3.2 RPC 2개

중복 판정과 결과 기록을 나눈다. LLM을 부르기 **전에** 슬롯을 선점해야 중복 호출이 막힌다.

```sql
create or replace function public.claim_sentry_alert(secret text, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed uuid;
begin
  if not exists (
    select 1 from private.webhook_secrets w
    where w.name = 'sentry_alert'
      and w.secret_sha256 = encode(extensions.digest(claim_sentry_alert.secret, 'sha256'), 'hex')
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- anon 이 실행할 수 있는 함수이므로 본문 크기와 필수 값을 여기서 막는다.
  if length(payload::text) > 16384 then
    raise exception 'payload too large' using errcode = '22001';
  end if;
  if coalesce(payload->>'issueId', '') = '' or coalesce(payload->>'eventId', '') = '' then
    raise exception 'missing identity' using errcode = '22023';
  end if;

  insert into public.sentry_alerts (
    issue_id, event_id, short_id, title, culprit, level, environment, release, web_url
  )
  values (
    left(payload->>'issueId', 64), left(payload->>'eventId', 64), left(payload->>'shortId', 64),
    left(coalesce(payload->>'title', '(제목 없음)'), 512), left(payload->>'culprit', 512),
    left(payload->>'level', 32), left(payload->>'environment', 64),
    left(payload->>'release', 128), left(payload->>'webUrl', 1024)
  )
  on conflict (issue_id, event_id) do nothing
  returning id into claimed;

  return claimed;  -- null 이면 같은 전달이 이미 처리됐다
end;
$$;

revoke execute on function public.claim_sentry_alert(text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_sentry_alert(text, jsonb) to anon;
```

`complete_sentry_alert(secret text, alert_id uuid, result jsonb)` 는 같은 시크릿 검증 뒤
트리아지 결과와 전송 여부를 UPDATE 하고 `completed_at` 을 채운다. 구조가 같으므로 본문은 생략한다.
`completed_at is null` 이 "선점됐지만 끝나지 않은 전달"의 판별 기준이다(§9 runbook).
`recommended_actions` 는 넣기 전에 `jsonb_typeof(...) = 'array'` 를 확인한다.
테이블 CHECK 와 중복되지만, 제약 위반 예외 대신 명확한 오류로 거르기 위한 것이다.

주의할 점 네 가지.

- 파라미터 이름 `secret` 이 컬럼명과 겹치지 않게 `claim_sentry_alert.secret` 으로 수식한다.
  수식을 빼면 `secret_sha256 = secret` 이 컬럼끼리 비교가 되어 조건이 항상 참이 될 수 있다.
- 함수는 기본적으로 PUBLIC 실행 권한을 갖는다. `revoke` 대상에 `anon`, `authenticated` 를 함께
  적는 것은 의도를 남기기 위해서다. 그다음 `anon` 에만 다시 부여한다.
- `search_path = ''` 이므로 `extensions.digest` 처럼 전부 수식한다. 이 저장소 마이그레이션의 공통 규약이다.
- `security definer` 는 소유자 권한으로 실행되어 RLS를 우회한다. 이 함수가 만지는 테이블과
  컬럼을 늘릴 때는 RLS가 막아 주지 않는다는 전제로 검토한다.

### 3.3 저장소 경계

`src/lib/supabase/sentry-alerts.ts` 에 `server-only` 로 둔다.
`src/lib/supabase/rag.ts` 와 같은 형태다. publishable key 를 `apikey` 헤더로 보내고
`/rest/v1/rpc/claim_sentry_alert` 를 POST 한다. `Authorization` 헤더는 쓰지 않는다.
업스트림 오류 본문은 서버 로그에만 남긴다.

## 4. 라우트

`src/app/api/sentry-alert/route.ts`

```ts
export const runtime = "nodejs";
export const maxDuration = 60;
```

`nodejs` 가 필요한 이유는 `node:crypto` 의 `timingSafeEqual` 이다.

서명은 **원문 바이트에 대해** 검증한다. Sentry는 자신이 직렬화한 본문 문자열에 HMAC-SHA256을 건다.

```
Sentry-Hook-Signature   HMAC-SHA256(client secret, 본문 문자열) 의 hex
Sentry-Hook-Resource    issue alert 는 "event_alert"
Sentry-Hook-Timestamp   전송 시각
Request-ID              요청 UUID
```

`request.json()` 으로 파싱한 뒤 다시 `JSON.stringify` 해서 검증하면 안 된다.
키 순서나 공백이 한 글자만 달라도 해시가 어긋나 정상 요청이 전부 401이 된다.
`await request.text()` 로 받은 원문을 그대로 서명 검증에 쓰고, 파싱은 검증 통과 후에 한다.

서명은 본문에만 걸리고 타임스탬프는 서명 대상이 아니다. 서명된 요청 하나가 유출되면
언제든 다시 보낼 수 있다는 뜻이다. 시각 허용 범위 검증을 넣는 대신 §3의 전달 단위 멱등성에
맡긴다. 같은 `(issue_id, event_id)` 는 선점에 실패하므로 재전송이 LLM 호출도 카드도 만들지 않는다.
본문 크기는 서명 검증 전에 상한을 두어 큰 본문의 HMAC 계산 자체를 막는다.

라우트는 얇게 유지한다. 서명 검증과 202 반환까지만 하고 나머지는
`handle-sentry-alert.ts` 에 넘긴다. `src/app/api/chat/route.ts` 와 같은 구조다.
오케스트레이션이 순수 함수 쪽에 있어야 테스트에서 provider·전송·저장소를 주입할 수 있다.

```ts
export const POST = async (request: Request) => {
  const raw = await request.text();
  if (!verifySentrySignature(raw, request.headers, process.env.SENTRY_ALERT_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  after(() => handleSentryAlert(raw, {/* provider, sender, repository */}));
  return new Response(null, { status: 202 });
};
```

`handleSentryAlert` 는 예외를 밖으로 던지지 않는다. 이 라우트가 던진 오류를 Sentry가 잡으면
다시 알림이 오고 다시 이 라우트가 호출된다. 오류는 `Sentry.captureException` 으로 기록하되,
Alert Rule 에서 이 라우트의 transaction 을 제외해 알림 고리를 끊는다.
관측은 유지하고 알림만 끊는 쪽이다.
필터 문자열은 추측하지 않는다. Next SDK 의 서버 transaction 이름은 `POST /api/sentry-alert`
형태일 수 있어 경로만 적으면 아무것도 걸리지 않는다. 배포 때 실제 이벤트의 태그 값을 확인하고 옮긴다(§10).

### 시간 예산

`maxDuration = 60` 안에서 전 구간이 끝나야 한다. `after()` 작업도 같은 상한을 쓴다.

| 구간                         | 상한 |
| ---------------------------- | ---- |
| claim RPC                    | 5초  |
| LLM primary                  | 20초 |
| LLM 폴백                     | 15초 |
| Discord 전송 (429 대기 포함) | 10초 |
| complete RPC                 | 5초  |
| 여유                         | 5초  |

폴백까지 가고 Discord 가 429 로 재시도하면 상한에 닿는다. 그래서 LLM 전체를 35초로 묶는다.
Discord `retry_after` 가 남은 예산보다 크면 재시도하지 않고 `notify_error` 에 기록한다.
카드 한 장 때문에 함수가 잘려서 기록까지 잃는 것이 더 나쁘다.

## 5. 페이로드 정규화

`src/features/sentry-triage/_lib/sentry-alert-payload.ts`

issue alert 웹훅 본문은 `action`(항상 `"triggered"`), `installation`, `data`, `actor` 로 구성된다.
쓰는 것은 `data.event` 와 `data.triggered_rule` 뿐이다. 아래 경로만 뽑고 나머지는 버린다.

| 웹훅 경로                                                               | 용도                               |
| ----------------------------------------------------------------------- | ---------------------------------- |
| `data.event.issue_id`, `event_id`                                       | 중복 판정과 기록                   |
| `data.event.title`, `culprit`, `level`                                  | 카드 제목과 분류                   |
| `data.event.environment`, `release`                                     | 카드 푸터, LLM 문맥                |
| `data.event.tags` 중 `app_runtime`, `area`, `transaction`               | 어느 표면인지                      |
| `data.event.exception` 의 타입·메시지                                   | 원인 추정의 핵심 입력              |
| `data.event.exception` 의 in-app 스택 프레임 최대 15개 (파일, 함수, 줄) | 원인 추정                          |
| `data.event.web_url`                                                    | 카드 링크                          |
| `data.triggered_rule`                                                   | 어떤 규칙이 발동했는지 (카드 푸터) |

`tags` 는 객체가 아니라 `[키, 값]` 쌍의 배열이다. 정규화 단계에서 Map으로 바꾼 뒤 세 개만 꺼낸다.

`data.event` 에는 `request`, `contexts`, `sdk` 도 실린다. 요청 URL과 헤더가 여기 들어오므로
경로를 명시적으로 뽑는 방식을 쓴다. 통째로 넘기고 몇 개를 빼는 방식은 쓰지 않는다.
Sentry가 필드를 추가하면 그대로 LLM에 흘러가기 때문이다.

발생 횟수와 최초·최근 발생 시각은 이 페이로드에 없다. 필요하면 `issue_url` 로 한 번 더 조회해야 하는데,
그러면 Sentry API 토큰이 하나 더 늘고 요청도 늘어난다. 심각도 판단은 스택과 태그만으로 하고
빈도는 Sentry 화면에서 보는 것으로 둔다.

URL 쿼리, 요청 헤더, 본문, 쿠키, 방문자 IP, Replay는 뽑지 않는다.
ADR-0004가 Sentry에 세운 최소 수집 원칙을 LLM 제공자에게도 그대로 적용한다.

모든 필드를 optional 로 다루고 누락 시 `undefined` 를 반환한다. Sentry 페이로드 형태가
버전에 따라 달라져도 정규화 단계에서 죽지 않아야 한다. 제목이 없으면 알림 자체를 포기하지 않고
`(제목 없음)` 으로 채운다.

## 6. 트리아지 provider

### 6.1 구조

`chat-provider.ts` 와 같은 형태를 복사한다. 코드를 공유하지 않는 이유는 ADR-0006에 있다.

```
src/features/sentry-triage/_lib/
  triage-provider.ts          env 선택 + withFallback + mock
  openai-triage-provider.ts
  gemini-triage-provider.ts
  triage-schema.ts            JSON schema + 파싱
  triage-prompt.ts
```

```ts
type TriageProvider = (input: {
  summary: SentryAlertSummary;
  signal: AbortSignal;
}) => Promise<TriageResult>;
```

env 이름은 `TRIAGE_PROVIDER`, `TRIAGE_PROVIDER_API_KEY`, `TRIAGE_PROVIDER_MODEL` 과
`TRIAGE_FALLBACK_*` 3종이다. `CHAT_PROVIDER` 계열과 규약이 같다.
`TRIAGE_PROVIDER=mock` 이면 고정 결과를 반환해 로컬·E2E에서 외부 호출 없이 흐름을 볼 수 있다.

폴백은 `withFallback` 을 그대로 옮긴다. 다만 스트리밍이 없으므로
`PRIMARY_NO_OUTPUT_TIMEOUT_MS` 대신 단순 `AbortSignal.timeout` 을 쓴다.
primary 20초, 폴백 15초, LLM 전체 35초다. 근거는 §4의 시간 예산 표.

### 6.2 출력 스키마

```ts
{
  severity: "critical" | "high" | "medium" | "low",
  isNoise: boolean,
  userImpact: string,      // 방문자가 실제로 겪는 증상
  probableCause: string,   // 스택 기준 추정 원인
  suspectArea: string,     // 파일 또는 함수
  recommendedActions: string[],  // 2~4개
  confidence: "high" | "medium" | "low"
}
```

OpenAI는 Responses API `text.format.json_schema` 에 `strict: true`,
Gemini는 `generationConfig.responseJsonSchema` 로 강제한다.
`buildChatResponseSchema({ strict })` 가 제공자별 strict 차이를 다루는 방식과 같은 이유다.

파싱 실패 시 살릴 것이 없으므로 `parseOrSalvageChatResult` 같은 부분 회수는 하지 않는다.
실패는 그대로 실패로 두고 기본 카드로 내려간다.

### 6.3 호출 파라미터

| 항목                        | 값                      | 이유                                                                              |
| --------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| OpenAI 모델                 | `gpt-5.6-luna`          | 입력 $0.20 / 출력 $1.20 per 1M. 스택 추론에 필요한 능력을 이 가격대에서 만족      |
| Gemini 모델                 | `gemini-3.5-flash-lite` | 챗봇 폴백과 같은 키·모델 재사용                                                   |
| `reasoning.effort` (OpenAI) | `low`                   | 챗봇은 `none` 이다. 스택을 읽고 원인을 추정하는 작업이라 최소한의 추론이 필요하다 |
| `max_output_tokens`         | 1_500                   | 추론 토큰이 함께 소모된다. 출력 스키마는 400 토큰 안쪽이라 여유가 있다            |
| `temperature` (Gemini)      | 0.2                     | 판정 일관성. 챗봇의 0.4보다 낮춘다                                                |
| `temperature` (OpenAI)      | 보내지 않음             | Responses API 추론 모델이 받지 않는다 (`chat-tuning.ts` 기록)                     |
| `thinkingConfig` (Gemini)   | 보내지 않음             | 필드가 모델 세대마다 달라 env 교체와 충돌한다 (`gemini-chat-provider.ts:22` 주석) |
| `store` (OpenAI)            | false                   | 제공자 쪽에 대화를 남기지 않는다                                                  |

### 6.4 프롬프트

출력 언어는 한국어로 고정한다. 심각도 기준을 프롬프트에 명시해 모델마다 판정이 흔들리는 폭을 줄인다.

- `critical`: 방문자 다수가 공개 페이지 렌더, 챗, 이미지 같은 핵심 경로를 쓸 수 없다. 또는 데이터가 손상된다.
- `high`: 특정 화면이나 기능이 깨졌고 우회 수단이 없다.
- `medium`: 일부 기능이 저하됐지만 우회할 수 있다.
- `low`: 단발성이거나 외부 요인이고 방문자 영향이 거의 없다.

`isNoise` 는 앱 코드 스택이 없는 브라우저 확장·외부 스크립트 오류, 사용자가 취소한 요청처럼
고칠 대상이 아닌 이벤트에만 true 를 준다. plan 05 P2의 노이즈 필터 판단을 여기서 대신한다.

`recommendedActions` 는 확인할 파일이나 재현 조건처럼 바로 실행할 수 있는 것만 쓰게 한다.
"모니터링을 강화한다" 같은 문장은 쓰지 않도록 프롬프트에 금지 예시를 넣는다.

## 7. Discord 카드

`src/features/sentry-triage/_lib/discord-card.ts` 가 embed를 만들고
`send-discord-card.ts` 가 보낸다.

| 요소        | AI 카드                                           | 기본 카드                  |
| ----------- | ------------------------------------------------- | -------------------------- |
| color       | severity 별 고정색                                | 회색                       |
| title       | `[심각도] 이슈 제목`                              | 이슈 제목                  |
| url         | Sentry `web_url`                                  | 같음                       |
| description | userImpact                                        | `AI 트리아지 실패: {사유}` |
| field 1     | 추정 원인 + 의심 위치                             | level · culprit            |
| field 2     | 권장 조치 (번호 목록)                             | 없음                       |
| footer      | `environment · release · provider/model · 확신도` | `environment · release`    |

Discord 제한을 넘기면 400이 떨어진다. title 256자, description 4096자, field value 1024자,
embed 합계 6000자에서 자른다. 자를 때는 끝에 `…` 를 붙여 잘렸다는 것을 남긴다.

전송 실패 처리:

- 429: 응답 본문의 `retry_after`(초) 만큼 기다린 뒤 1회 재시도
- 5xx: 1초 뒤 1회 재시도
- 그 외 실패: 재시도하지 않고 `notify_error` 에 기록

색상값은 Discord embed 전용 정수 상수로 이 파일에 둔다. 사이트 액센트 토큰과 무관하다.

## 8. 호출 상한과 멱등성

세 층이 각각 다른 것을 막는다. 하나로 합치려다 회귀 알림을 잃는 것이 초안의 실수였다.

| 층                                       | 담당   | 막는 것                 |
| ---------------------------------------- | ------ | ----------------------- |
| Sentry Alert Rule 조건 + action interval | Sentry | 같은 이슈의 반복 발동   |
| `(issue_id, event_id)` unique            | DB     | 같은 전달의 재전송·재생 |
| Upstash 일일 카운터                      | 앱     | LLM 비용                |

**멱등성**은 `claim_sentry_alert` 의 `(issue_id, event_id)` unique 제약이다.
삽입과 판정이 한 문장이라 경합이 없다. 같은 전달이 두 번 오면 두 번째는 아무 일도 하지 않는다.
서로 다른 전달은 통과하므로 같은 날 회귀나 재-escalation 이 일어나도 카드가 나간다.

**일일 상한**은 Upstash 카운터다. 키는 `sentry-triage:daily:v1:{UTC 날짜}`,
기본값 50, `SENTRY_TRIAGE_DAILY_LIMIT` 으로 조정한다.
`chat-rate-limit.ts` 의 Lua 스크립트와 달리 IP 윈도우가 없으므로 단순 `INCR` + `PEXPIRE` 로 충분하다.

상한을 넘으면 **LLM만 건너뛰고 기본 카드는 보낸다.** 상한은 비용을 막는 장치이지
알림을 막는 장치가 아니다. Upstash 자격증명이 없거나 응답이 실패하면 상한 없이 진행한다.
알림 누락보다 비용 초과가 낫다는 판단이고, Alert Rule 조건이 1차 방어선이라 노출이 크지 않다.

비용은 이벤트당 $0.002 미만이다(입력 4k · 출력 600 토큰 가정). 상한 50건을 다 써도 하루 $0.1 이다.

## 9. 실패 모드

이 표가 구현의 기준이다. 어느 칸에서도 "아무 일도 일어나지 않음"이 나오면 안 된다.

| 상황                   | 응답 | 카드                  | 기록                                             |
| ---------------------- | ---- | --------------------- | ------------------------------------------------ |
| 서명 불일치·누락       | 401  | 없음                  | 없음                                             |
| 본문 파싱 실패         | 202  | 없음                  | 없음 (로그만)                                    |
| 같은 전달 재전송·재생  | 202  | 없음                  | 없음 (선점 실패)                                 |
| 식별자 누락·본문 초과  | 202  | 없음                  | 없음 (RPC 거부, 로그만)                          |
| 일일 상한 초과         | 202  | 기본 카드             | `triage_status=skipped`                          |
| primary LLM 실패       | 202  | 폴백 결과로 AI 카드   | `provider=gemini`                                |
| 양쪽 LLM 실패·타임아웃 | 202  | 기본 카드             | `triage_status=failed`, 사유                     |
| 스키마 파싱 실패       | 202  | 기본 카드             | `triage_status=failed`                           |
| Discord 429·5xx        | 202  | 재시도 1회            | 실패 시 `notify_error`                           |
| Discord 최종 실패      | 202  | 없음                  | `notified=false` + 사유. 이메일 백업이 최후 수단 |
| 기록 시크릿 미설정     | 202  | 기본 흐름 그대로 진행 | 없음. 설정 오류로 보고 `console.error`           |
| Supabase claim 실패    | 202  | 기본 흐름 그대로 진행 | 없음 (런타임 장애)                               |
| 라우트 내부 예외       | 202  | 상황에 따름           | Sentry 캡처, 알림 규칙에서 제외                  |

`SENTRY_ALERT_LOG_SECRET` 미설정과 RPC 런타임 실패는 결과가 같지만 원인이 다르다.
전자는 배포 설정 오류라 RPC 를 부르지 않고 로그만 남기고, 후자는 장애라 호출 후 실패를 삼킨다.
로그를 나눠야 "설정을 안 넣은 것"과 "DB가 죽은 것"을 나중에 구분할 수 있다.
`.env.example` 의 "인프라 시크릿 3종" 문장은 전자를 가리킨다.

Supabase가 죽었을 때 카드를 보내는 쪽을 택한 이유는 DB가 로그이지 알림의 관문이 아니기 때문이다.
대가로 멱등성이 함께 사라진다. Sentry가 재전송하면 카드가 두 번 나갈 수 있다.
202를 즉시 반환하므로 재전송 자체가 드물다고 보고 감수한다.

선점에 성공한 뒤 `after()` 전체가 죽으면 그 전달은 카드도 없고 재시도도 없다.
행은 `triage_status = 'pending'`, `notified = false` 로 남는다. 자동 회수는 넣지 않는다.
같은 전달을 다시 처리해서 얻을 것이 없고, 다음 발동은 다른 `event_id` 라 그대로 통과하기 때문이다.
대신 운영에서 이 상태를 볼 수 있어야 한다.

```sql
-- 처리가 끝나지 않은 전달 확인 (관리자 세션으로 실행)
select id, issue_id, title, triage_status, notified, notify_error, created_at
from public.sentry_alerts
where completed_at is null or notified = false
order by created_at desc
limit 50;
```

이 목록이 계속 쌓이면 파이프라인이 조용히 죽은 것이다. 그 사이의 오류는 Sentry 기본 이메일
알림으로 확인한다. 이메일 백업을 남기는 이유가 이것이다.

## 10. 배포 순서

순서가 중요하다. 공식 Discord Integration 제거는 마지막이다.

1. 마이그레이션 적용. Supabase SQL 에디터에서 시크릿 1회 삽입:
   `insert into private.webhook_secrets values ('sentry_alert', encode(digest('<시크릿>','sha256'),'hex'));`
2. Sentry에서 Internal Integration 생성. 웹훅 URL을 `https://<도메인>/api/sentry-alert` 로 등록하고
   client secret 을 확보한다. Alert Rule 의 알림 대상에 이 통합을 추가한다.
3. Alert Rule 조건을 Production · 신규/회귀/escalated 로 좁힌다. 이 라우트의 transaction 제외
   필터는 **실제 이벤트의 태그 값을 확인한 뒤** 작성한다. 라우트에서 오류를 한 번 내고 Sentry
   이벤트의 `transaction` 값을 그대로 복사한다. `POST /api/sentry-alert` 형태일 수 있어
   경로만 적으면 필터가 아무것도 걸지 못하고 알림 고리가 안 끊긴다.
4. Discord에서 `#aperture-errors` 채널 웹훅 URL을 발급한다.
5. Vercel에 필수 환경변수 9종을 Production 스코프 · Sensitive 로 등록한다(선택 항목
   `SENTRY_TRIAGE_DAILY_LIMIT` 제외). Preview에는 넣지 않는다.
6. 배포 후 Sentry에서 테스트 오류를 발생시켜 카드 도착, 링크, 잘림, 색상을 확인한다.
7. `sentry_alerts` 행이 남았는지, 같은 전달을 다시 보내면 두 번째 카드가 안 나가는지 확인한다.
8. 기본 이메일 알림 규칙이 살아 있는지 확인한다.
9. **공식 Discord Integration 제거.**
10. 문서 갱신(§12).

## 11. 테스트

전부 vitest 단위 테스트다. 실제 LLM·Discord·Supabase 호출은 하지 않는다.

| 파일                               | 검증                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-sentry-signature.test.ts`  | 유효 서명 통과, 변조 본문 거부, 헤더 누락 거부, 시크릿 미설정 시 거부                                                                  |
| `sentry-alert-payload.test.ts`     | 실물 fixture 계약, 화이트리스트 밖 필드(헤더·쿼리·쿠키) 미포함, 필드 누락 시 기본값, 스택 15개 절단, `event_id` 없을 때 본문 해시 대체 |
| `triage-schema.test.ts`            | 정상 파싱, 잘린 JSON 거부, enum 밖 severity 거부                                                                                       |
| `triage-provider.test.ts`          | env 조합별 선택, 폴백 승격, 양쪽 미설정 시 unavailable                                                                                 |
| `triage-provider-symmetry.test.ts` | 두 제공자가 같은 입력에 같은 형태를 반환 (`chat-provider-symmetry.test.ts` 와 같은 취지)                                               |
| `discord-card.test.ts`             | severity 별 색, 길이 제한 절단, 기본 카드 구성                                                                                         |
| `send-discord-card.test.ts`        | 429 `retry_after` 준수, 5xx 1회 재시도, 그 외 즉시 포기                                                                                |
| `handle-sentry-alert.test.ts`      | §9 표의 각 행. 특히 LLM 실패 시 기본 카드가 나가는지                                                                                   |

`handle-sentry-alert` 는 provider·전송기·저장소를 인자로 받는다.
`handle-chat-request.ts` 가 `provider`, `intentClassifier`, `rateLimiter` 를 받는 것과 같은 이유다.

정규화 테스트는 §13.2에서 캡처한 실물 페이로드를 fixture 로 쓴다. 손으로 만든 입력만 쓰면
Sentry가 실제로 보내는 형태와 어긋나도 통과한다.

DB 쪽은 `supabase/migrations` 검증 흐름에 따라 확인한다. 확인할 것은 다섯 가지다.

- anon 이 `sentry_alerts` 를 직접 SELECT·INSERT 하지 못한다
- 틀린 시크릿으로 RPC 가 거부된다
- **맞는 시크릿으로 RPC 가 행을 만들고 id 를 돌려준다** (실패 경로만 검증하면 함수가 항상
  거부해도 테스트가 통과한다)
- 같은 `(issue_id, event_id)` 두 번째 호출이 null 을 돌려준다
- enum 밖 `severity` 와 배열 아닌 `recommended_actions` 가 CHECK 로 거부된다

## 12. 문서 갱신

선행 결정을 뒤집는 문서는 착수 전에 정리했다(2026-08-18).

| 파일                                              | 내용                                                                       | 상태                    |
| ------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------- |
| `docs/plan/05-sentry-error-monitoring.md`         | 머리말 경고 + P1 절을 ADR-0006 기준으로 재작성. 이관 항목 표시             | 완료                    |
| `docs/troubleshooting/sentry-error-alerts.md`     | 판별표 2행 추가, "AI 트리아지 카드가 오지 않을 때" 절 신설, 기존 지침 철회 | 완료                    |
| `docs/adr/0004-consent-gated-error-monitoring.md` | 수신자 확장 보완 기록                                                      | 완료                    |
| `docs/adr/0005-supabase-migration.md`             | service_role 금지 원칙을 웹훅 경로에 적용한 사례로 상호 참조               | 완료                    |
| `.env.example`                                    | 신규 env 10종(필수 9 + 선택 1)과 발급 절차                                 | 완료                    |
| `src/features/legal/_lib/legal-documents.tsx`     | 오류 데이터 수신자에 OpenAI·Google 추가, 국가·항목·목적 고지               | 배포와 같은 변경에 포함 |
| `CLAUDE.md` 환경변수 절                           | 신규 env 요약                                                              | 구현 시                 |

처리방침만 시점을 미룬다. 배포 전에 갱신하면 실제로는 나가지 않는 수신자를 고지하게 된다.
파이프라인이 켜지는 변경과 같은 커밋에 넣는다.

### 처리방침 갱신 시 함께 볼 항목: Sentry 지역 수집

§13.2 캡처에서 확인한 사실이다. Sentry 가 이벤트에 `user.geo` 를 붙인다.

```json
"user": { "geo": { "city": "...", "country_code": "KR", "region": "...", "subdivision": "..." } }
```

브라우저 SDK 설정에 `infer_ip: "never"` 가 들어 있는데도 Sentry 서버가 수집 시점 IP 로
도시 단위 위치를 파생해 저장한다. 이 파이프라인이 LLM 으로 보내는 화이트리스트에는 없지만,
**Sentry 가 보관하는 항목**이므로 처리방침의 수집 항목 고지 대상이다.

처리방침을 고칠 때 이 항목이 이미 고지돼 있는지 확인하고, 없으면 함께 추가한다.
이 계획의 범위 밖이라 지금은 기록만 남긴다.

## 13. 착수 전 확인

### 13.1 문서로 확인한 것과 아직 아닌 것 (2026-08-18)

출처:

- <https://docs.sentry.io/organization/integrations/integration-platform/webhooks/>
- <https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issue-alerts/>

문서가 명시하는 것(§4·§5에 반영):

- 헤더 4종(`Sentry-Hook-Signature`, `Sentry-Hook-Resource`, `Sentry-Hook-Timestamp`, `Request-ID`)
- 서명은 HMAC-SHA256이며 서명 대상은 본문 문자열
- issue alert 의 resource 값은 `event_alert`, `action` 은 `triggered`
- 최상위 키 `action`, `installation`, `data`, `actor`
- `data.event` 의 필드 이름과 `data.triggered_rule`

문서가 형태까지 정하지 않는 것:

- `data.event.exception` 의 하위 구조와 in-app 프레임 표시 방식.
  Sentry 이벤트는 API 응답 형태에 따라 예외·스택이 `entries` 아래에 오는 경우가 있다.
- `tags` 배열 원소의 정확한 표현.

두 번째 묶음은 §13.2의 실물 캡처로 확정한다. 그전에는 정규화 코드를 확정하지 않는다.

### 13.2 실물 페이로드 캡처 (구현 중 1회)

문서에 없는 것은 `exception` 하위 구조의 정확한 깊이와 in-app 프레임 표시 방식이다.
정규화 코드를 쓰기 전에 실물을 한 번 받아 본다.

1. Sentry에서 Internal Integration 을 만들고 웹훅 URL을 임시 수집 주소로 지정한다.
2. Preview 배포에서 테스트 오류를 한 번 낸다. 실제 방문자 데이터가 아닌 합성 오류를 쓴다.
3. 받은 본문을 `src/features/sentry-triage/_lib/__fixtures__/event-alert.json` 으로 저장하고
   정규화 테스트의 입력으로 쓴다.
4. 임시 수집 주소는 확인 후 폐기하고 웹훅 URL을 실제 라우트로 바꾼다.

외부 수집 서비스에 본문을 보내는 단계이므로 합성 오류만 쓴다.
로컬에서 받고 싶으면 임시 수집 주소 대신 터널링 도구로 로컬 라우트를 노출해도 된다.

### 13.3 모델 파라미터 확인 완료 (2026-08-18, 실호출)

`gpt-5.6-luna` 에 `reasoning.effort: "low"` + `text.format.json_schema`(`strict: true`) +
`max_output_tokens` + `store: false` 를 함께 보내 200과 `{"ok":true}` 를 받았다.
§6.3 표는 그대로 간다. 재확인이 필요할 때 쓰는 요청은 아래와 같다.

```bash
curl -s https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.6-luna",
    "instructions": "Reply with the given schema.",
    "input": [{ "role": "user", "content": "ping" }],
    "reasoning": { "effort": "low" },
    "max_output_tokens": 200,
    "store": false,
    "text": {
      "format": {
        "type": "json_schema",
        "name": "probe",
        "strict": true,
        "schema": {
          "type": "object",
          "additionalProperties": false,
          "properties": { "ok": { "type": "boolean" } },
          "required": ["ok"]
        }
      }
    }
  }' | head -40
{
"id": "resp_02d3f531de759d1c016a845fca03cc819897dc7021ac9c8dc6",
"object": "response",
"created_at": 1787060170,
"status": "completed",
"background": false,
"billing": {
  "payer": "developer"
},
"completed_at": 1787060171,
"error": null,
"frequency_penalty": 0.0,
"incomplete_details": null,
"instructions": "Reply with the given schema.",
"max_output_tokens": 200,
"max_tool_calls": null,
"model": "gpt-5.6-luna",
"moderation": null,
"output": [
  {
    "id": "msg_02d3f531de759d1c016a845fcb205081989e5f1ff88e0e8431",
    "type": "message",
    "status": "completed",
    "content": [
      {
        "type": "output_text",
        "annotations": [],
        "logprobs": [],
        "text": "{\"ok\":true}"
      }
    ],
    "phase": "final_answer",
    "role": "assistant"
  }
],
"parallel_tool_calls": true,
"presence_penalty": 0.0,
"previous_response_id": null,
"prompt_cache_key": null,
"prompt_cache_retention": "24h",
```

400이 오면 응답의 `error.param` 이 어떤 파라미터를 거부했는지 알려준다. 그 항목만 §6.3에서 뺀다.
`reasoning` 이 거부되면 챗봇처럼 `effort` 를 아예 보내지 않는 쪽으로 맞춘다.

Gemini 폴백은 별도 확인을 하지 않는다. `gemini-3.5-flash-lite` 는 챗봇이 이미 같은 조합
(`responseMimeType` + `responseJsonSchema`)으로 쓰고 있다.

응답에 `prompt_cache_retention: "24h"` 가 있고 캐시 읽기 단가가 입력의 1/10이다(`$0.02` per 1M).
심각도 기준과 금지 예시처럼 매번 같은 문장은 `instructions` 앞쪽에 모아 두면 캐시에 걸릴 수 있다.
호출량이 하루 수십 건이라 절감액 자체는 무시할 수준이므로, 프롬프트를 이 목적으로 비틀지는 않는다.
