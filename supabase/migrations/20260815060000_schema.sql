-- 스키마: docs/plan/08-supabase-migration.md §2.1·§2.2
-- 기존 Firestore 문서 ID를 text PK로 보존한다. 딥링크(?photo= 등)와 Storage 경로가 ID에 걸려 있다.

create extension if not exists vector with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 수동 정렬 목록 테이블 6개: 공통 골격 (id, published, sort_order, data, timestamps)

create table public.photos (
  id text primary key,
  published boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index photos_published_sort_order on public.photos (published, sort_order);
create trigger set_photos_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

create table public.albums (
  id text primary key,
  published boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index albums_published_sort_order on public.albums (published, sort_order);
create trigger set_albums_updated_at
  before update on public.albums
  for each row execute function public.set_updated_at();

create table public.music_works (
  id text primary key,
  published boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index music_works_published_sort_order on public.music_works (published, sort_order);
create trigger set_music_works_updated_at
  before update on public.music_works
  for each row execute function public.set_updated_at();

create table public.music_awards (
  id text primary key,
  published boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index music_awards_published_sort_order on public.music_awards (published, sort_order);
create trigger set_music_awards_updated_at
  before update on public.music_awards
  for each row execute function public.set_updated_at();

create table public.music_media (
  id text primary key,
  published boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index music_media_published_sort_order on public.music_media (published, sort_order);
create trigger set_music_media_updated_at
  before update on public.music_media
  for each row execute function public.set_updated_at();

create table public.dev_projects (
  id text primary key,
  published boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dev_projects_published_sort_order on public.dev_projects (published, sort_order);
create trigger set_dev_projects_updated_at
  before update on public.dev_projects
  for each row execute function public.set_updated_at();

-- 블로그 글: 수동 정렬이 없다(정렬 = published_at desc). 빈 slug 는 초안끼리 중복될 수 있어
-- UNIQUE 제약 대신 부분 unique 인덱스를 쓴다.
create table public.dev_articles (
  id text primary key,
  published boolean not null default false,
  slug text not null default '',
  published_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dev_articles_published_published_at
  on public.dev_articles (published, published_at desc, id asc);
create unique index dev_articles_slug_key on public.dev_articles (slug) where slug <> '';
create trigger set_dev_articles_updated_at
  before update on public.dev_articles
  for each row execute function public.set_updated_at();

-- 태그 사전: 도메인 타입이 {id, ko, en} 뿐이라 data jsonb 를 두지 않는다.
create table public.dev_article_tags (
  id text primary key,
  ko text not null default '',
  en text not null default ''
);

create table public.site_documents (
  id text primary key check (id in ('config', 'music', 'dev')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_site_documents_updated_at
  before update on public.site_documents
  for each row execute function public.set_updated_at();

-- RAG 청크: 차원은 EMBEDDING_PROVIDER_DIMENSIONS=512 와 짝. 차원 변경 시 컬럼 마이그레이션 필요.
-- 벡터 인덱스는 만들지 않는다. 수백 행 규모는 순차 스캔이 충분하다.
create table public.rag_documents (
  id text primary key,
  section text not null,
  source_type text not null,
  source_id text not null,
  chunk_key text not null,
  text text not null,
  embedding extensions.vector(512) not null,
  embedding_model text not null,
  published boolean not null default false
);
create index rag_documents_source on public.rag_documents (source_type, source_id);
