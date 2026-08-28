# 02-correctness 33건 처리 결과 (2026-08-26)

브랜치 `refactor/code-review-2` · 커밋 9개 (`e0ad1a5` → `737740e`)
소스 112파일 / +2,972 −941 · 신규 모듈 9개 · 신규 테스트 파일 6개 · 삭제 라우트 3개

원본 보고서는 [02-correctness.md](02-correctness.md).

보고서의 식별자는 36개지만 `BUG-C-14` 는 `BUG-S-09` 와 같은 항목이고 `BUG-C-07-A/B` 는 한 건이며
`BUG-S-19`(Firestore 잔재 주석)는 보고서가 스스로 05 로 넘겼다. 실질 33건이다.

## 처리 현황

| 항목 | 심각도 | 내용 | 처리 |
| --- | --- | --- | --- |
| BUG-C-01 | 높음 | 첫 페인트 섹션 색이 항상 파랑 | 완료. 스크립트가 로케일 프리픽스를 벗긴다 |
| BUG-S-02 | 높음 | 관리자 날짜 폴백이 DB 에 굳음 | 완료. 디코더 단일화 · patch 쓰기 · 인코더 가드 3중 |
| BUG-S-01 | 높음 | 빈 줄 하나가 챗 문맥을 자름 | 완료. 블록 배열로 전환, 캐시 키 v9 |
| BUG-S-03 | 중간 | 본문 바이트 상한이 스키마보다 작음 | 완료. 문자 상한에서 파생 |
| BUG-S-04 | 중간 | 업로드 시각 없는 파일이 보호창 우회 | 완료 |
| BUG-S-07 | 중간 | Upstash 4xx 가 챗을 전역 차단 | 완료. 401·403·404 로 좁힘, 수정 위치 3곳 |
| BUG-S-09 | 중간 | 스트림 오류 시 reader·fetch 미중단 | 완료 |
| BUG-S-08 | 중간 | 비공개 항목이 캐시에서 부활 | 완료. `verified` 와 화면 문맥이 같은 조회를 공유 |
| BUG-C-02 | 중간 | 포커스 트랩이 fixed 요소 제외 | 완료. E2E 로 계약 고정 |
| BUG-C-05 | 중간 | `enabled` 해제가 표면을 화면 밖에 방치 | 완료 |
| BUG-C-06 | 중간 | 연속 열기 후 닫기를 두 번 눌러야 함 | 완료. 판정을 `openRef` 로, 리뷰 처방은 그대로 쓸 수 없었다 |
| BUG-C-07-A/B | 중간 | EXIF 촬영일시를 뷰어 타임존으로 재해석 | 완료. 표시와 추출 양쪽 고정 |
| BUG-C-12 | 낮음 | 무-로케일 법적 문서 404 | 완료. `[legalDoc]` 통합과 308 |
| BUG-C-13 | 낮음 | 관대·엄격 파서 규칙 불일치 | 완료 |
| BUG-S-12 | 낮음 | 포트 검사가 로컬 스택을 막음 | 완료. 주석 모순도 정정 |
| BUG-S-13 | 낮음 | 앨범 커버 스냅샷 미갱신 | 완료 |
| BUG-C-10 | 낮음 | IntersectionObserver 재생성 | 완료. 재생성만 제거, 기능은 유지 |
| BUG-C-11 | 낮음 | `searchIndex` 미전달 | 완료 |
| BUG-S-05 | 낮음 | 임베딩 배치 부재 | 완료. 100개 순차, 배치별 정렬 |
| BUG-S-06 | 낮음 | 상한 검사가 임베딩 뒤 | 완료. `assertWithinDocumentLimit` 분리 |
| BUG-S-10 | 낮음 | CRLF 종결자가 조각 경계에 걸림 | 완료 |
| BUG-S-11 | 낮음 | `Content-Length` 없는 응답 무제한 버퍼링 | 완료 |
| BUG-S-14 | 낮음 | 템플릿 리터럴이 항상 truthy | 완료. 1곳이 아니라 17곳 |
| BUG-S-15 | 낮음 | 문서 캐시 태그를 지우는 쓰기 없음 | 완료. `listCrud` 차원에서 |
| BUG-S-16 | 낮음 | 같은 태그에 무효화 API 두 종류 | 부분. 서버 액션은 통일, route 는 Next 제약 |
| BUG-S-17 | 낮음 | `publishedAt` 조용한 강등 | 완료. 예외로 |
| BUG-S-18 | 낮음 | mock·live slug 검사 시점 불일치 | 완료 |
| BUG-C-03 | 낮음 | 이전 정리 함수 미호출 | 완료 |
| BUG-C-04 | 낮음 | 0·NaN 최대 배율 삼킴 | 완료 |
| BUG-C-08 | 낮음 | `animationend` target 미검사 | 완료. `{once:true}` 도 함께 걷어냄 |
| BUG-C-09 | 낮음 | 선택자가 자기 자신을 `inert` 로 | 완료. ref 기반으로 전환 |
| BUG-C-15 | 낮음 | 클로저 스냅샷 중복 검사 | 완료. 리뷰 처방은 동작하지 않았다 |
| BUG-C-16 | 낮음 | `getSnapshot` 부수효과 | 완료 |

