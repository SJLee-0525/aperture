# 01-security-and-auth 34건 처리 결과 (2026-08-26)

브랜치 `refactor/code-review-2` · 커밋 13개 (`4c32af3` → `d2b7bd0`)
소스 118파일 / +1,562 −327 · 신규 모듈 8개 · 신규 테스트 파일 6개

계획은 [01-plan.md](01-plan.md), 원본 보고서는 [01-security-and-auth.md](01-security-and-auth.md).

## 처리 현황

| 항목       | 심각도 | 내용                                | 처리                                                         |
| ---------- | ------ | ----------------------------------- | ------------------------------------------------------------ |
| AUTH-01    | 중간   | 관리자 표면 인증 실패 제한 없음     | 완료. 스로틀 신설, 형태 선검사는 불필요로 판명               |
| SEC-S-02   | 중간   | 챗 질의 원문 서버 로그              | 완료                                                         |
| AUTH-02    | 낮음   | localStorage 토큰 + `unsafe-inline` | 완화. nonce 기각, 유출 목적지 제거와 유휴 signOut            |
| AUTH-06    | 낮음   | 로그아웃이 관리자 로컬 상태 잔존    | 완료. 명시 키 3종, 리뷰 권고안은 채택 불가                   |
| SEC-C-09   | 낮음   | GPS 자동 채움 무고지                | 완료. 배지·지우기·범위 검증, 정밀도 절삭은 기각              |
| SEC-S-01   | 낮음   | `/api/chat` 교차 출처               | 완료                                                         |
| SEC-C-11   | 낮음   | CSP 의 Firebase 호스트              | 완료. `connect-src` 6개와 이미지 2개 제거                    |
| SEC-C-01   | 낮음   | 이미지 URL 정화 부재                | 미착수. 실데이터 확인 선행                                   |
| SEC-C-02   | 낮음   | 업로드 타입·크기 검증               | 완료. 블로그 직접 업로드 경로까지 공용 검증 적용 (`72869fb`) |
| SEC-C-08   | 낮음   | devProjects href 가드               | 완료. 폼 검증 확인 후 저장소 쓰기 경계도 보강 (`8e320c9`)    |
| SEC-S-03   | 낮음   | 트리아지 프롬프트 경계              | 완료. 데이터 펜스와 필드 길이 상한                           |
| SEC-C-03   | 낮음   | 방침의 로컬 저장소 표 누락          | 완료. 한·영 두 문서                                          |
| SEC-C-10   | 낮음   | 연락 초안 능동 삭제                 | 완료. 타이머와 `pagehide`                                    |
| SEC-C-05   | 낮음   | GA `page_location` 검색어           | 완료. 허용 목록 정제                                         |
| SEC-S-07   | 낮음   | 502 본문의 내부 예외                | 완료                                                         |
| SEC-S-05   | 낮음   | `redirect: "follow"` SSRF           | 완료. `redirect: "error"`                                    |
| SEC-S-04   | 낮음   | `sentry-alert` 본문 절단            | 완료. `readLimitedBody` 를 `lib/http` 로 승격 후 적용        |
| AUTH-07    | 낮음   | 테스트 세션 빌드 게이트             | 완료                                                         |
| AUTH-09    | 낮음   | 웹훅 신선도·멱등                    | 부분. 멱등 계약 문서화, 신선도 검증은 효과 없음으로 판명     |
| SEC-C-12   | 낮음   | Firestore 잔존 주석                 | 완료. 47파일                                                 |
| SEC-C-04   | 참고   | `youtubeId` 무검증                  | 완료                                                         |
| AUTH-03    | 참고   | `detectSessionInUrl`                | 완료                                                         |
| AUTH-05    | 참고   | 세션만 확인                         | 기각. 문서화된 결정, JSDoc 보강                              |
| AUTH-10    | 참고   | 재검증 `tags` 무검사                | 완료                                                         |
| AUTH-04    | 참고   | `iss`·`aud` 미검증                  | 주석                                                         |
| AUTH-08    | 참고   | Postgres `=` 조기 종료              | 기각. 마이그레이션 주석                                      |
| SEC-S-08   | 참고   | 모델 링크 query                     | 기각. 주석                                                   |
| SEC-S-09   | 참고   | 스트림 총량 상한                    | 완료                                                         |
| SEC-S-10   | 참고   | `allowed_mentions`                  | 완료                                                         |
| SEC-S-11   | 참고   | `SCREEN_CONTEXT` 펜스               | 기각. 주석                                                   |
| SEC-C-13   | 참고   | `setItem` 미보호                    | 완료                                                         |
| 검수관 6-3 | 참고   | 로그아웃 후 토큰 유효               | 주석                                                         |
| 검수관 6-4 | 참고   | 포트 URL 거부                       | 주석                                                         |
| 검수관 6-5 | 참고   | RPC 소유권 미검증                   | 주석                                                         |
| SEC-C-07   | 조건부 | 연락 폼 캡차                        | 조건부가 아니라 발동 중. 문서화·점검 항목화                  |
| SEC-C-06   | 보류   | `_ga` 쿠키 삭제 도메인              | 점검 항목화                                                  |
| SEC-S-06   | 보류   | rate limit `x-real-ip` 폴백         | 점검 항목화                                                  |

