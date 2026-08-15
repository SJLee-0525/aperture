# Supabase 이전 구현 계획

> 상태: **계획 (미착수)** — 결정 근거: [ADR-0005](../adr/0005-supabase-migration.md), 조사: [`docs/research/firebase-to-supabase.md`](../research/firebase-to-supabase.md)
> 체크리스트: [`docs/checklist/08-supabase-migration.md`](../checklist/08-supabase-migration.md)
> 원칙: 서버 0대, 월 $0 유지. RLS가 보안 경계의 전부. 공개 읽기의 ISR + 태그 무효화 전략은 그대로 유지한다.

## 1. 전제와 범위

- 이전 대상: Firestore 컬렉션 10개 중 9개(`ragDocuments`는 데이터를 옮기지 않고 M7에서
  전체 재생성), Storage 4개 경로 프리픽스, Auth 관리자 계정 1개, RAG 벡터 검색.
- 이전하지 않는 것: 챗 파이프라인(인텐트 분류·프롬프트·스트리밍), 임베딩 생성(OpenAI 호출),
  청킹 규칙, fingerprint skip 정책, mock 저장소 전체, 이미지 압축·EXIF 계층, i18n·테마.
- 관리자 판별은 UID 비교에서 `app_metadata.role = "admin"` 클레임으로 바꾼다(ADR-0005).
- 신규 의존성은 `@supabase/supabase-js` 하나다. 추가 시 lockfile은 npm 10으로 재생성한다(CLAUDE.md).
- 코드 배치는 `src/lib/firebase/` 구조를 `src/lib/supabase/`로 미러링한다. 공개 읽기 경계는
  `src/lib/supabase/public/transport.ts`(PostgREST 직접 fetch), 관리자 쓰기는 브라우저 supabase-js.

## 2. 대상 스키마

### 2.1 공통 규칙

- 테이블명은 snake_case 복수형: `photos`, `albums`, `music_works`, `music_awards`,
  `music_media`, `dev_projects`, `dev_articles`, `dev_article_tags`, `site_documents`, `rag_documents`.
- PK는 `id text` (기존 Firestore 문서 ID 보존, 신규는 `crypto.randomUUID()` 클라이언트 선발급).
- 정렬 컬럼은 `sort_order integer`로 이름을 바꾼다. `order`는 SQL 예약어라 모든 쿼리에서
  따옴표가 필요해지고 PostgREST의 `order=` 파라미터와도 혼동된다. 디코더에서 `sortOrder ↔ order`를 매핑한다.
- 조회·인덱스 대상 필드만 스칼라 컬럼으로 뽑고 나머지는 `data jsonb` 한 컬럼에 둔다.
  `{ko,en}` map, `exif`, `image`, `links` 같은 중첩 구조는 현재 타입 그대로 jsonb에 들어가므로
  디코더 수정이 최소화된다.
- `created_at`/`updated_at`은 `timestamptz default now()` + `BEFORE UPDATE` 트리거.
  애플리케이션의 `serverTimestamp()` 15곳은 전부 삭제한다.

### 2.2 대표 DDL (photos, rag_documents)

```sql
create table photos (
  id          text primary key,
  published   boolean not null default false,
  sort_order  integer not null default 0,
  data        jsonb not null,          -- title{ko,en}, shotAt, camera, exif, image, tags[] ...
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index photos_published_order on photos (published, sort_order);

create extension if not exists vector;

create table rag_documents (
  id              text primary key,    -- encodeURIComponent(section:sourceType:sourceId:chunkKey)
  section         text not null,
  source_type     text not null,
  source_id       text not null,
  chunk_key       text not null,
  text            text not null,
  embedding       vector(512) not null,
  embedding_model text not null,       -- "text-embedding-3-small@512"
  published       boolean not null default false
);
create index rag_documents_source on rag_documents (source_type, source_id);
-- 벡터 인덱스는 만들지 않는다. 수백 행 규모는 순차 스캔이 충분하고,
-- 수만 행에 도달하면 그때 hnsw를 추가한다.
```

나머지 목록 테이블은 photos와 같은 골격이다. 예외 셋:

