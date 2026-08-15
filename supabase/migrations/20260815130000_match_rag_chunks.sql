-- RAG 벡터 검색 RPC (plan 08 §6). 질문 벡터와 가까운 발행 청크를 돌려준다.
--
-- search_path: vector 확장이 extensions 스키마에 있어 search_path = '' 로는
-- <=> 연산자를 찾지 못한다. pg_catalog, extensions 로 제한하고 테이블은 완전 수식한다.
--
-- 후보는 코사인 거리 상위 match_count(기본 40, 1~100 clamp)로 자른다. 키워드 점수는
-- 애플리케이션이 이 후보 안에서만 계산하므로, 벡터 순위 밖의 키워드 단독 일치는
-- 결과에서 빠질 수 있다 (checklist 08 M6 기록).
--
-- prioritize_source_type/_id 쌍이 모두 주어지면 그 원본의 발행 청크 전부를 후보에
-- 보탠다. limit 를 두지 않는 이유: 애플리케이션의 우선 슬롯 선별은 키워드 점수를
-- 합산한 뒤 이루어지므로 여기서 벡터 순위로 자르면 강한 키워드 일치가 사라진다.
-- 원본 하나의 청크는 수십 개 규모라 전량 반환이 안전하다.
--
-- security invoker: RLS published 게이트가 호출자 권한으로 적용된다.
-- published = true 를 SQL 에도 명시해 의미와 실행 계획을 분명히 한다.

create function public.match_rag_chunks(
  query_embedding extensions.vector(512),
  target_sections text[],
  model_key text,
  match_count integer default 40,
  prioritize_source_type text default null,
  prioritize_source_id text default null
)
returns table (
  id text,
  section text,
  source_type text,
  source_id text,
  chunk_key text,
  text text,
  embedding_model text,
  vector_score double precision
)
language sql
stable
security invoker
set search_path = pg_catalog, extensions
as $$
  with main as materialized (
    select
      d.id, d.section, d.source_type, d.source_id, d.chunk_key, d.text, d.embedding_model,
      1 - (d.embedding operator(extensions.<=>) query_embedding) as vector_score
    from public.rag_documents d
    where d.published = true
      and d.embedding_model = model_key
      and d.section = any(target_sections)
      and d.section in ('profile', 'development', 'music', 'photography')
    order by d.embedding operator(extensions.<=>) query_embedding asc
    limit greatest(1, least(coalesce(match_count, 40), 100))
  ),
  prioritized as (
    select
      d.id, d.section, d.source_type, d.source_id, d.chunk_key, d.text, d.embedding_model,
      1 - (d.embedding operator(extensions.<=>) query_embedding) as vector_score
    from public.rag_documents d
    where prioritize_source_type is not null
      and prioritize_source_id is not null
      and d.published = true
      and d.embedding_model = model_key
      and d.section = any(target_sections)
      and d.section in ('profile', 'development', 'music', 'photography')
      and d.source_type = prioritize_source_type
      and d.source_id = prioritize_source_id
  )
  select distinct on (merged.id)
    merged.id, merged.section, merged.source_type, merged.source_id,
    merged.chunk_key, merged.text, merged.embedding_model, merged.vector_score
  from (
    select * from main
    union all
    select * from prioritized
  ) as merged
  order by merged.id;
$$;

-- 공개 챗봇이 무인증으로 호출한다 — 정렬 RPC 와 달리 anon 에게도 연다.
revoke execute on function public.match_rag_chunks(extensions.vector(512), text[], text, integer, text, text) from public;
grant execute on function public.match_rag_chunks(extensions.vector(512), text[], text, integer, text, text) to anon, authenticated;