완료 26 · 기각 5(근거 주석) · 주석만 5 · 미착수 1.

"주석" 은 코드 주석을 말한다. 동작을 바꾸지 않고 왜 그대로 두는지를 해당 파일에 적었다는 뜻이다.
문서에만 적으면 코드를 읽는 사람이 보지 못하고 다음 리뷰가 같은 항목을 다시 올린다.

## 리뷰와 달랐던 것

`AUTH-01` (증폭 경로). 리뷰는 "요청 1건당 Supabase 왕복 1~2회" 로 적고 JWT 형태 선검사를 권고했다.
`node_modules/@supabase/auth-js/.../GoTrueClient.js` 를 열어 보니 `:5331` 의 `decodeJWT` 가
`:5336` 의 `validateExp` 와 `:5347` 의 `fetchJwk` 보다 먼저 3-part 분리와 `BASE64URL_REGEX` 를 돌린다.
선검사는 라이브러리가 이미 하는 일이라 절약되는 왕복이 0회다. 실제 증폭은 `kid` 를 매번 바꾼
well-formed 미만료 토큰이 `fetchJwk`(`:5224-5248`) 캐시를 항상 미스로 만드는 경로다.
선검사를 빼고 스로틀만 남겼다.

`AUTH-06` (권고안을 채택하면 데이터가 지워진다). 리뷰는 "`signOutAdmin` 에 `ap-admin-*` 접두사
정리를 붙이면 된다" 고 적었다. `storage-keys.ts:8-20` 의 mock CMS 저장소 10개가 같은 접두사를
공유한다. mock 모드에서 로그아웃 한 번에 사진·앨범·연주·수상·영상·프로젝트·설정이 통째로 사라진다.
같은 파일 `:11` 주석이 그 접두사의 용도를 "E2E 초기화" 라고 이미 못박아 두었다. 명시 키 3종
(글 복구본 접두사, 재검증 실패 기록, 새 글 세션 ID)만 지운다.

`AUTH-09` (타임스탬프 신선도 검증은 효과가 없다). `verify-sentry-signature.ts:75` 의 HMAC 대상이
본문 문자열뿐이다. `sentry-hook-timestamp` 는 서명 밖이라 재생하는 쪽이 임의로 고쳐 쓸 수 있다.
검사를 붙여도 재생을 막지 못한다. 대신 멱등이 실제로 어디서 오는지(`claimSentryAlert` 의 키)와
그것이 꺼지는 조건을 두 파일 주석에 남겼다.

`AUTH-05` (한 줄 재사용이 아니라 결정 번복이다). `require-admin-session.ts:8` 이 "role 은 다시
검사하지 않는다. 권한 경계는 RLS 가 담당하고 여기는 UI 오류 명확화용이다" 라고 선언한다.
계정이 하나뿐이라 "로그인했지만 admin 아님" 상태 자체가 없다. 기각하고, 그 상태가 생겼을 때
무엇을 쓰면 되는지를 JSDoc 에 덧붙였다.

