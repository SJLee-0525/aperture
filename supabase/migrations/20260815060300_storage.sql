-- Storage: 공개 버킷 media 하나. 기존 Firebase 경로(photos/·music/·dev/·dev-blog/)를
-- 프리픽스로 그대로 옮겨 URL 재작성 규칙을 단순하게 유지한다 (plan 08 §2.4).
-- 10MB·image/* 제한은 현 storage.rules 의 write 조건과 동일하다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/*'])
on conflict (id) do nothing;

-- 공개 read 는 public 버킷 URL 이 담당한다. 정책은 관리자 조작(목록·업로드·삭제)용.
create policy "media_admin_select" on storage.objects
  for select using (bucket_id = 'media' and public.is_admin());
create policy "media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());
create policy "media_admin_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
