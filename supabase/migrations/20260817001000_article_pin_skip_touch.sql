-- dev_articles 의 updated_at 은 내용이 실제로 바뀔 때만 올린다.
-- 이 값은 공개 지면 세 곳으로 나간다 — JSON-LD dateModified, sitemap lastModified, OG modifiedTime.
-- 고정 토글은 pinned 컬럼만 바꾸므로 검색엔진에 본문이 수정된 것으로 보이면 안 된다.
--
-- set_updated_at() 함수는 그대로 둔다. 다른 테이블 7개가 같은 함수를 공유한다.
drop trigger set_dev_articles_updated_at on public.dev_articles;
create trigger set_dev_articles_updated_at
  before update on public.dev_articles
  for each row
  when (old.data is distinct from new.data
     or old.published is distinct from new.published
     or old.slug is distinct from new.slug
     or old.published_at is distinct from new.published_at)
  execute function public.set_updated_at();