`SEC-C-07` (조건부가 아니라 발동 중이다). 상위 검수는 "mailto 라 서버 제출 경로 없음" 으로
보류했다가 조건부로 정정했는데, `.env.local` 을 열어 보니 `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` 가
실제로 설정돼 있다. 이 배포에서 Web3Forms POST 경로는 살아 있고, 허니팟과 캡차 토큰 검사는 둘 다
브라우저 안에서만 돈다. 코드 경계는 없으며 실제 경계는 대시보드 설정 하나다.

`SEC-C-11` (단독으로 적용할 수 없다). 리뷰는 이미지 호스트를 부수적으로 다뤘는데,
`STORAGE_IMAGE_HOSTS[0]` 에 묶인 생성기를 먼저 떼어내지 않으면 mock 모드 본문 이미지가 정책에서
전부 차단된다. 아래 절에 이어 적는다.

## 리뷰가 놓친 것

`.env.local` 에 Firebase 잔재 7개가 남아 있다. `NEXT_PUBLIC_FIREBASE_*` 6개와
`NEXT_PUBLIC_ADMIN_UID` 다. 코드 참조는 0건이라 죽은 값이지만 `NEXT_PUBLIC_` 접두사라 번들
대상이고, `ADMIN_UID` 는 관리자 판별이 `app_metadata.role` 로 바뀌기 전의 잔재다. Vercel 쪽은
저장소에서 확인할 수 없어 점검 항목으로 올렸다.

mock 이미지 호스트의 실제 결합 지점을 잘못 짚으면 테스트가 깨진다.
`lib/admin/mock/mock-image-store.ts` 는 `URL.createObjectURL` 만 쓰므로 무관하다. 실제로
`STORAGE_IMAGE_HOSTS[0]` 에 묶인 곳은 `admin-dev-articles/_lib/mock-article-uploader.ts:34` 이고,
`mock-article-uploader.test.ts:39` 가 `startsWith(STORAGE_IMAGE_HOSTS[0])` 를 단언한다.

`article-body-storage-paths.ts:47` 이 같은 허용 목록으로 게이트한다. Firebase 호스트를 목록에서
빼면 `firebaseObjectPath` 가 항상 `null` 인 도달 불가 코드가 되고, 같은 파일 `:60-63` 이 경고한
"본문 이미지 전체가 미사용 삭제 후보" 상황이 실제로 발생한다. 읽기 전용
`LEGACY_FIREBASE_STORAGE_HOST` 를 따로 두어 해소했다.

테스트 3건이 고쳐야 할 동작을 기대값으로 고정하고 있었다. `markdown-url-policy.test.ts` 가
`storage.googleapis.com` 통과를 단언했다. 모든 GCS 버킷이 공유하는 호스트이고, SEC-C-11 이
지적한 구멍 그 자체다. 거부로 뒤집었다. `portfolio-embeddings/route.test.ts` 의 테스트 이름은
"업스트림 오류 원문은 응답에 싣지 않고" 인데 정작 업스트림 파생 메시지(`임베딩 저장 실패 (500)`)를
단언했다. `handle-chat-request.test.ts` 의 본문 크기 제한 테스트는 `status === 400` 만 확인해서,
교차 출처 가드를 추가한 뒤에도 다른 이유로 400 이 나며 통과했다. 코드까지 단언하도록 고쳤다.

`next.config.ts` 의 트랜스파일러는 `@/` alias 를 해석하지 못한다. 배포 게이트 두 개의 phase
판정을 공용 모듈로 묶으려다 `MODULE_NOT_FOUND` 로 빌드가 멈췄다. 이 설정이 끌어오는 파일은
자립적이어야 한다. 두 파일에 목록을 각각 두고 중복 사유를 양쪽 주석에 남겼다.

`ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX` 가 export 되지 않았다. vitest 는 타입 검사를 하지 않아
`undefined.startsWith` 로 죽는 대신 `"undefined"` 접두사 비교로 조용히 통과했고, 테스트만
실패했다. 상수를 export 했다.

`ArticleBody.test.tsx` 에 부하 의존 flake 가 있다. 전체 스위트에서 5초 타임아웃에 5,152ms 로
걸렸고 단독 실행에서는 2.1초에 통과한다. 이 작업과 무관한 기존 문제이며 README 가 적은
"2,115 중 2,114 통과" 의 정체다. 재실행하면 2,115 전부 통과한다.

## 남은 하나 (C7)

