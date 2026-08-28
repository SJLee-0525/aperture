-- Sentry AI 트리아지 기록 (docs/plan/10 §3, ADR-0006).
--
-- 이 경로에는 사용자 세션이 없어 RLS 로 인가할 수 없다. service_role 도 쓰지 않는다
-- (ADR-0005). 대신 공유 시크릿을 검증하는 security definer 함수 두 개만 쓰기를 허용한다.
-- 그러므로 이 표면의 보안 경계는 RLS 가 아니라 함수 실행 권한, 시크릿 검증,
-- 함수 안의 입력 검증이다.

-- 시크릿 해시 비교에 extensions.digest 를 쓴다. 이 프로젝트가 지금까지 만든 확장은
-- vector 하나뿐이라 여기서 켠다. 없으면 함수 생성은 성공하고 실행 시점에 실패한다.
create extension if not exists pgcrypto with schema extensions;

-- 시크릿 보관 스키마. PostgREST 에 노출되지 않는다.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.webhook_secrets (
  name text primary key,
  secret_sha256 text not null
);

-- 시크릿 값은 이 파일에 넣지 않는다. 배포 시 대시보드 SQL 에디터에서 1회 삽입한다:
--   insert into private.webhook_secrets
--     values ('sentry_alert', encode(extensions.digest('<원문>', 'sha256'), 'hex'));
-- 평문 대신 해시를 저장해 DB 덤프가 유출돼도 시크릿이 드러나지 않게 한다.

create table public.sentry_alerts (
  id uuid primary key default gen_random_uuid(),
  issue_id text not null,
  event_id text not null,
  -- 집계용. 중복 판정에는 쓰지 않는다.
  alert_date date not null default (now() at time zone 'utc')::date,
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

  -- 아래 값은 LLM 출력에서 온다. 스키마 강제가 뚫리거나 제공자를 바꿨을 때
  -- 열거값 밖의 값이 조용히 들어오면 나중에 집계가 어긋난다.
  constraint sentry_alerts_severity_check
    check (severity is null or severity in ('critical', 'high', 'medium', 'low')),
  constraint sentry_alerts_confidence_check
    check (confidence is null or confidence in ('high', 'medium', 'low')),
  constraint sentry_alerts_status_check
    check (triage_status in ('pending', 'ok', 'failed', 'skipped')),
  constraint sentry_alerts_actions_check
    check (recommended_actions is null or jsonb_typeof(recommended_actions) = 'array')
);

-- 중복 키는 이슈가 아니라 전달 단위다. 이슈 단위로 묶으면 같은 날 일어난 회귀 알림이
-- 첫 알림에 합쳐져 사라진다. 반복 발동 억제는 Sentry Alert Rule 의 action interval 이 맡는다.
create unique index sentry_alerts_delivery on public.sentry_alerts (issue_id, event_id);
create index sentry_alerts_created_at on public.sentry_alerts (created_at desc);

alter table public.sentry_alerts enable row level security;

-- 읽기는 관리자만. 쓰기 정책은 만들지 않는다. 아래 두 함수가 유일한 쓰기 경로다.
create policy "sentry_alerts_admin_read" on public.sentry_alerts
  for select using (public.is_admin());

/*
 * 웹훅 전달 하나를 선점한다.
 *
 * LLM 을 부르기 전에 호출해야 중복 전달이 제공자 호출까지 가지 않는다.
 * 같은 (issue_id, event_id) 가 이미 있으면 null 을 돌려주고 호출자는 그대로 종료한다.
 */
create or replace function public.claim_sentry_alert(secret text, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed uuid;
begin
  -- 파라미터 이름이 컬럼과 겹치므로 함수명으로 수식한다. 수식을 빼면 컬럼끼리
  -- 비교가 되어 조건이 항상 참이 된다.
  --
  -- `=` 는 조기 종료라 비교 시간이 일치 바이트 수를 드러낸다. 그래도 상수 시간 비교로
  -- 바꾸지 않는다. 여기서 새어 나갈 수 있는 값은 저장된 SHA-256 hex 이고, 이 함수를
  -- 통과하려면 그 해시가 아니라 원문 시크릿이 필요하다.
  if not exists (
    select 1 from private.webhook_secrets w
    where w.name = 'sentry_alert'
      and w.secret_sha256 = encode(extensions.digest(claim_sentry_alert.secret, 'sha256'), 'hex')
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- anon 이 실행할 수 있는 함수다. 크기와 필수 값을 여기서 막는다.
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
    left(payload->>'issueId', 64),
    left(payload->>'eventId', 64),
    left(payload->>'shortId', 64),
    left(coalesce(nullif(payload->>'title', ''), '(제목 없음)'), 512),
    left(payload->>'culprit', 512),
    left(payload->>'level', 32),
    left(payload->>'environment', 64),
    left(payload->>'release', 128),
    left(payload->>'webUrl', 1024)
  )
  on conflict (issue_id, event_id) do nothing
  returning id into claimed;

  return claimed;
end;
$$;

/*
 * 선점한 행에 판정 결과와 전송 여부를 기록한다.
 * completed_at 이 null 로 남은 행은 선점 뒤 처리가 끊긴 전달이다.
 *
 * 호출자가 alert_id 를 지정하며 소유권은 검증하지 않는다. 시크릿을 아는 쪽이면 임의의 행을
 * 덮어쓸 수 있다는 뜻이고, 이 시크릿 하나가 claim 과 complete 두 함수의 전 권한을 연다.
 * 시크릿을 서버 환경변수 밖으로 내보내지 않는 것이 경계 전부다.
 */
create or replace function public.complete_sentry_alert(secret text, alert_id uuid, result jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actions jsonb;
begin
  if not exists (
    select 1 from private.webhook_secrets w
    where w.name = 'sentry_alert'
      and w.secret_sha256 = encode(extensions.digest(complete_sentry_alert.secret, 'sha256'), 'hex')
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if length(result::text) > 16384 then
    raise exception 'payload too large' using errcode = '22001';
  end if;

  -- 제약 위반 예외 대신 명확한 오류로 거른다.
  actions := result->'recommendedActions';
  if actions is not null and jsonb_typeof(actions) <> 'array' then
    raise exception 'recommendedActions must be an array' using errcode = '22023';
  end if;

  update public.sentry_alerts
  set
    severity = left(result->>'severity', 16),
    is_noise = (result->>'isNoise')::boolean,
    user_impact = left(result->>'userImpact', 2048),
    probable_cause = left(result->>'probableCause', 2048),
    suspect_area = left(result->>'suspectArea', 512),
    recommended_actions = actions,
    confidence = left(result->>'confidence', 16),
    provider = left(result->>'provider', 32),
    model = left(result->>'model', 64),
    triage_status = coalesce(left(result->>'triageStatus', 16), 'failed'),
    triage_error = left(result->>'triageError', 1024),
    latency_ms = (result->>'latencyMs')::integer,
    notified = coalesce((result->>'notified')::boolean, false),
    notify_error = left(result->>'notifyError', 1024),
    completed_at = now()
  where id = complete_sentry_alert.alert_id;
end;
$$;

-- 함수는 기본적으로 PUBLIC 실행 권한을 갖는다. anon 과 authenticated 를 함께 적어
-- 의도를 남긴 뒤 anon 에만 다시 부여한다.
revoke execute on function public.claim_sentry_alert(text, jsonb) from public, anon, authenticated;
revoke execute on function public.complete_sentry_alert(text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.claim_sentry_alert(text, jsonb) to anon;
grant execute on function public.complete_sentry_alert(text, uuid, jsonb) to anon;