- `dev_articles`: photos 골격에서 `sort_order`를 뺀다. 도메인 타입에 `order` 필드가 없고
  (`src/types/dev-article.ts`) 정렬은 `publishedAt desc`다. 대신 `published_at timestamptz`와
  `slug text`를 스칼라로 추가하고 목록 인덱스를 `(published, published_at desc, id asc)`로
  만든다(현 `firestore.indexes.json`의 `__name__ ASC` 계약 대응).
  slug에는 **UNIQUE 제약을 걸지 않는다**. 현재 계약은 빈 slug 초안의 중복을 허용하는데
  (`src/lib/firebase/dev-articles.ts:84`), Postgres UNIQUE는 NULL 여러 개는 허용해도
  빈 문자열 `''`은 하나만 허용해 초안 두 개째부터 저장이 실패한다. 대신 부분 unique 인덱스를 쓴다:
  `create unique index dev_articles_slug_key on dev_articles (slug) where slug <> '';`
- `site_documents`: `id in ('config','music','dev')`인 문서 3행짜리 테이블로, `data jsonb`만 갖는다.
- `dev_article_tags`: photos 골격을 따르지 않는다. 현재 타입이 `{id, ko, en}`뿐이고
  published·정렬 필드가 없으므로(`src/types/dev-article-tag.ts`, Rules도 전체 공개 read)
  `id text primary key, ko text, en text` 세 컬럼으로 만든다.

### 2.3 정렬 일괄 갱신 RPC

드래그 정렬 저장은 upsert로 구현할 수 없다. `insert ... on conflict do update`는 충돌 판정
전에 삽입 후보 행의 NOT NULL 제약을 먼저 검사하므로, `id`와 `sort_order`만 보낸 부분
upsert는 `data jsonb not null`에 걸려 실패한다. 전체 행을 다시 보내면 편집 화면의 stale
값으로 다른 필드를 덮어쓸 수 있다. 정렬 전용 RPC를 수동 정렬 테이블 6개(photos, albums,
music_works, music_awards, music_media, dev_projects)에 같은 템플릿으로 만든다.
`dev_articles`는 수동 정렬이 없어(§2.2, `sort_order` 컬럼 없음) 대상이 아니다.

```sql
create or replace function update_photos_sort_orders(items jsonb)
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

revoke execute on function update_photos_sort_orders from public, anon;
grant execute on function update_photos_sort_orders to authenticated;
```

security invoker라 RLS가 그대로 적용된다(비관리자 호출은 0행 갱신). 동적 SQL로 테이블명을
받는 공통 함수는 allowlist 관리 비용 때문에 채택하지 않는다.

### 2.4 RLS

