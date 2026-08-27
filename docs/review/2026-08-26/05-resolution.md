# 05-architecture 처리 결과 (2026-08-27)

브랜치 `refactor/code-review-2` · 커밋 37개 (`9f6c54e` → `9c9b98e`)
403파일 / +8,617 −5,828 · 신규 모듈 60개 · 신규 테스트 파일 24개 · 삭제 파일 6개

원본 보고서는 [05-architecture.md](05-architecture.md), 실행 계획은 [05-plan.md](05-plan.md).

계획은 34개 항목에 06 문서에서 흡수한 2개와 03 문서에서 이월된 2개를 더해 시작했고, 실행
중에 계획 밖 항목 하나(CSS 캐스케이드 결함)와 보고 하나(사진 모달 연출)가 들어왔다.

## 처리 현황

### 05 문서 항목

| 항목 | 내용 | 처리 |
| --- | --- | --- |
| ARCH-D-03 | mock 콘텐츠 getter 의 공개 게이트가 갈림 | 완료. `publishedInOrder` 로 통일. 보고서의 셋째 지점은 기각 |
| ARCH-D-04 | 행 병합과 공개 전송이 한 파일 | 완료. `row-merge` 분리 + `transport` 에 `server-only` |
| ARCH-D-06 | 정렬 없는 컬렉션이 `updateOrder` 를 가짐 | 완료. `SortableCollectionId` 로 타입에서 사라짐 |
| ARCH-D-11 | Supabase REST 호출이 두 벌 | 완료. `restFetch` 하나 |
| ARCH-D-12·14·16 | 죽은 코드와 배치 | 완료 |
| ARCH-A-05 | 수상 목록·상세가 음악·개발에 두 벌 | 완료. `AwardList`·`AwardDetailModal` |
| ARCH-A-06·07·23 | 상세 모달 URL 쓰기 경로가 넷 | 완료. `detailQueryHref` → `useDetailQuerySession` |
| ARCH-A-09 | 앨범만 모달을 정적 import | 완료. 투영본만 직렬화하도록 함께 고침 |
| ARCH-A-10 | 라우트에 남은 도메인 투영 | 완료. 셋 다 feature `_lib/` 로 |
| ARCH-A-15 | 법적 문서 1,090줄 · 책임 넷 | 완료. 본문 6분할 + 라우팅 61줄 |
| ARCH-A-16 | 스켈레톤 파일 하나에 export 일곱 | 완료. `components/skeletons/` 파일당 하나 |
| ARCH-A-17·13·21 | 폴더 배치 | 완료 |
| ARCH-A-20 | 레이어 경계 게이트가 `src/lib` 미감시 | 완료. 켜자 위반 하나가 나왔다 |
| ARCH-A-24 | 그리드 브레이크포인트가 세 곳 | 완료. `PHOTO_GRID_BREAKPOINTS` 파생 |
| ARCH-A-28 | `max-width: 1180px` 가 17파일 | 완료. `--page-max` + `.u-page-main` |
| ARCH-A-01 | `CustomCursor` 722줄 · effect 하나 570줄 | 완료. 네 모듈 + 훅 |
| ARCH-A-12 | 커서·스크롤바가 DOM 계약으로만 결합 | 완료. `pointer-chrome` 통합 + 계약 모듈 |
| ARCH-A-02 | 챗 요청 처리 730줄 | 완료. 여섯으로 나눔 |
| ARCH-D-10 | Firebase 잔여 서술 | 완료. `vitest.config` 거짓 근거 + 구조도 + ADR 개정 표기 |

### 착수 전 이미 해소돼 있던 항목 (8건)

ARCH-D-01·D-02·D-07(디코더) · ARCH-D-09(캐시 태그) · ARCH-D-13(포트 검사) ·
ARCH-A-08(Escape) · ARCH-A-26(법적 문서 라우트) · ARCH-D-10 의 `src/**` 부분.
근거는 [05-plan.md](05-plan.md) 의 재대조 표에 있다.

### 04-plan 이 흡수한 항목 (4건)

ARCH-A-03 · A-19 · A-18 · A-11.

### 유지 판정 (8건)

