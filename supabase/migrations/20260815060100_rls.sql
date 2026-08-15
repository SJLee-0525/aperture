-- RLS: docs/plan/08-supabase-migration.md §2.4 — firestore.rules 와 1:1 대응.
-- 관리자 판별은 app_metadata.role 클레임 단일 출처 (ADR-0005). user_metadata 는
-- 사용자가 스스로 수정할 수 있으므로 판별에 쓰지 않는다.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- published 게이트 8개 테이블: 공개는 발행 문서만 읽고, 쓰기는 관리자만.

alter table public.photos enable row level security;
create policy "photos_public_read" on public.photos
  for select using (published or public.is_admin());
create policy "photos_admin_write" on public.photos
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.albums enable row level security;
create policy "albums_public_read" on public.albums
  for select using (published or public.is_admin());
create policy "albums_admin_write" on public.albums
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.music_works enable row level security;
create policy "music_works_public_read" on public.music_works
  for select using (published or public.is_admin());
create policy "music_works_admin_write" on public.music_works
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.music_awards enable row level security;
create policy "music_awards_public_read" on public.music_awards
  for select using (published or public.is_admin());
create policy "music_awards_admin_write" on public.music_awards
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.music_media enable row level security;
create policy "music_media_public_read" on public.music_media
  for select using (published or public.is_admin());
create policy "music_media_admin_write" on public.music_media
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.dev_projects enable row level security;
create policy "dev_projects_public_read" on public.dev_projects
  for select using (published or public.is_admin());
create policy "dev_projects_admin_write" on public.dev_projects
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.dev_articles enable row level security;
create policy "dev_articles_public_read" on public.dev_articles
  for select using (published or public.is_admin());
create policy "dev_articles_admin_write" on public.dev_articles
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.rag_documents enable row level security;
create policy "rag_documents_public_read" on public.rag_documents
  for select using (published or public.is_admin());
create policy "rag_documents_admin_write" on public.rag_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- 발행 개념이 없는 공개 사전 2개: 전체 읽기 허용, 쓰기는 관리자만.

alter table public.dev_article_tags enable row level security;
create policy "dev_article_tags_public_read" on public.dev_article_tags
  for select using (true);
create policy "dev_article_tags_admin_write" on public.dev_article_tags
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.site_documents enable row level security;
create policy "site_documents_public_read" on public.site_documents
  for select using (true);
create policy "site_documents_admin_write" on public.site_documents
  for all using (public.is_admin()) with check (public.is_admin());
