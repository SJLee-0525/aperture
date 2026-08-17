-- 고정 토글 RPC. 상한 검사와 갱신을 한 트랜잭션에 묶는다.
-- count 조회와 update 를 나누면 두 클라이언트가 같은 개수를 읽고 각자 고정해 상한을 넘긴다.
-- security invoker 라 RLS 가 적용된다. 비관리자 호출은 0행 갱신으로 false 를 받는다.

create or replace function public.set_dev_article_pinned(
  p_id text,
  p_pinned boolean,
  p_max integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current boolean;
  v_count integer;
  v_updated integer;
begin
  -- 고정 토글끼리만 직렬화한다. 트랜잭션이 끝나면 잠금도 풀린다.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('dev_articles.pinned'));

  select pinned into v_current from public.dev_articles where id = p_id;
  if not found then
    return false;
  end if;

  -- 상태가 이미 같으면 상한 검사를 건너뛴다. 상한에 도달한 뒤에도 재시도가 성공으로 끝난다.
  if v_current = p_pinned then
    return true;
  end if;

  if p_pinned then
    select count(*) into v_count from public.dev_articles where pinned;
    if v_count >= p_max then
      raise exception 'dev_article_pin_limit' using errcode = 'check_violation';
    end if;
  end if;

  update public.dev_articles set pinned = p_pinned where id = p_id;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
revoke execute on function public.set_dev_article_pinned(text, boolean, integer) from public, anon;
grant execute on function public.set_dev_article_pinned(text, boolean, integer) to authenticated;