| 항목 | 유지 근거 |
| --- | --- |
| ARCH-A-04 | `useLang` 소비 49파일 중 서버 컴포넌트가 될 수 있는 것이 2개다. 문서가 스스로 정한 착수 기준을 넘지 못한다 |
| ARCH-A-22 | `dictionary.ts` 분할은 A-04 의 번들 근거를 전제로 걸었고 그 전제가 없다 |
| ARCH-D-05·D-08·D-15·D-17·A-25·A-27 | 여섯 모두 문서가 착수 가정("콘텐츠 종류를 추가하면", "새 호출자가 생기면")을 스스로 적었고 그 가정이 지금 없다 |

### 03 문서 이월 2건 — 실측으로 닫았다

계획은 이 둘을 고치기로 했다. 프로덕션 빌드에서 재 보니 고칠 것이 없었다.

| 항목 | 측정값 | 판정 |
| --- | --- | --- |
| UI-S-12 (휠 조상 체인) | 요소 479개짜리 글 상세 본문 깊은 지점에서 호출당 `getComputedStyle` 10회 · **7µs** | 유지. 프레임 예산의 0.04% 라 캐시가 버는 것보다 낡은 스크롤 대상을 돌려줄 위험이 크다 |
| UI-S-04 (스크롤바 관찰 범위) | 레코드 하나가 부르는 재계산 **2µs**, rAF 가 프레임당 한 번으로 모음 | 유지. 좁히면 모달 포털과 지역 스크롤러가 어디에 붙을지 모른다는 문제가 되돌아온다 |

수치와 근거는 두 파일에 남겼다. 다음에 같은 제안이 나올 때 다시 재지 않게 하기 위한 것이다.

## 계획 밖에서 나온 것

### CSS 캐스케이드 결함 (계획에 없던 유일한 결함)

블로그 글 상세에서 깨진 이미지 자리표시자가 히어로 이미지를 통째로 덮었다. 목록에서 글로
들어가 새로고침한 뒤 뒤로가기로 나갔다가 다시 들어가면 재현됐다.

`ImageFallback.module.css` 의 `.fallback` 과 `ArticleBody.module.css` 의 `.brokenFigure` 가 같은
요소에 얹히면서 둘 다 `position` 을 선언했다. 클래스 하나짜리 셀렉터라 명시도가 같아 승자를
**스타일시트 삽입 순서**가 정한다. 그 경로에서 순서가 뒤집히면 `position: absolute` 가 이기고,
글 본문에는 위치 지정 조상이 없어 자리표시자가 초기 컨테이닝 블록 기준으로 펼쳐진다.

같은 부류를 전수로 찾았다. 두 CSS 모듈 클래스를 함께 받는 요소가 일곱이고 그중 속성이
겹치는 것이 둘이었다. 값이 같아 증상은 없었지만 순서에 기대는 것은 같아 함께 지웠다.
이 규칙은 [public-ui-conventions.md](../../public-ui-conventions.md) 에 적었다.

### 갤러리 사진 모달의 연출

작업 그리드에서 연 모달은 닫힘 연출이 없었고 열림도 앨범과 달랐다. 셋이 각각 다른 원인이었다.

- **닫힘**: `AnimatePresence` 가 `PhotoModal` 안에 있는데 온디맨드 경로가 컴포넌트를 통째로
  언마운트했다. 퇴장이 돌 대상이 사라진다.
- **두 번째 열기**: `readyId` 초기화가 `close()` 안에만 있어 뒤로가기로 닫으면 남았다. 다 본
  사진의 id 가 남으면 같은 사진을 다시 열 때 로딩 프레임이 뜨지 않는다.
- **열림**: 등장 연출이 두 번 보였다. 로딩 프레임과 실제 패널이 같은 자리에서 각각 스케일로
  들어왔다.

이제 스크림 페이드는 로딩 프레임이, 스케일 등장은 실제 패널이 하나씩만 갖는다. 패널의
등장·퇴장은 앨범 경로와 같은 코드이며 `animateOnOpen` 이 가르는 것은 배경뿐이다.

## 보고서에서 정정한 것

계획이 착수 전에 여덟을 정정했고([05-plan.md](05-plan.md) 의 표), 실행 중에 둘이 더 나왔다.

