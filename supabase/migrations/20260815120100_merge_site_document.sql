-- site 설정 문서의 부분 병합 (기존 setDoc(merge:true) 대응).
-- read-modify-write 로 구현하면 여러 화면이 한 문서를 공유할 때 오래된 스냅샷이
-- 다른 화면의 최신 필드를 덮어쓴다. 병합을 DB 한 문장으로 처리해 그 경합을 없앤다.
-- 문서가 없으면 patch 를 그대로 부트스트랩한다.

create or replace function public.merge_site_document(doc_id text, patch jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with merged as (
    insert into public.site_documents as s (id, data)
    values (doc_id, patch)
    on conflict (id) do update set data = s.data || excluded.data
    returning 1
  )
  select count(*)::integer from merged;
$$;
revoke execute on function public.merge_site_document(text, jsonb) from public, anon;
grant execute on function public.merge_site_document(text, jsonb) to authenticated;