```sql
alter table photos enable row level security;

create policy "public read published" on photos
  for select using (published = true or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin write" on photos
  for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

- 같은 패턴을 8개 published 게이트 테이블에 적용한다. `dev_article_tags`와 `site_documents`는
  `for select using (true)` (현 Rules의 전체 공개 읽기와 동일).
- 명시하지 않은 테이블 기본 거부는 RLS enable + 정책 없음이 그 자체로 보장한다.
- Storage: 단일 공개 버킷 `media` 하나. 현재 경로(`photos/…`, `music/…`, `dev/…`, `dev-blog/…`)를
  그대로 프리픽스로 옮겨 URL 재작성 규칙을 단순하게 유지한다. 버킷 설정으로
  `file_size_limit 10MB`, `allowed_mime_types image/*`를 걸고(현 storage.rules 대응),
  `storage.objects` 정책은 공개 read + admin 클레임 write/delete.

## 3. 교체 매핑

| 현재 (Firebase) | 이후 (Supabase) | 비고 |
| --- | --- | --- |
| `lib/firebase/client.ts` | `lib/supabase/client.ts` — 브라우저 싱글턴 | 지연 함수 반환 규약 유지 (훅 의존성 배열 보호) |
| `lib/firebase/auth.ts` | `signInWithPassword`/`signOut`/`onAuthStateChange` | 에러 맵 재작성 |
| `lib/auth/verify-admin-id-token.ts` | JWKS 로컬 JWT 검증 + role 클레임 확인 | 외부 HTTP 왕복 소멸. 호출 4곳 시그니처 유지 |
| `lib/firebase/public/transport.ts` | `lib/supabase/public/transport.ts` — PostgREST fetch | `next:{revalidate,tags}` 동일 적용. decode 봉투·`__name__` 로직 소멸 |
| `lib/firebase/public/retry-fetch.ts` | 그대로 재사용 | 429 주석만 갱신 |
| `lib/firebase/admin-list-rest.ts` | PostgREST `select=` projection | 227줄이 수십 줄로 축소 |
| `lib/firebase/list-crud.ts`, `firestore.ts`, `albums.ts`, `music.ts`, `dev.ts`, `site.ts`, `dev-articles.ts` | supabase-js CRUD | `requestRagSync`·revalidate 트리거 지점은 그대로 |
| `lib/firebase/storage.ts` | `.upload`/`.remove`/`.list` | `listFolderFiles`의 getMetadata N+1 소멸 |
| `lib/ai/rag-index.ts` | **삭제** | pgvector 조회로 대체 |
| `lib/firebase/public/rag.ts` | **삭제** | RPC 호출로 대체 |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` | `supabase/migrations/*.sql` | 스키마·정책을 SQL 마이그레이션 파일로 저장소에 둔다 |
| `constants/cache.ts`의 `firestore:` 태그 | `db:` 등 중립 접두사 | 태그 생성기 2개 함수만 수정 |
| `next.config.ts` remotePatterns, `storage-source-url.ts` | `{project}.supabase.co` | Sentry 스크러버의 Authorization 처리 확인 포함 |

## 4. 단계별 계획

각 단계는 독립적으로 빌드·테스트가 통과해야 하며, M7 전까지 프로덕션은 Firebase로 계속 동작한다.

### M0 — 결정·측정·준비

ADR-0005를 Accepted로 확정한다. Firebase 콘솔에서 월 Storage 다운로드 트래픽을 확인해
egress 10GB와 비교한다(Storage 사용량 약 70MB는 확인 완료). Supabase 프로젝트를
ap-northeast-2 리전에 생성하고 관리자 계정 1개와 `app_metadata.role = "admin"`을 설정한다.

### M1 — 스키마·RLS·버킷·keep-alive

`supabase/migrations/`에 §2의 DDL·RLS·트리거를 SQL로 작성해 적용한다. `media` 버킷과
Storage 정책, GitHub Actions keep-alive 워크플로(주 2회 cron, PostgREST를 anon key로
호출, 키는 repo secrets)를 만든다. 공식 문서는 일시정지 판정 기준을 정확한 호출 횟수로
보장하지 않으므로 주 2회로 충분하다고 가정하지 않는다. M8 관찰 기간에 대시보드에서
정지 예고 여부를 확인하고 필요하면 일 1회로 올린다. `schedule` 워크플로는 기본 브랜치에서만
실행되므로 작업 브랜치가 main에 머지되기 전까지는 `workflow_dispatch` 수동 실행으로 대신한다.
마이그레이션 적용은 Supabase CLI `db push`로 원격 프로젝트에 직접 한다(로컬 Docker 스택 없이
진행, 검증은 원격 PostgREST 호출 — M0에서 확정).

### M2 — 데이터 마이그레이션 리허설

§5의 절차를 저장소 밖에서 실제 데이터로 1회 완주해 본다. 목적은 도구 검증과 변환 훅 확정이다.
결과물(컬렉션별 JSON, 변환 스크립트, URL 재작성 스크립트, 검증 쿼리)은 재실행 가능하게 보관한다.
리허설 데이터가 들어간 Supabase 프로젝트는 이후 개발·테스트의 실데이터 환경이 된다.

### M3 — 인증 교체

`lib/supabase/client.ts`·`auth.ts`, `use-auth.ts`의 role 클레임 판별, 서버 JWT 검증 교체.
`AuthGuard`·`LoginForm`·`test-admin-session` 우회는 인터페이스가 유지되므로 수정 최소.
`NEXT_PUBLIC_ADMIN_UID` 참조를 제거한다.

### M4 — 공개 읽기 교체

`lib/supabase/public/transport.ts`(PostgREST fetch + `next:{revalidate,tags}`)를 만들고
`lib/firebase/public/*.ts` fetcher들을 옮긴다. Timestamp 디코더 4종과 REST 봉투 디코딩을
삭제하고, `lib/content/` getter의 import를 바꾼다. 캐시 태그 접두사 교체와
`revalidate-public.ts`의 토큰 검증 교체(M3 결과 사용)를 포함한다.
기존 `firestore-rest.test.ts`·`transport.test.ts`를 PostgREST fixture로 갱신해 회귀 안전망으로 쓴다.

### M5 — 관리자 쓰기·Storage 교체

`lib/admin/`의 repository들과 함께, `lib/admin/` 밖에 있는 블로그 live 저장소
(`src/features/admin-dev-articles/_lib/live-dev-article-repository.ts`)와 그 하위
`lib/firebase/dev-articles.ts`(CRUD, slug 중복 검사 `findArticleSlugOwner`, 태그 CRUD)를
교체 범위에 명시적으로 포함한다. 이 경로를 빼먹으면 M5 완료 후에도 블로그 관리자
저장·삭제·태그 관리가 Firebase를 참조한다. slug 사전 조회는 부분 unique 인덱스(§2.2)가
DB에서도 막아 주지만, 폼 오류 메시지를 위해 유지한다. mock 경로와 화면은 무손상이
성공 조건이다. 이 단계에서 `updateOrder`를 배열 일괄 계약으로 바꾼다:
`updateOrder(orders: Array<{id, order}>)`를 `admin-list-repository.ts`·`use-ordered-admin.ts`·
mock 구현에 함께 적용하고, live는 §2.3의 정렬 전용 RPC 1회 호출로 구현한다
(부분 upsert는 NOT NULL 검사로 실패한다). Storage는 `storage.ts` 함수들의
시그니처를 유지한 채 내부만 교체하고, 미사용 이미지 스캔은 `.list()` 메타데이터로 단순화한다.
사진 삭제의 앨범 참조 정리는 우선 현재 로직(전 앨범 조회 후 갱신)을 유지한다. 조인 테이블
정규화는 이번 범위에서 제외한다.

### M6 — RAG pgvector 전환

§6 상세를 따른다. `portfolio-embeddings` 라우트의 Firestore commit 조립을 supabase upsert +
delete로 바꾸고(사용자 access token 전달, RLS 인가), `rag-search.ts`를 RPC 후보 + 후처리
구조로 바꾸고, `rag-index.ts`·`public/rag.ts`를 삭제한다.

### M7 — 본 데이터 이전·전환 준비

콘텐츠 편집을 동결하고(관리자 본인 1명이므로 공지 불필요) M2 스크립트로 최종 데이터를
이전한다. URL 재작성을 실행하고 §5.4 검증 쿼리로 확인한다. RAG 인덱스는 이전하지 않고
`/admin/maintenance` 전체 재생성으로 새로 만든다. Vercel 환경변수를 교체한다.

### M8 — 배포 전환·관찰·해체

배포 후 `/deploy-check` 관점 점검(빌드, RLS, 시크릿, 한도)과 수동 시나리오(공개 3섹션,
관리자 CRUD·정렬·업로드, 챗봇, 딥링크)를 돌린다. 2주 관찰 기간 동안 Firebase 프로젝트를
읽기 전용 백업으로 유지한 뒤, 문제 없으면 firebase 의존성 3종·rules 파일·`test:rules`
스크립트를 제거하고 문서를 개정한다(§10). GCP 예산 알림과 카드 등록은 해체 마지막에 정리한다.

## 5. 데이터 마이그레이션 절차 (저장소 밖 실행)

서비스 계정 키와 service_role 키를 쓰는 유일한 구간이다. 저장소 밖 임시 디렉토리에서
실행하고 완료 즉시 두 키를 폐기한다(hook의 서비스 계정 키 차단·firebase-admin 금지 원칙은
앱 런타임 대상이며, 이 1회성 스크립트와 충돌하지 않는다).

### 5.1 Firestore → Postgres

공식 도구 [`supabase-community/firebase-to-supabase`](https://github.com/supabase-community/firebase-to-supabase)를
1차 후보로 쓴다: `firestore2json.js <collection>`으로 덤프, 컬렉션명과 같은 `.js` 훅으로 변환,
`json2supabase.js`로 삽입(PK 전략 `firestore_id`). 변환 훅에서 처리할 것:

- Timestamp → ISO 문자열, 스칼라 컬럼(`published`, `sort_order`, `published_at`, `slug`) 추출,
  나머지 필드를 `data` jsonb로 묶기.
- 변환 예외: `devArticleTags`는 `data` 컬럼이 없으므로 `ko`·`en`을 직접 컬럼으로 추출한다.
  `site`는 나머지를 `data`로 묶되 문서 id가 `config`·`music`·`dev` 3종뿐인지 확인한다.
  `ragDocuments`는 덤프·이전하지 않는다(M7에서 전체 재생성).
- 커뮤니티 유지 저장소라 스키마 전략(§2.2)과 안 맞으면 무리하게 맞추지 않는다. 컬렉션 10개,
  수백 문서 규모이므로 **대안은 자체 스크립트**다: firebase-admin으로 전 문서를 JSON 덤프한 뒤
  `pg` 클라이언트로 insert하는 100줄 미만 스크립트면 충분하다. M2 리허설에서 어느 쪽으로 갈지 확정한다.

### 5.2 Storage 파일

같은 도구의 `download.js <prefix>` / `upload.js <prefix> <folder> media`를 `photos`, `music`,
`dev`, `dev-blog` 프리픽스별로 실행한다. 경로를 바꾸지 않으므로 문서의 `path` 필드는 그대로 유효하다.

### 5.3 URL 재작성

문서에 저장된 절대 URL을 `path` 기준으로 새 공개 URL
(`https://<project>.supabase.co/storage/v1/object/public/media/<path>`)로 덮는다.

- 대상 필드: `photos.data.image`, `albums.data.cover`, `music_works.data.poster`,
  `dev_projects.data.cover`·`images[]`, `dev_articles.data.cover`.
- **각 필드는 ImageMeta라 URL이 최대 3개다**: `url`, `preview.url`, `thumbnail.url`
  (`src/types/image.ts`). 화면은 preview·thumbnail을 우선 사용하므로
  (`imagePreviewUrl`/`imageThumbnailUrl` 폴백 순서) 대표 `url`만 바꾸면 마이그레이션 후에도
  대부분의 화면이 Firebase URL을 계속 요청한다. 스크립트는 ImageVariant 구조를 재귀
  순회하며 모든 `url`을 각 변형의 `path` 기준으로 변환해야 한다.
- 블로그 본문 Markdown 내부 주소: `article-body-storage-paths.ts`의 파싱 규칙을 참고해
  경로를 추출하고 문자열 치환한다.

### 5.4 검증

- 이전한 9개 컬렉션의 문서 수 = 테이블 행 수 대조 (`ragDocuments`는 재생성이므로 제외).
- URL 잔존 검사: `select count(*) from <table> where data::text like '%firebasestorage%'`를
  **`data` 컬럼이 있는 테이블에만** 실행해 0을 확인한다. `dev_article_tags`와 `rag_documents`는
  `data` 컬럼이 없어 쿼리가 실패하므로 제외한다. 이미지 URL이 실릴 수 있는 핵심 테이블은
  photos, albums, music_works, dev_projects, dev_articles 5개다. 추가 안전망으로 `pg_dump`
  텍스트 출력 전체에서 `firebasestorage` 문자열을 검색할 수 있다.
- 표본 문서(사진 1, 앨범 1, 글 1)를 공개 페이지·관리자 편집 화면에서 열어 필드 결손 확인.

## 6. RAG 전환 상세

RPC 하나를 추가한다.

```sql
create or replace function match_rag_chunks(
  query_embedding vector(512),
  target_sections text[],
  model_key text,
  match_count int default 40
) returns table (
  id text, section text, source_type text, source_id text,
  chunk_key text, text text, embedding_model text, published boolean,
  vector_score double precision
) language sql stable as $$
  select id, section, source_type, source_id, chunk_key, text, embedding_model, published,
         1 - (embedding <=> query_embedding) as vector_score
  from rag_documents
  where published = true
    and embedding_model = model_key
    and section = any(target_sections)
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- security invoker 기본값이라 RLS는 적용되지만, 실행 권한을 명시해 의도를 고정한다.
revoke execute on function match_rag_chunks from public;
grant execute on function match_rag_chunks to anon, authenticated;
```

- `rag-search.ts`는 후보 40개를 받아 기존 로직을 후처리로 유지한다: 키워드 스코어
  (`createKeywordScorer`) 계산, `vectorScore + keywordScore * 0.35`, 점수 하한
  (`vectorScore >= 0.3 || keywordScore >= 0.5`), 우선 슬롯 3개, 최종 8개. `cosineSimilarity`
  함수와 `getRagIndex` 의존이 사라진다. `1 - (embedding <=> q)`가 코사인 유사도이므로
  기존 하한 값을 그대로 쓸 수 있다.
- 우선 슬롯 대상(방문자가 열어 둔 원본)의 청크가 상위 40 밖일 수 있으므로, `prioritize`가
  있으면 보강 조회를 한다. **필터는 반드시 `(source_type, source_id)` 쌍**이다. 현재 우선
  대상 판별이 두 값을 모두 비교하고(`rag-search.ts:73-78`), `source_id`는 테이블 전역에서
  유일하지 않아 단독 필터는 다른 종류 콘텐츠의 동일 ID 청크를 섞는다. RPC에 선택 인자를
  추가한다면 `prioritize_source_type text, prioritize_source_id text` 둘 다 받는다.
  후보 합집합에 기존 선점 규칙을 적용하면 동작이 보존된다.
- 쓰기 라우트는 `insert ... on conflict (id) do update` + `delete where source_type/source_id
  and id not in (...)`로 교체한다. 배치 분할(`MAX_COMMIT_WRITES`)과 1,000문서 가드는 제거한다.
- `revalidateTag(CHAT_PROFILE_CACHE_TAG)`는 프로필 컨텍스트 캐시용으로 유지한다.
  RAG 결합만 끊긴다.

## 7. 환경변수

```dotenv
# 추가
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# 제거 (M8에서)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_ADMIN_UID=
```

publishable key(`sb_publishable_`)는 Firebase 웹 키와 같은 성격의 공개 가능 키다(보안은 RLS 담당). service_role 키는
어떤 env 파일에도 넣지 않는다. `NEXT_PUBLIC_USE_MOCK`·`NEXT_PUBLIC_ADMIN_TEST_SESSION`
스위치와 mock 가드는 그대로 유지한다.

## 8. 테스트·검증

- 단위: `transport`·디코더 테스트를 PostgREST 응답 fixture로 갱신. 저장소 계약 테스트는
  mock 구현이 기준이므로 대부분 무수정 통과가 목표.
- RLS: 로컬 Supabase에서 anon·admin 두 세션으로 §2.4 정책을 검증하는 통합 테스트를 만들어
  `test:rules`를 대체한다. 최소 케이스: 비공개 문서 anon select 거부, anon insert/update 거부,
  admin 전체 허용, storage 객체 write 거부.
- E2E: 기존 `test:e2e`는 mock 모드라 무수정. 실데이터 스모크는 M8 수동 시나리오로 갈음.
- 성능: 챗 응답에서 RPC 왕복이 추가되므로 M6에서 p50 응답 시간을 이전과 비교해 기록한다.

## 9. 롤백

- M7 전: 프로덕션은 Firebase 그대로다. 브랜치를 merge하지 않으면 영향 없음.
- M8 후 2주 관찰 기간: Firebase 프로젝트·데이터·Vercel 이전 환경변수를 보존한다. 롤백은
  이전 커밋 재배포 + 환경변수 복원이다. 관찰 기간에 Supabase에만 쓴 콘텐츠는 수동으로
  되돌려야 하므로(관리자 1명, 콘텐츠 소량), 전환 직후 1주는 편집을 최소화한다.
- Firebase 해체(의존성 제거·프로젝트 삭제) 후에는 롤백 경로가 없다. 해체는 관찰 기간
  종료와 §5.4 재검증 후에만 실행한다.

## 10. 문서 개정 목록 (M8)

- `CLAUDE.md`: 스택 표(인증·DB·이미지), 아키텍처 원칙 5~8(REST 경계·토큰 검증 서술),
  데이터 모델 표(컬렉션명), 환경변수, 무료 한도 가드 표, 개발 명령어(firebase CLI 제거).
- `docs/adr/0001-serverless-rag.md`: 저장소·캐시 서술에 ADR-0005 대체 각주.
- `.claude/agents/firebase.md`: supabase 에이전트로 개편 또는 폐기.
- `.claude/memory/decision_stack_firebase.md`: 재결정 사실 반영.
- `.env.example`, `docs/troubleshooting/firestore-read-optimization.md`,
  `docs/troubleshooting/chatbot-search-architecture.md`: 경로·서술 갱신.