| # | 계획의 서술 | 실제 |
| --- | --- | --- |
| 9 | C3 — "브라우저에서 `transport.ts` 를 부르는 곳은 `list-crud.ts` 한 줄뿐임을 전수 확인했다" | **틀렸다.** 직접 import 만 셌다. `server-only` 를 넣자 빌드가 `ArticleFullPreview → dev-article-repository → live-dev-article-repository → lib/supabase/dev-articles → public/dev-articles → transport` 경로를 잡았다. 디코더를 직접 import 하도록 고쳤다 |
| 10 | C32 — "기존 1,267줄 테스트가 **무수정** 통과해야 한다" | 69개 중 68개가 무수정 통과했다. 하나는 SEC-05 가 같은 계획 안에서 바꾸기로 한 계약이었다 — `ChatUpstreamError` 의 `invalid` 가 알 수 없는 실패와 같은 502 로 나가던 것 |

`toDate`·`toNullableDate` 는 옮기려던 대상이었으나 knip 으로 소비처가 0인 것이 확인돼
옮기지 않고 지웠다.

## NEW·POST·SEC 항목의 처리

리뷰 문서 밖에서 나온 항목들이다. `4c32af3` 이후 커밋을 코드에 다시 대조해 찾았다.

| 항목 | 내용 | 처리 |
| --- | --- | --- |
| NEW-01·02·03 | 오버레이 여섯이 여섯 조합을 손으로 적음 | 완료(C20). `useDialog`. `PhotoModal` 은 셋의 활성 조건이 달라 제외하고 근거를 남김 |
| NEW-04 | 사진 상세와 나머지 모달의 history 계약이 갈림 | 완료(C21). 두 훅이 같은 판정을 쓴다 |
| NEW-05 | 디코더의 객체·배열 리더 5벌 | 완료 |
| NEW-06 | `.sr-only` 7벌 | 완료. 04 가 셋, 05 가 셋을 접었다 |
| NEW-07 | 공개 화면 CSS 규칙이 문서에 없음 | 완료. `docs/public-ui-conventions.md` |
| NEW-08 | 법적 문서가 1,090줄로 커짐 | 완료 |
| POST-01~13 | 04 완주 후 재검수에서 나온 관리자 항목 | 완료. `[04-resolution.md](04-resolution.md)` 이후 커밋 C11~C18 |
| SEC-01 | 관리자 게이트 전처리 5벌 | 완료. `lib/auth/admin-gate` |
| SEC-02 | Upstash 카운터 관용구 3벌 | 완료. `lib/rate-limit/counter` |
| SEC-03·04 | 본문 상한 3가지 · 오류 응답 5가지 | 완료 |
| SEC-05 | 챗 오류 표현 4벌 · `ChatErrorCode` 미소비 | 완료. 세 갈래로 나누고, 화면이 읽지 않는 `code` 는 클라이언트 타입에서 뺐다 |
| SEC-06 | `replaceRagDocuments` 의 순서 의존 | 완료. 상한 검사가 자기 입력을 담은 교체 계획을 돌려준다 |
| SEC-07 | `AdminChrome` 로그아웃 2벌 | 완료(04 재검수 범위) |
| SEC-08 | 연락 초안 타이머 누적 | 완료 |
| CONV-02 | `_types/` 폴더 2개 | 완료 |
| CONV-03 | ESLint boundaries 가 `src/lib` 미감시 | 완료(ARCH-A-20 과 같은 커밋) |

## 검증

커밋마다 `npm run check && npm run lint && npm run test:coverage && npm run deps:check`.

| 시점 | 무엇을 | 결과 |
| --- | --- | --- |
| C3 | `npm run build` | 공개 fetcher 를 브라우저 번들에서 부르는 경로를 실제로 잡았다 |
| C24·C25 | `npm run test:visual` | 20건 통과, 스냅샷 변경 없음 |
| C26·C28 | `npm run test:e2e` | 305건 통과 |
| C32 | 기존 `handle-chat-request.test.ts` | 69개 중 68개 무수정 통과 |

시각 스냅샷은 한 번 갱신했다. `a3a6542` 의 캐스케이드 수정으로 자리표시자가 흐름 안에
자리를 차지하면서 글 상세가 길어졌고, 기준 이미지는 다툼에서 `absolute` 가 이긴 화면이었다.

테스트는 2,506개다(착수 시 2,115개).
