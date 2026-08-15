-- 정렬 일괄 갱신 RPC: docs/plan/08-supabase-migration.md §2.3
-- 드래그 1회 = RPC 1회. 부분 upsert 는 data jsonb not null 검사에 걸려 쓸 수 없다.
-- security invoker 라 RLS 가 적용된다. 비관리자 호출은 0행 갱신으로 끝난다.
-- dev_articles 는 수동 정렬이 없어 대상이 아니다.

create or replace function public.update_photos_sort_orders(items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.photos p
  set sort_order = i.sort_order
  from jsonb_to_recordset(items) as i(id text, sort_order integer)
  where p.id = i.id;
$$;
revoke execute on function public.update_photos_sort_orders(jsonb) from public, anon;
grant execute on function public.update_photos_sort_orders(jsonb) to authenticated;

create or replace function public.update_albums_sort_orders(items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.albums p
  set sort_order = i.sort_order
  from jsonb_to_recordset(items) as i(id text, sort_order integer)
  where p.id = i.id;
$$;
revoke execute on function public.update_albums_sort_orders(jsonb) from public, anon;
grant execute on function public.update_albums_sort_orders(jsonb) to authenticated;

create or replace function public.update_music_works_sort_orders(items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.music_works p
  set sort_order = i.sort_order
  from jsonb_to_recordset(items) as i(id text, sort_order integer)
  where p.id = i.id;
$$;
revoke execute on function public.update_music_works_sort_orders(jsonb) from public, anon;
grant execute on function public.update_music_works_sort_orders(jsonb) to authenticated;

create or replace function public.update_music_awards_sort_orders(items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.music_awards p
  set sort_order = i.sort_order
  from jsonb_to_recordset(items) as i(id text, sort_order integer)
  where p.id = i.id;
$$;
revoke execute on function public.update_music_awards_sort_orders(jsonb) from public, anon;
grant execute on function public.update_music_awards_sort_orders(jsonb) to authenticated;

create or replace function public.update_music_media_sort_orders(items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.music_media p
  set sort_order = i.sort_order
  from jsonb_to_recordset(items) as i(id text, sort_order integer)
  where p.id = i.id;
$$;
revoke execute on function public.update_music_media_sort_orders(jsonb) from public, anon;
grant execute on function public.update_music_media_sort_orders(jsonb) to authenticated;

create or replace function public.update_dev_projects_sort_orders(items jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.dev_projects p
  set sort_order = i.sort_order
  from jsonb_to_recordset(items) as i(id text, sort_order integer)
  where p.id = i.id;
$$;
revoke execute on function public.update_dev_projects_sort_orders(jsonb) from public, anon;
grant execute on function public.update_dev_projects_sort_orders(jsonb) to authenticated;