완료 32 · 부분 1.

부분 하나는 `BUG-S-16` 이다. 무효화 지점이 두 곳인데 한쪽은 Next 가 API 를 막는다. 아래에 적는다.

## 리뷰와 달랐던 것

`BUG-S-07` (수정 위치가 세 곳으로 흩어졌다). 보고서는 `chat-rate-limit.ts:255-257` 의 4xx 분기를
지목했는데 그 코드는 더 이상 없다. 보고서가 커밋된 뒤 01 작업의 `ad5b93b` 가 분류를 전송 계층으로
옮겼다. 지금 고칠 곳은 `lib/rate-limit/upstash-counter.ts:84-85` 의 분류, `chat-rate-limit.ts:236` 의
소비 분기, 그리고 같은 전송 파일 `:16-19` 의 JSDoc 이다. 그 JSDoc 이 "4xx 가 자격증명이나 토큰 권한
문제여서" 라고 적어 429 를 포함한 전제를 세우고 있었다.

`BUG-S-14` (1곳이 아니라 17곳이다). 보고서는 `rag-chunks.ts:31-36` 의 첫 조각만 지적했다. 같은
파일에서 `` `프로젝트/Project: ${...}` `` 형태로 라벨과 값을 잇는 자리가 17곳이고 전부 같은 결함이다.
값이 비어도 라벨 때문에 항상 truthy 다. `labeled(label, value)` 헬퍼 하나로 일괄 처리했다.

`BUG-C-15` (권고안이 동작하지 않는다). 보고서는 "검사를 updater 안으로 옮긴다" 고 적었다. React 는
`setState` updater 를 렌더 단계에 호출할 수 있어 호출 직후 그 결과를 읽을 수 없다. 오류 문구를
동기적으로 돌려주는 `addTag` 에는 쓸 수 없는 처방이다. `tagsRef` 를 권위 있는 목록으로 두고 모든
변경을 `applyTags` 로 통과시켰다.

`BUG-C-08` (`{once:true}` 가 target 검사와 상충한다). 리스너에 target 가드만 붙이면 자손에서
버블링된 첫 `animationend` 에도 `once` 가 리스너를 떼어 간다. 스플래시 애니메이션이 끝나도 아무도
듣지 않는다. `once` 를 빼고 target 이 맞을 때 직접 해제한다.

`BUG-C-06` (대조군을 그대로 이식할 수 없다). 계획은 "`usePhotoDetailSession` 패턴 이식" 이었는데
그쪽 `goto` 는 항상 `replaceCurrentUrl` 이고 push 를 전혀 하지 않는다. 필요한 것은 첫 열기만 push
하는 하이브리드다. 그리고 `openedHere` 는 effect 안에서 세워지므로 `select` 가 동기적으로 읽을 수
없다. push·replace 판정은 `openRef` 로 옮겼다. 이 구분을 흐리면 한 틱에 두 번 여는 에이전트 호출에서
버그가 그대로 돌아온다.