SEC-C-01만 코드 작업을 착수하지 않았다. 선행 조건이 저장소 밖에 있다.

C6 이 이미지 허용 목록을 Supabase origin 하나로 좁혔다. 이 상태에서 origin 정화기를 켜면 허용
목록 밖 URL 은 커버가 사라진다. 프로덕션 데이터에 구형 Firebase origin 이 남아 있으면 공개 화면
커버가 먼저 비는 형태로 회귀가 드러난다. 그래서 순서는 조회, (있으면) 이관, 정화기 적용이다.

확인할 컬럼:

```sql
-- 각 컬럼의 origin 분포. Firebase origin 이 0건이면 곧바로 적용 가능하다.
select 'photos'        as t, data->'image'->>'url'  as url from photos
union all select 'albums',        data->'cover'->>'url'   from albums
union all select 'dev_projects',  data->'cover'->>'url'   from dev_projects
union all select 'music_works',   data->'poster'->>'url'  from music_works
union all select 'dev_articles',  data->'cover'->>'url'   from dev_articles;
-- dev_projects.data->'images' 는 배열이라 jsonb_array_elements 로 따로 편다.
```

착수 시 할 일은 [01-plan.md](01-plan.md) §C7 중 SEC-C-01 범위다.

SEC-C-01 은 실데이터 확인이 선행 조건인 유일한 항목이다. 반환 규약도 호출부 타입을 따라야 한다.
`Photo.image` 는 non-nullable 이라 `public/photo.ts:58` 의 `EMPTY_IMAGE` 폴백을 유지하고,
nullable 커버(album·dev·music·article)만 `null` 로 떨어뜨린다.

SEC-C-02는 확인 범위가 더 넓었다. 기존 40MB 검사는 업로드 훅 세 곳에만 있었고 블로그 대표 이미지와
본문 이미지 삽입은 업로더를 직접 호출해 크기 검사도 건너뛰었다. `validate-uploadable-image.ts`로 크기와
타입 검증을 합치고 다섯 진입점에 적용했다. SEC-C-08은 폼 경계의 `preparePublicLinks`로 이미 위험
스킴을 거부했지만 저장소의 create·update·links patch에서도 같은 판정을 적용해 우회 경로를 닫았다.

## 후속 필요

1. 저장소 밖 확인 4건. `.claude/commands/deploy-check.md` §Step 3 에 항목으로 올렸다. 프로덕션
   Upstash 자격증명(없으면 AUTH-01 수정이 fail-open 이라 무동작), Web3Forms hCaptcha 필수 설정,
   Vercel 의 Firebase 환경변수 잔재, `_ga` 쿠키 삭제 도메인이다.
2. `.env.local` 정리. hook 이 자동 수정을 막으므로 직접 지워야 한다. `NEXT_PUBLIC_FIREBASE_*`
   6개와 `NEXT_PUBLIC_ADMIN_UID`.
3. CSP nonce 전환. 기각이 아니라 보류다. `script-src 'unsafe-inline'` 이 남아 있는 한 AUTH-02 의
   근본 원인은 그대로다. 정적 우선 렌더를 포기할 수 있게 되는 시점에 다시 본다.
4. 범위 밖. `deploy-check` 의 Step 2(Firestore Rules)와 Step 4 는 아직 Firebase 시절 문구다.
   8/29 해체([checklist 09](../../checklist/09-supabase-observation-teardown.md)) 때 함께 고친다.
   이번에는 C6 과 직접 충돌하는 Step 3 한 줄만 뒤집었다.

## 검증

- 단위 2,162 passed / 0 failed (기준선 2,115 에서 +47)
- 커버리지 임계값(85/80/85/85) 대비 실측 94.6 / 87.8 / 94.4 / 96.5
- `npm run check` 0 error · `npm run lint` 0 problem · `deps:check` 순환 0건(1,094 모듈)
- C6 은 `test:e2e` 와 `test:visual` 로 별도 확인했다. 프로덕션 빌드에 mock 을 얹은 조합에서
  238 passed. mock origin 게이트를 `NODE_ENV` 로 두었다면 여기서 깨졌을 지점이다.
- 커밋마다 네 게이트를 모두 통과시킨 뒤 다음으로 넘어갔다.
