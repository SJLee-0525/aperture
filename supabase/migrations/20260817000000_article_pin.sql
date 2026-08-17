-- 블로그 고정 글. 목록 최상단 섹션에 노출할 글을 표시한다.
-- 정렬은 SQL 이 아니라 목록 화면이 하므로 인덱스를 만들지 않는다. published_at 정렬은
-- 기존 dev_articles_published_published_at 이 그대로 받는다.
-- 관리자 토글이 컬럼 하나만 UPDATE 하도록 data jsonb 가 아닌 스칼라로 둔다.
alter table public.dev_articles
  add column pinned boolean not null default false;