`BUG-C-04` (실제 위험은 0 이 아니라 NaN 이다). 보고서는 "`image.w === 0` 인 데이터는 막지 못한다"
고 적었다. 유일한 소비자 `ImageLightbox.tsx:154-160` 이 `Math.max(2, ...)` 를 거치므로 0 은 나올 수
없다. 나올 수 있는 값은 `image.w` 가 `NaN` 일 때의 `NaN` 이고, 그것도 `||` 가 삼켜 조용히 3 이 된다.

`BUG-C-10` (`count` deps 제거는 기능을 깨뜨린다). 그 deps 는 "넓은 뷰포트에서 이어 채우기" 를 위해
의도적으로 있었고 같은 파일 주석이 이유를 적어 두었다. `IntersectionObserver` 는 교차 상태가
유지되는 동안 다시 발화하지 않는다. 관찰자를 새로 만드는 대신 `unobserve` 후 `observe` 로 판정을
한 번 더 받게 해 동작을 유지하면서 재생성만 없앴다.

`BUG-S-16` (두 곳이고 한쪽은 막혀 있다). `revalidate-public.ts` 는 `"use server"` 라 `updateTag` 로
바꿀 수 있다. `portfolio-embeddings/route.ts:99` 는 Route Handler 이고 `node_modules` 의
`updateTag.md:12` 가 "can only be called from within Server Actions" 라고 못박는다. 두 무효화는 성격도
다르다. 앞쪽은 관리자 쓰기 직후의 read-your-own-writes 이고 뒤쪽은 RAG 재생성 후 배경 갱신이다.
정책을 하나로 만드는 대신 왜 다른지를 양쪽 주석에 남겼다.

계획 단계에서 접은 것도 둘 있다. `sort-rpc.ts:30` 의 throw 는 제거할 수 없다. 수동 정렬이 없는
컬렉션(`devArticles`·`devArticleTags`·`site`)이 있는 한 `sortRpc` 가 optional 이고, optional 인 한
런타임 검사가 남는다. `admin-list.ts` 의 `listProjected` 흡수도 접었다. 호출 6회에 select 6종이고
`dev_articles` 하나에 서로 다른 두 개가 있으며, 두 호출의 `orderColumns` 가 서술자 order 와 다른
것을 같은 파일 `:120-121` 이 의도라고 명시해 두었다.

## 리뷰가 놓친 것

보고서가 커밋된 시점(`4c32af3`)과 착수 시점의 HEAD 가 다르다. 그 사이 01 작업이 4커밋 들어갔고
`git diff 4c32af3..HEAD` 가 건드린 22파일 중 02 대상이 8개다. `sse-stream.ts` 는 `lib/ai/` 에서
`features/chat/_lib/` 로 옮겨졌고 `chat-rate-limit.ts` 는 182줄이 바뀌었다. `image-source/route.ts`,
`portfolio-embeddings/route.ts`, `revalidate-public.ts` 는 인증만 교체돼 결함 자체는 남아 있었다.
줄번호를 그대로 믿고 착수했다면 첫 단계부터 어긋났다.

`upstash-counter.ts` 에 테스트가 없었다. 01 작업이 4xx 분류를 이 파일로 옮기면서 테스트는 따라오지
않았다. 보고서가 "테스트가 계약을 고정하고 있어 함께 바꿔야 한다" 고 적은 그 계약이 실제로는
무테스트 상태였다. 파일을 신설해 401·403·404 와 429 의 분기를 고정했다.

`use-query-modal.test.ts` 의 하네스가 URL 변경을 반영하지 않는다. 모킹한 `useSearchParams` 가 정적
값을 돌려주므로 "이미 열려 있는가" 판정을 검증할 방법이 없었다. 실제로는 `pushCurrentUrl` 이
popstate 를 보내 `useSearchParams` 가 갱신된다. `pushState`·`replaceState` 스파이가 href 를 파싱해
`searchParams` 를 갱신하도록 고쳤다.

`patchData` 가 `assertStorableTicketUrl` 경계를 우회한다. `musicWorks` 는 CRUD 를 spread 로 노출하고
`create`·`update` 에만 검증을 얹는다. spread 로 함께 나가는 `patchData` 는 그 검증을 지나지 않는다.
지금 쓰는 곳이 포스터만 바꾸는 마이그레이션이라 실해는 없고, 그 사실을 주석으로 고정했다.

