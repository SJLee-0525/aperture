-- 정렬 RPC 반환형을 void 에서 갱신 행 수(integer)로 바꾼다 (plan 08 §2.3 개정).
-- returns void 는 RLS 로 0행이 되어도 성공으로 보여 클라이언트 롤백이 발동하지 않는다.
-- Postgres 는 CREATE OR REPLACE 로 반환형을 바꿀 수 없어 DROP 후 재생성한다.
-- count(*) 의 원형은 bigint 라 integer 캐스팅이 필요하다.

drop function public.update_photos_sort_orders(jsonb);
create function public.update_photos_sort_orders(items jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.photos p
    set sort_order = i.sort_order
    from jsonb_to_recordset(items) as i(id text, sort_order integer)
    where p.id = i.id
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function public.update_photos_sort_orders(jsonb) from public, anon;
grant execute on function public.update_photos_sort_orders(jsonb) to authenticated;

drop function public.update_albums_sort_orders(jsonb);
create function public.update_albums_sort_orders(items jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.albums p
    set sort_order = i.sort_order
    from jsonb_to_recordset(items) as i(id text, sort_order integer)
    where p.id = i.id
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function public.update_albums_sort_orders(jsonb) from public, anon;
grant execute on function public.update_albums_sort_orders(jsonb) to authenticated;

drop function public.update_music_works_sort_orders(jsonb);
create function public.update_music_works_sort_orders(items jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.music_works p
    set sort_order = i.sort_order
    from jsonb_to_recordset(items) as i(id text, sort_order integer)
    where p.id = i.id
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function public.update_music_works_sort_orders(jsonb) from public, anon;
grant execute on function public.update_music_works_sort_orders(jsonb) to authenticated;

drop function public.update_music_awards_sort_orders(jsonb);
create function public.update_music_awards_sort_orders(items jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.music_awards p
    set sort_order = i.sort_order
    from jsonb_to_recordset(items) as i(id text, sort_order integer)
    where p.id = i.id
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function public.update_music_awards_sort_orders(jsonb) from public, anon;
grant execute on function public.update_music_awards_sort_orders(jsonb) to authenticated;

drop function public.update_music_media_sort_orders(jsonb);
create function public.update_music_media_sort_orders(items jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.music_media p
    set sort_order = i.sort_order
    from jsonb_to_recordset(items) as i(id text, sort_order integer)
    where p.id = i.id
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function public.update_music_media_sort_orders(jsonb) from public, anon;
grant execute on function public.update_music_media_sort_orders(jsonb) to authenticated;

drop function public.update_dev_projects_sort_orders(jsonb);
create function public.update_dev_projects_sort_orders(items jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.dev_projects p
    set sort_order = i.sort_order
    from jsonb_to_recordset(items) as i(id text, sort_order integer)
    where p.id = i.id
    returning 1
  )
  select count(*)::integer from updated;
$$;
revoke execute on function public.update_dev_projects_sort_orders(jsonb) from public, anon;
grant execute on function public.update_dev_projects_sort_orders(jsonb) to authenticated;