`BUG-S-15` 는 `devArticles` 만의 문제가 아니다. 보고서는 `db:devArticles:{id}` 태그를 지목했는데,
단건 태그를 지우는 쓰기가 없다는 것은 `listCrud` 를 쓰는 모든 컬렉션에 해당한다. 컬렉션별로 막지
않고 모든 쓰기가 컬렉션 태그와 문서 태그를 함께 무효화하게 했다. `updateOrder` 만 id 가 없어
컬렉션 태그만 쓴다.

`assertWithinDocumentLimit` 를 route 로 올리면 DB 조회가 2회가 된다. `replaceRagDocuments` 도 같은
검사를 내부에서 하기 때문이다. 계산한 `staleIds` 를 넘겨 조회를 1회로 되돌렸다.

임시 `distDir` 로 빌드하면 Next 가 그 경로의 타입 include 를 `tsconfig.json` 에 자동 추가한다.
라우트 구조를 확인하려고 `NEXT_DIST_DIR=.next-routecheck` 로 빌드했더니 그 변경이 6단계 커밋에
섞여 들어갔다. 별도 커밋으로 되돌렸다.

## 새로 찾은 것

라이트박스에서 양 끝 이미지로 넘기면 포커스가 트랩 밖으로 나갔다. `ImageLightbox.tsx:342,361` 의
이전·다음 버튼이 `disabled={!loaded || index === 0}` 형태라 양 끝에서 비활성이 된다. 키보드로
다음 버튼을 눌러 마지막 이미지에 닿으면 방금 누른 그 버튼이 `disabled` 가 되고 브라우저가 포커스를
`body` 로 보낸다. `useFocusTrap` 의 `keydown` 은 컨테이너에 붙어 있어 `body` 에서 누른 Tab 은
도달하지 않고, 그때부터 브라우저 기본 순서로 라이트박스 바깥을 순회한다.

`ImageLightbox.tsx:174-200` 의 document capture 리스너가 Escape 와 화살표를 받으므로 완전히 갇히지는
않았다. 보고서에 없는 항목이고 `BUG-C-02` 와도 원인이 다르다. `PhotoModal.tsx:383,401`에도 같은
패턴이 있어 두 화면 모두 `aria-disabled`로 바꾸고 클릭을 막았다. 실제 브라우저에서 경계 버튼이
포커스를 유지하고 다음 Tab도 트랩 안에 남는 계약을 고정했다 (`c544019`).

이 결함은 E2E 를 쓰다가 드러났다. 세 버튼을 한 번에 확인하려고 다음 버튼을 클릭한 뒤 Tab 을 눌렀는데
이전 버튼이 잡히지 않았다. DOM 을 찍어 보니 그 시점의 이전 버튼은 `disabled: false` · `position: fixed`
· `rects: 1` 로 포커스 가능한 상태였다. 원인은 트랩이 아니라 포커스가 이미 컨테이너 밖에 있었던 것이다.

## 데이터 점검

`BUG-S-02` 는 이미 오염된 행이 있는지 저장소만 봐서는 알 수 없다. 세 검사를 하나로 합쳐 실행했고
0행이었다. 발생 전에 막은 것으로 확인됐다.

```sql
select '1) performedAt 결측·비ISO' as check_name, id, data->>'performedAt' as value
  from music_works
 where data->>'performedAt' is null
    or data->>'performedAt' !~ '^\d{4}-\d{2}-\d{2}'
union all
select '2) 마이그레이션 시각으로 굳음', id, raw
  from (
    select id, data->>'performedAt' as raw, updated_at
      from music_works
     where data->>'performedAt' ~ '^\d{4}-\d{2}-\d{2}'
     offset 0
  ) t
 where raw::timestamptz between updated_at - interval '5 min' and updated_at
union all
select '3) shotAt epoch', id, data->>'shotAt'
  from photos
 where data->>'shotAt' like '1970-%';
```

`offset 0` 은 최적화 펜스다. 없으면 Postgres 가 WHERE 조건 순서를 바꿔 `'3'` 같은 비-날짜 값에
`::timestamptz` 캐스팅을 시도하고 쿼리 전체가 에러로 중단된다. 검사 1이 찾으려는 값이 바로 그것이라
펜스 없이는 검사 2가 검사 1의 대상 때문에 죽는다.

## 구조 변경

`BUG-S-02` 의 근본 원인이 디코더가 컬렉션마다 2~3벌이고 폴백이 서로 다른 것이라
`ARCH-D-01`·`ARCH-D-02`·`ARCH-D-07` 을 같이 처리했다. 05 문서가 "따로 착수하면 같은 파일을 세 번
고친다" 고 적은 그대로다.

`decode/field.ts` 에 필드 리더를 두고 컬렉션별 디코더를 한 벌씩 만들었다. 공개와 관리자의 실제 차이는
`ticketUrl` 과 `links` 두 가지뿐이었고 `decode/public-sanitize.ts` 로 분리했다. 날짜와 `image` 폴백
차이는 의도가 아니라 사고였으므로 사라졌다. 목록 projection 은 엔티티 디코더가 아니라 같은 필드
리더만 공유한다. 타입이 다르기 때문이고, `admin-list.ts:111` 의 epoch 와 편집기의 "오늘" 이 갈리던
것은 이것으로 해소된다.

`TableCollectionId` 를 도입해 서술자의 `Partial` 을 없앴다. `?? "리터럴"` 폴백 7곳과 런타임 throw
2곳이 타입으로 대체됐다. `sort-rpc.ts` 의 별도 표도 서술자의 `sortRpc` 로 흡수했다.

`BUG-C-12` 는 `ARCH-A-26` 과 같은 파일 작업이라 함께 했다. 법적 문서 3라우트가 43줄씩 같은 모양이라
`[legalDoc]` 하나로 접었다. `dynamicParams = false` 가 없으면 `/ko/아무거나` 가 404 대신 이 라우트에
잡힌다. `[lang]/layout.tsx:19-21` 이 "이 세그먼트에 두지 않는다. 하위까지 함께 잠겨 전역 404 가 된다"
고 경고하지만 `[legalDoc]` 에는 하위 세그먼트가 없어 잠글 대상이 없다. 실제 응답으로 확인했다.

## 후속 필요

1. `ARCH-A-07`. `useQueryModal` 과 `usePhotoDetailSession` 의 훅 통합이다. 05 문서가 `BUG-C-06` 을
   선결 조건으로 적었고 그것이 끝났으므로 이제 두 훅이 같은 판정 규칙을 쓴다.
2. `listProjected` 서술자 흡수와 `SortableCollectionId` 도입. 이번에 접은 이유를 위에 적었고 해당
   위치에 주석으로도 남겼다.
3. `BUG-S-19`(Firestore 잔재 주석)를 포함한 05 문서 잔여 작업.

## 검증

- 단위 2,251 passed / 0 failed (기준선 2,162 에서 +89) · 테스트 파일 264개
- 커버리지 임계값(85/80/85/85) 대비 실측 94.6 / 87.8 / 94.2 / 96.6
- `npm run check` 0 error · `npm run lint` 0 problem · `deps:check` 위반 0건(1,106 모듈)
- 3단계는 `TZ` 를 `Asia/Seoul`·`America/New_York`·`Europe/Berlin`·`UTC` 로 바꿔 네 번 돌렸다.
  네 경우 모두 전량 통과했고, 로컬 타임존 의존이 남아 있으면 여기서 깨졌을 지점이다.
- 5단계는 mock 프로덕션 빌드를 띄워 실제 응답으로 확인했다. `/privacy`·`/terms`·`/accessibility`
  가 308 로 `/ko/*` 에 한 번에 가고, `/ko/does-not-exist` 는 404 다. ko·en 6경로가 정적 생성된다.
- E2E 는 바뀐 동작을 덮는 네 파일(`dev-article-detail`·`dev`·`music`·`photo`)을 desktop·mobile
  양쪽으로 돌려 65 passed / 11 skipped 였다. 라이트박스, 프로젝트·연주 모달, 사진 필터와 무한
  스크롤이 여기 들어간다. 전체 스위트는 이 환경에서 10분 안에 끝나지 않아 범위를 좁혔다.
- `BUG-C-02` 의 E2E 는 가시성 판정을 `offsetParent` 로 되돌려 그 테스트만 실패하는 것을 확인했다.
- 커밋마다 네 게이트를 모두 통과시킨 뒤 다음으로 넘어갔다.
