# 규약, 주석, 테스트

대상: `C:\github\sj\aperture` @ `refactor/code-review-2` (5a9f279)
범위: `src/**` 비테스트 623파일 / 54,974줄, 테스트 251파일 / 단언 3,532회, `e2e/` 22스펙
기준: 루트 `CLAUDE.md`(「컨벤션」·「코드 주석과 JSDoc 작성 규칙」·「디렉토리 구조」), `eslint.config.mjs`, `vitest.config.ts`, `.dependency-cruiser.cjs`

구조적 규약은 사실상 무결점이다. `../` 상대경로 import 1건(alias 밖에 있는 `src/proxy.ts`를 가리키는 구조적 예외), barrel `index.ts` 0건, `.module.css` 156개 전체에서 hex 직박 0건, `TODO`/`FIXME` 0건, 레이어 역방향 import 0건. 규칙이 문서에만 있고 코드에는 없는 상태가 아니라, 코드가 실제로 규칙대로 쓰여 있다.

문제는 전부 서술 계층에 있다. 코드는 Supabase로 옮겨 갔는데 그 코드가 왜 그런 모양인지 설명하던 주석은 Firestore 시절 그대로다. 44개 파일 64줄이 존재하지 않는 백엔드를 현재 계약의 기준으로 든다. JSDoc 2,220건은 TypeScript가 이미 아는 타입을 한국어로 되풀이한다. 커버리지 임계값 85%는 소스의 줄 기준 27.8%에만 걸려서 항상 통과한다.

숫자는 크지만 대부분 기계적이다. JSDoc 2,220건과 대시 627줄은 위험이 0에 가깝고 정규식으로 처리되는 대신 diff가 수천 줄로 부푼다. 실제로 판단이 필요한 것은 훨씬 적다. Firebase 주석 64줄 중 삭제와 치환을 갈라야 하는 부분, 커버리지 allowlist를 좁힌 거짓 근거 한 줄, 테스트가 없는 61개 관리자 파일과 공개 디코더 4종. 이 보고서는 그 구분에 지면을 쓴다.

---

## 지켜지고 있는 것

| 항목 | 측정값 |
| --- | --- |
| `../` 상대경로 import | 1 (`src/features/lang/_lib/proxy-locale.test.ts:6`) |
| barrel `index.ts` | 0 |
| `.module.css` hex 직박 | 0 (156파일 전체) |
| `TODO` / `FIXME` | 0 (623파일) |
| 레이어 역방향 import (`features→app`, `components→features`, `lib→features`) | 0 |
| 스냅샷 테스트 | 0 (`__snapshots__` 디렉토리 없음) |
| 공개 JSX 한국어 하드코딩 | 1 (`features/auth/_components/LoginForm.tsx:42`, 관리자 로그인 화면) |
| 300줄 초과 비테스트 파일 | 20 / 623 (3.2%) |
| `toHaveBeenCalled*` 비중 | 456 / 3,532 = 12.9% |

유일한 `../` 1건은 alias로 표현할 수 없다. `src/proxy.ts`가 `@/` 매핑 밖(`src/` 루트)에 있어서다.

테스트가 tautological하지 않다는 점도 확인됐다. mock 호출 검증 비중이 높은 상위 6개 파일을 직접 열어 본 결과, `use-photo-modal.test.ts`는 `toHaveBeenCalledWith(window.history.state, "", "/photo?photo=photo-2")`처럼 계산된 URL 문자열 자체를 단언한다. next/navigation을 mock한 것은 불가피하고 검증 대상은 호출 여부가 아니라 인자다. 테스트의 품질이 아니라 범위가 문제다.

그리고 규칙을 지킨 코드가 같은 저장소에 있다. `lib/supabase/rag.ts:168`과 `lib/supabase/sentry-alerts.ts:64`의 JSDoc은 타입 없이 `@param name 설명` 형식이다. `features/custom-cursor/_components/CustomCursor.module.css:9-10`은 색을 로컬 토큰에 담았다.

```css
--cursor-contrast-light: rgb(255 255 255 / 72%);
--cursor-contrast-dark: rgb(0 0 0 / 32%);
```

올바른 형태가 무엇인지 저장소가 이미 알고 있다. 남은 일은 확산이지 발명이 아니다.

---

## 주석이 코드를 틀리게 설명한다

비테스트·비mock 소스에 Firebase/Firestore 서술 주석이 **64줄 / 44파일** 남아 있다(mock과 코드 식별자까지 포함하면 93줄 / 50파일). `src/`에 firebase import는 0건이므로 이 주석들이 가리키는 시스템은 실행되지 않는다.

가장 명확한 사실 오류는 `src/constants/collections.ts:30`이다.

```ts
/** PostgREST order 파라미터. 기존 Firestore 쿼리의 정렬 계약과 같다. */
order: string;
```

PostgREST 파라미터의 근거로 존재하지 않는 시스템의 계약을 든다. `sort_order.asc,id.asc` 2차 키 계약이 왜 그 모양인지 알고 싶은 사람은 존재하지 않는 문서를 찾게 된다.

`src/lib/content/normalize-troubleshooting.ts:18-23`은 한 블록에 위반 네 개가 겹친다.

```ts
/**
 * troubleshooting 필드 정규화 — 신형 {title,problem,solution,result?} 는 그대로,
 * 레거시 평문 {ko,en} 은 화살표 분리로 이행(재저장 전까지 공개 페이지 하위호환).
 * 클라 SDK(dev.ts)·REST(firestore-rest.ts) 디코더 양쪽이 공유하는 순수 함수 — firebase import 금지.
 *
 * @param {unknown} value Firestore에서 읽은 문제 해결 목록.
 * @returns {DevTroubleshooting[]} 현재 스키마로 정규화된 문제 해결 목록.
 */
```

`firestore-rest.ts`는 `src` 전체에 없다(`find src -name "firestore-rest*"` 결과 0건). Firestore 잔재, 존재하지 않는 파일 참조, 대시 접속, 타입 반복 JSDoc이 여섯 줄 안에 모여 있다.

`src/features/admin-dev-articles/_lib/dev-article-repository.ts:25-33`은 사실 관계도 틀렸다.

```ts
// 지금은 브라우저 로컬 구현만 있고, B5 에서 … 감싸 끼운다
```

같은 폴더에 `live-dev-article-repository.ts`가 이미 있다. 주석이 약속한 미래가 이미 과거다.

### 삭제할 것과 치환할 것

64줄을 일괄 삭제하면 안 된다. CLAUDE.md 완료 점검 1번("이 주석이 없으면 코드에서 알 수 없는 정보가 사라지는가?")을 각 건에 적용하면 대략 절반 이하만 삭제 대상이고, 나머지는 Firestore를 Supabase/PostgREST로 바꾸는 단어 교체다. 근거 문장까지 지우면 정보가 사라진다.

치환해야 하는 대표 사례 셋:

`src/features/gallery/_hooks/use-infinite-scroll.ts:5-9`은 왜 서버 페이지네이션이 아니라 클라이언트 윈도잉인지를 설명한다.

```ts
/**
 * 클라이언트 윈도잉 무한스크롤 — 이미 로드된 배열을 화면에 점진 렌더한다(추가 fetch 없음).
 * 서버가 ISR 로 전체를 한 번 받고(방문자당 read 0), 여기선 pageSize 만큼만 렌더 → 하단 sentinel 이
 * 뷰포트에 들어오면 count 를 늘린다. 진짜 Firestore 페이지네이션이 아니라 DOM 마운트만 점진화한 것 —
 * 클라 필터·검색(전체 배열 대상)의 즉각성과 무료 한도(읽기)를 그대로 지킨다.
```

"무료 한도(읽기)"는 코드에서 알 수 없는 제약이다. 고칠 곳은 "Firestore 페이지네이션" 한 단어이지 블록 전체가 아니다.

`src/features/admin-dev-articles/_lib/dev-article-sort.ts:9-12`도 같다.

```ts
 * 늘어놓는다 — 관리자 목록에서 먼저 찾게 되는 것은 지금 쓰고 있는 글이고, 방금 만든 초안이
 * 목록 맨 아래로 가라앉으면 매번 찾아 내려가야 한다. 정렬은 Firestore 쿼리로 표현할 수 없어
 * (초안의 `publishedAt` 이 비어 있다) B5 이후에도 화면 쪽 순수 함수로 남는다.
```

"초안은 `publishedAt`이 없어 정렬 축이 없다"는 도메인 근거이고 지워선 안 된다. 고칠 것은 "가라앉으면"(비유), "Firestore 쿼리"(사실 오류), "B5 이후에도"(단계 참조) 셋이다.

`src/constants/security-headers.ts:41-46`은 CSP 허용 호스트의 순서 근거를 담는다.

```ts
 * Firebase 호스트는 이전 완료(M8) 전까지 유지한다. mock 업로더가 [0]의 Firebase URL 형태를
 * 쓰므로 Supabase 는 끝에 붙인다.
```

"mock 업로더가 그 URL 형태를 쓴다"는 보존해야 할 호환성 근거다. `(M8)` 단계 번호만 빼고, 유지 조건을 "레거시 이미지 URL이 DB에 남아 있는 동안"처럼 검증 가능한 형태로 바꾸면 된다.

### `vitest.config.ts:13`: 거짓 근거가 실제로 해를 끼친다

Firebase 잔재 중 유일하게 동작에 영향을 주는 건이다.

```ts
// 관리자 mock 저장소 — repository 조립 모듈은 firebase 를 끌고 오므로 순수 구현만 잰다.
"src/lib/admin/mock/*.ts",
```

`src/`에 firebase import는 0건이다. 이 문장은 이미 거짓인데, 그 거짓 근거로 커버리지 `include`에서 `src/lib/admin/**`의 조립 모듈이 빠져 있다. 나머지 63줄은 읽는 사람을 오도할 뿐이지만 이 한 줄은 게이트를 좁혀 놓았다. Firebase 표면을 제거할 때 이 주석을 지우는 것과 `src/lib/supabase/**`를 include에 넣는 것은 같은 작업이다.

### 정당해서 남길 것

- `features/admin-maintenance/_lib/article-body-storage-paths.ts:5,41,60` 실제로 레거시 Firebase 다운로드 URL을 파싱한다.
- `features/dev-blog/_lib/article-tag-tokens.ts:7` "Firebase"를 ko/en이 같은 태그의 예시로 든 것이다.
- `constants/security-headers.ts`의 `STORAGE_IMAGE_HOSTS` 상수 자체. 레거시 이미지 URL이 DB에 남아 있는 한 CSP 허용이 필요하다.

---

## JSDoc이 타입을 되풀이한다

CLAUDE.md는 "`@param`, `@returns`도 타입을 그대로 반복한다면 생략한다"고 적었다. 코드베이스 전역이 반대로 되어 있다.

| 형태 | 건수 | 그중 설명 없음 |
| --- | --- | --- |
| `@param {Type} name` | 1,407 | 568 |
| `@returns {Type}` | 813 | 375 |
| 합계 | **2,220** | **943** |

943건은 삭제 대상이다. `@param {Props} props`, `@returns {JSX.Element}` 형태로 타입 외에 아무 정보가 없다. `src/app/admin/**/page.tsx`에만 `@returns {JSX.Element}`가 17건 있고, `src/app/[lang]/(public)/**/page.tsx`에 `@returns {Promise<JSX.Element>}`가 10건 있다.

나머지 1,277건은 설명을 갖고 있으므로 `{Type}` 부분만 벗기고 설명은 남긴다. `@param {unknown} value Firestore에서 읽은 문제 해결 목록.`에서 지울 것은 `{unknown}`이다(더불어 "Firestore"도). 정규식 두 벌이면 되고 TypeScript가 타입의 출처이므로 타입 안전성에 영향이 없다.

`@param {` 밀집 상위: `chat/_lib/handle-chat-request.ts` 20, `dev-blog/_lib/markdown-normalize.ts` 17, `chat/_lib/resolve-chat-screen-context.ts` 16, `lib/supabase/public/music.ts` 14, `lib/supabase/list-crud.ts` 14.

### 오배치 JSDoc 2건

`src/components/Skeleton.tsx:13-21`에서 `Skeleton` 컴포넌트를 설명하는 블록이 바로 아래 헬퍼 `toSize`에 붙어 있다.

```ts
/**
 * 로딩 자리표시 블록 — surface-2 배경에 은은한 pulse(하이라이트 surface-3).
 * 스피너 대신 셸 레이아웃을 흉내 내 CLS 방지. 크기는 props → 인라인 스타일로 지정.
 * prefers-reduced-motion 에서는 애니메이션 비활성(정적 블록).
 *
 * @param {number | string} [value]
 * @returns {string | undefined}
 */
const toSize = (value?: number | string) => (typeof value === "number" ? `${value}px` : value);
```

정작 `Skeleton` 함수에는 JSDoc이 없다. IDE 호버가 `toSize` 위에서 CLS 방지 설명을 띄운다.

`src/features/admin-dev-articles/_lib/new-article-id.ts:3-13`은 그보다 심하다. 블록이 **어떤 선언에도 붙어 있지 않다**. 파일 최상단 import 다음에 열한 줄짜리 JSDoc이 떠 있고, 그 아래 빈 줄을 사이에 두고 별개의 JSDoc과 `resolveNewArticleId`가 시작한다. 파일 개요 주석 의도라면 `/** */`가 아니라 `//` 블록이거나 선언에 붙어야 한다. 지금 형태로는 어떤 도구도 이 설명을 어디에도 연결하지 못한다.

### 왜 마지막에 해야 하나

2,220건 수정은 위험이 0에 가깝다. 그런데 diff가 2,000줄대라 같은 시점의 다른 변경을 전부 가린다. 디코더 통합이나 관리자 폼 리팩터와 섞이면 리뷰가 불가능해진다. 다른 작업이 끝난 뒤 단독 커밋이 맞다.

---

## 주석 문체

| 항목 | 건수 | 근거 |
| --- | --- | --- |
| em dash로 문장을 이은 주석 라인 | 627 | CLAUDE.md 원칙 5 |
| 화살표로 절차를 꾸민 주석 라인 | 82 | 원칙 5 |
| 계획 문서 단계 참조 | 41 | 원칙 1 |
| 비유·과장 표현 | 27 (실제 위반 8) | 원칙 4 |
| 판단 변호 | 1 | 원칙 6 |

### 일괄 교정을 권하지 않는다

원칙 5의 문장은 "대시로 문장을 길게 잇지 않는다"이지 대시 금지가 아니다. 627줄 중 상당수는 `— 사진 전용`처럼 짧은 동격 표기이고 규칙 위반이 아니다. 전수 교정은 diff 627줄에 의미 변화가 0이고, 기계적으로 자르는 과정에서 정당한 근거 문장이 함께 잘려 나갈 위험이 있다.

새로 쓰는 주석과 다른 이유로 이미 손대는 주석에만 적용하는 쪽을 권한다. Firebase 주석 64줄을 고칠 때 그 줄들의 대시는 어차피 함께 정리된다.

### 계획 단계 참조 41줄

CLAUDE.md가 나쁜 예시로 든 첫 번째 문장("B5에서 새 저장소 경계를 얹는다")이 코드에 거의 그대로 있다. 내역은 `(계획 §N)` 형태 27줄 / 25파일 + `B*`·`M*`·`Phase*` 토큰 14줄이다.

```
features/admin-dev-articles/_lib/dev-article-issue-message.ts:7   "B2 는 … 문구를 미뤄 뒀다"
features/auth/_hooks/use-auth.ts:22                               "B3.5 가 약속한"
lib/admin/admin-list-repository.ts:5                              "B3 블로그에서 세운"
types/dev-article-tag.ts:6                                        "B5 에서 별도 컬렉션이 된다"
constants/routes.ts:18                                            "B4 에서 화면 구현"
constants/routes.ts:15                                            "개발 섹션 (/dev/*) — Phase C"
features/admin-dev-articles/_hooks/use-dev-articles-admin.ts:24   "B5 이후에도"
types/timeline.ts:3                                               "개발 경력(Phase C)"
constants/collections.ts:51                                       "RAG 는 M6에서 RPC 로 조회한다"
constants/security-headers.ts:43                                  "(M8) 전까지"
```

`constants/routes.ts:18`의 "B4 에서 화면 구현"은 이미 구현된 화면을 가리키므로 사실 오류를 겸한다.

예외 2건이 있다. `features/chat/_lib/handle-chat-request.ts:570`의 "(checklist 08 M6 후속)"과 `lib/ai/rag-search.ts:32`의 "(checklist 08 M6 기록)"은 `docs/checklist/08-supabase-migration.md`라는 실존 문서를 인용한다. 원칙 8("TODO에는 완료 조건이나 추적 대상을 적는다")에 부합하므로 남긴다. 제거 대상은 나머지 39줄이다.

### 비유 27건 중 실제 위반은 8건

"사라진다" 계열 14건은 실제 데이터 손실을 뜻해서 원 보고서 스스로 허용 가능하다고 적었고, 그 판단이 맞다. CLAUDE.md가 명시적으로 금지어로 든 표현만 남기면 8건이다.

```
features/admin-dev-articles/_lib/new-article-id.ts:4,15,36           붙들어 둔다 / 놓아 준다 / 주인을 잃는다
features/admin-dev-articles/_components/ArticleBodyEditor.tsx:58     붙들어 둔다
features/chat/_lib/chat-response-contract.ts:126,140                 회수한다
features/admin-dev-articles/_lib/dev-article-sort.ts:11              가라앉으면
```

판단 변호 1건은 `features/chat/_lib/chat-response-contract.ts:127`이다.

```ts
// "본문 확정 + links/references 포기"가 "다 보여주고 오류"보다 항상 낫다.
```

CLAUDE.md 원칙 6이 금지한 "이쪽이 더 낫다" 패턴 그대로다. 무엇을 막는지로 바꾸면 된다. 예: "링크 파싱이 실패해도 본문은 렌더한다."

---

## 컨벤션

| ID | 주장 | 판정 |
| --- | --- | --- |
| CONV-01 | `.module.css` 하드코딩 `rgba()` | 부분확정 (45건 / 15파일, 실제 조치 2줄) |
| CONV-02 | `_types/` 폴더가 규약 밖 | 확정 |
| CONV-03 | ESLint boundaries가 `src/lib`·`src/mocks` 미감시 | 확정 |
| CONV-04 | `../` 금지·barrel 금지에 CI 게이트 없음 | 확정 |
| CONV-05 | 관리자 UI 문자열 191건 사전 미경유 | 확정 (규약 문서 측 문제) |
| CONV-06 | 300줄 초과 20파일 | 확정 |
| CONV-07 | CLAUDE.md 구조도 드리프트 | 확정 |

확정 5, 부분확정 2, 기각 0.

### CONV-01: rgba 45건 중 고칠 것은 2줄

원 보고서는 49건 / 16파일로 셌으나 실제는 **45 occurrence / 15파일**이다. 차이는 `features/custom-cursor/_components/CustomCursor.module.css`를 5건으로 열거한 데서 나왔다. **그 파일에는 rgba가 0건이다.** `rgb(255 255 255 / 72%)` 슬래시 알파 문법을 쓰고, 그마저 `--cursor-contrast-light`/`--cursor-contrast-dark` 로컬 토큰에 담아 두었다. 위반이 아니라 모범 사례이고, 검증 없이 파일명을 열거한 인용 오류다.

실제 위반은 두 줄이다. `globals.css:105`에 `--scrim`이 라이트 `0.55` / 다크 `0.7`로 이미 정의돼 있는데 두 오버레이가 이를 무시한다.

```css
/* src/components/Modal.module.css:25 */
background: rgba(0, 0, 0, 0.5);

/* src/components/AlbumCard.module.css:29 */
background: rgba(0, 0, 0, 0.5);
```

`var(--scrim)`으로 바꾸면 다크모드 대응이 붙는다. 나머지 38~43건은 사진 위 그라디언트(`DetailHero` 7, `ImageLightbox` 9, `PhotoTile` 2 등)로, 사진은 테마를 따라 바뀌지 않으므로 테마 무관 고정색이 정당하다. 토큰화하면 오히려 의도가 흐려진다. CLAUDE.md에 "사진 위 오버레이의 테마 무관 고정색은 `rgba()` 직접 사용을 허용한다" 한 줄을 넣으면 40여 건이 위반에서 사양으로 바뀐다.

### CONV-02: `_types/` 폴더 2개

CLAUDE.md는 feature 하위폴더를 `_components/`·`_hooks/`·`_lib/` 셋으로 규정한다. 실제 분포는 `_components` 37 / `_hooks` 30 / `_lib` 23 / `_types` 2다.

```
src/features/map/_types/map-location.ts            순수 유틸(toMapLocations). _lib/ 소속
src/features/map/_types/map-location.test.ts
src/features/gallery/_types/gallery-photo.test.ts  테스트 하나만 있는 고아 폴더
```

`gallery/_types/`가 더 이상하다. 폴더에 테스트 파일 하나만 있고, 그 테스트가 검증하는 대상은 `src/types/gallery-photo.ts`다. 테스트가 대상과 다른 레이어에 떠 있다. `src/types/gallery-photo.test.ts`로 옮기는 것이 맞다. 부수 효과로, `eslint.config.mjs`의 `import/order` pathGroups에 `_types`가 없어 이 경로는 마지막 catch-all에 걸리고 `@/lib`·`@/constants`보다 뒤에 정렬된다. 파일 3개 이동으로 끝난다.

### CONV-03 / CONV-04: 게이트가 없다

`eslint.config.mjs:44-58`의 `boundaries/elements`에 `src/lib`와 `src/mocks`가 없다.

```js
{ type: "app",      pattern: "src/app" },
{ type: "platform", pattern: "src/features/(lang|theme|image-upload|photo-detail|dev-blog)" },
{ type: "feature",  pattern: "src/features/*" },
{ type: "shared",   pattern: "src/(components|hooks|utils|stores|api|services|constants|schemas|providers|i18n|types|assets|styles)" },
```

`src/lib`는 비테스트 104파일로 저장소에서 가장 큰 공유 레이어다. `boundaries/dependencies`가 `default: "allow"`이고 `boundaries/no-unknown`도 꺼져 있으므로, `src/lib/**`에서 `@/features/**`나 `@/app/**`를 import해도 린트가 통과한다. 현재 실제 위반은 0건이지만 그건 관행이지 도구가 아니다.

CONV-04도 같은 성격이다. `no-restricted-imports`, `import/no-internal-modules`, `boundaries/no-unknown` 셋 다 설정에 없다. `../` 금지와 barrel 금지를 강제하는 것은 Claude Code hook의 경고뿐이고 CI는 검출하지 못한다. shared 패턴에 `lib|mocks`를 더하고 `no-restricted-imports patterns: ["../*"]` 한 줄을 넣으면 둘 다 닫힌다.

### CONV-05: 코드가 아니라 문서 문제

관리자 화면 JSX에 한국어 리터럴 191건이 있다. 사실은 맞지만 이건 규약 쪽 문제다. 관리자는 본인 1명이고 한국어 고정이 합리적이다. 사전 경유는 번역 대상이 없는 문자열에 간접층을 더할 뿐이다. CLAUDE.md에 예외 한 줄을 넣으면 191건이 위반에서 사양으로 바뀐다.

다만 접근성 문제 하나가 별도로 남는다. `app/admin/dev/page.tsx:43`, `music/page.tsx:49`, `photo/page.tsx:44`, `page.tsx:63`의 `<span>관리 →</span>`는 UI 문자열 안에 화살표를 넣은 사례로, 스크린리더가 "관리 오른쪽 화살표"로 읽는다. 이 4개소는 사전 예외와 무관하게 고쳐야 한다.

### CONV-06: 300줄 초과 20파일

623개 중 20개(3.2%)로 전반적으로 양호하다. 상위 3개만 분할 여지가 뚜렷하다.

| 줄 | 파일 | 판단 |
| --- | --- | --- |
| 1,020 | `features/legal/_lib/legal-documents.tsx` | Privacy·Terms·Accessibility 3개 문서 원문이 한 파일. 문서당 1파일로 분리. JSX를 갖는 파일이 `_lib/`에 있는 배치 문제도 함께 해소 |
| 720 | `features/custom-cursor/_components/CustomCursor.tsx` | 포인터 추적을 `_hooks`·`_lib`로 추출하면 컴포넌트는 렌더만 남는다 |
| 687 | `features/chat/_lib/handle-chat-request.ts` | 요청 검증·rate limit·문맥 조립·스트리밍이 한 파일. `@param {` 20건이 몰린 파일이기도 하다 |
| 640 | `constants/dictionary.ts` | 사전은 단일 출처가 목적이므로 유지 타당 |
| 624 / 501 / 337 | `mocks/dev.ts`, `mocks/dev-articles.ts`, `mocks/photos.ts` | 데이터 파일. 유지 타당 |
| 609 | `features/photo-detail/_components/PhotoModal.tsx` | 라이트박스/바텀시트 분기 + 줌 + 딥링크. 분할 가능 |

이 목록은 아키텍처 보고서의 개별 SRP 발견(`ARCH-A-01`·`ARCH-A-02`·`ARCH-A-15`)과 같은 파일을 가리킨다. 목록은 여기, 분해 설계는 그쪽이다.

### CONV-07: 감사 기준 문서가 코드보다 뒤처졌다

CLAUDE.md 「디렉토리 구조」가 실제 트리와 어긋나서 규약 판정 자체가 흔들린다.

문서에 있는데 코드에 없는 것:

```
features/export/                    폴더 없음
constants/FRAME_STYLES              grep 0건
components/FrameCard, ExifList, MapPin, SectionHeading   전부 0건
components/WorkPoster               mocks/music.ts의 필드명일 뿐 컴포넌트 아님
components/ProjectCard              DevProjectCard로 개명됨
```

「Project Vision」의 "프레임 내보내기"와 스택 표의 "내보내기 | 클라이언트 canvas | 프레임 6종 + EXIF 각인"도 구현이 없다. 제거된 기능인지 미구현인지 문서만으로 판별할 수 없다.

코드에 있는데 문서에 없는 것: feature 8개(`custom-cursor`, `custom-scrollbar`, `motion`, `monitoring`, `sentry-triage`, `webmcp`, `site-footer`, `search`), `src/utils/`, `src/hooks/` 14파일(문서는 `use-scroll-lock` 하나만 예시로 든다).

여기에 더해, **섹션 액센트 색 세 개가 전부 실제와 다르다.** CLAUDE.md는 아키텍처 원칙 9로 `[data-section]` 액센트를 못 박아 두고 색값까지 표에 적었는데, `src/app/globals.css:68-70`의 실제 값은 다르다.

| 섹션 | CLAUDE.md | `globals.css:68-70` |
| --- | --- | --- |
| photo | `#0a84ff` | `#0066cc` |
| music | `#e5484d` | `#b4232d` |
| dev | `#16a34a` | `#087a32` |

셋 다 실제 구현이 문서보다 어둡다. 대비를 위해 조정한 결과로 보이는데 문서가 따라오지 않았다. 디자인 충실도 점검(`/design-check`)이 CLAUDE.md를 기준으로 삼는 순간 잘못된 색을 정답으로 판정한다.

---

## 커버리지 게이트가 신호를 주지 않는다

**TEST-01 확정.** `vitest.config.ts:11-39`의 `coverage.include`는 명시적 allowlist다. 85%/80% 임계값이 걸리는 대상은 158파일 / 15,284줄이다.

| 패턴 | 파일 |
| --- | --- |
| `src/features/**/_lib/*.ts` | 121 |
| `src/lib/admin/mock/*.ts` | 4 |
| `src/lib/{search,i18n}/*.ts` | 10 |
| `src/lib/{format,exif,geo}/*.ts` | 4 |
| 개별 지정 `.ts` 4개 | 4 |
| `src/hooks/*.ts` 5개 + contact `_hooks` 2개 | 7 |
| 개별 지정 컴포넌트·뷰 8개 | 8 |
| 합계 | **158 / 623 = 25.4%** |

파일 수로는 25.4%이고 줄 수로는 15,284 / 54,974 = **27.8%**다. 임계값이 걸리는 단위는 줄과 구문이므로 줄 기준이 옳은 척도이고, "약 28%"라는 결론은 정확하다.

측정에서 빠진 영역 중 상당수는 **테스트가 이미 있는데도** 수치에 반영되지 않는다.

| 영역 | 보유 테스트 |
| --- | --- |
| `src/lib/supabase/**` | 11 |
| `src/lib/monitoring` | 5 |
| `src/lib/ai` | 5 |
| `src/lib/cache` | 3 |
| `src/lib/{security,auth,webmcp,seo,text}` | 12 |
| `src/constants` | 4 |
| `src/app/**` | 약 5 |

**이미 존재하는 테스트 39~44개가 커버리지 수치에 전혀 잡히지 않는다.** allowlist 구조의 결과다. 새 코드는 기본적으로 게이트 밖에서 태어나고, 85% 임계값은 이미 잘 테스트된 158파일 위에서만 계산되므로 항상 통과한다. `npm run test:coverage`가 초록이어도 RLS 경계, PostgREST transport, route handler, 관리자 CMS의 실제 커버리지는 아무도 모른다.

allowlist를 좁힌 근거는 앞서 본 `vitest.config.ts:13`의 거짓 문장이다.

고치는 방향은 include를 exclude 기반으로 뒤집는 것이다(`src/**/*.{ts,tsx}`에서 테스트·mocks·`.d.ts`를 뺀다). 단 임계값을 그대로 두면 즉시 실패하므로 실측값에서 시작해 올려야 한다. 최소 이행만 해도 `src/lib/supabase/**`와 `lib/{monitoring,ai,cache,security,auth}/**`를 include에 넣으면 이미 있는 테스트 39~44개가 처음으로 수치에 반영된다.

같은 구조가 ESLint boundaries에도 있다(CONV-03). 두 게이트 모두 감시 대상을 명시한 것만 감시한다. 게이트를 먼저 뒤집어야 이후 리팩터가 회귀 신호를 갖는다.

---

## 테스트가 없는 곳

### TEST-02: 관리자 CMS 61파일 (확정, 규모 과소평가)

원 보고서는 45파일 / 13디렉토리로 셌으나 실제는 **61파일 / 24디렉토리**다. `admin-*` feature의 `_components` + `_hooks` 비테스트 파일은 86개이고, 그중 테스트가 있는 곳은 세 군데뿐이다.

```
admin-dev-articles/_components   14파일, 테스트 1
admin-dev-articles/_hooks         6파일, 테스트 1
admin-maintenance/_components     5파일, 테스트 2
```

나머지 24개 디렉토리 61파일에 단위 테스트가 0이다. `_lib/`(순수 로직)에는 테스트가 잘 붙어 있으므로 전략 자체는 있다. 문제는 dnd-kit 정렬 훅(`use-*-admin`)처럼 상태 전이가 복잡한 훅이 E2E에만 의존한다는 점이다. `docs/testing.md`가 기록하듯 E2E는 머신 부하에 따라 실행마다 소수가 실패한다. 유일한 안전망으로는 약하다.

관리자는 이 저장소의 유일한 쓰기 경로다. 다만 61개를 그대로 테스트하는 것은 답이 아니다. 같은 CRUD가 6~7벌 복제돼 있어서 61파일이 된 것이고, 복붙을 먼저 지우면 테스트 대상이 6분의 1로 준다. 테스트 추가는 그 리팩터의 결과지 별도 작업이 아니다.

### TEST-03: 공개 디코더 4종 (확정)

CLAUDE.md 아키텍처 원칙 6이 정한 공개 렌더 경로다. 디코더가 잘못되면 공개 사이트 전체가 빈 화면이 된다.

```
src/lib/supabase/public/transport.ts      테스트 있음
src/lib/supabase/public/dev-articles.ts   테스트 있음
src/lib/supabase/public/photo.ts          없음
src/lib/supabase/public/music.ts          없음
src/lib/supabase/public/dev.ts            없음
src/lib/supabase/public/site.ts           없음
src/lib/supabase/public/retry-fetch.ts    없음
```

사진·음악·개발 세 섹션의 공개 디코더가 전부 미검증이다. `mergeRow` 계약(`data` jsonb를 펼친 뒤 스칼라 컬럼으로 덮기)은 CLAUDE.md가 "구형 데이터의 `data.published` 잔존값이 DB 스칼라를 이기지 못하게 하는 계약"이라고 명시할 만큼 중요한데, `admin/row-codec.test.ts`에서만 검증되고 공개 경로에서는 검증되지 않는다.

디코더가 공개용과 관리자용 두 벌인 것이 원인이고, 순수 디코더 한 벌을 전송 계층 밖으로 뽑으면 테스트가 싸진다. 데이터 계층 보고서의 `ARCH-D-01`·`ARCH-D-07`이 같은 코드를 가리킨다.

### TEST-04: 관리자 세션 가드 (확정)

```
src/lib/supabase/admin/require-admin-session.ts   없음
src/lib/supabase/admin/sort-rpc.ts                없음
src/lib/supabase/auth.ts                          없음
src/lib/supabase/{photos,albums,dev,site}.ts      전부 없음
```

`admin/` 디렉토리에 있는 테스트는 `row-codec.test.ts` 하나뿐이다.

`requireAdminSession()`은 CLAUDE.md 아키텍처 원칙 4가 명시한 장치다. "초안이 조용히 사라지는 상태를 로그인 오류로 바꾼다"는 계약이 테스트로 고정돼 있지 않다. 그리고 인증 보고서의 `AUTH-05`가 바로 이 함수에서 실제 결함을 찾았다. 세션 존재만 보고 admin 클레임을 확인하지 않는다. 문서가 정한 계약, 실제 구현, 테스트 부재가 같은 지점에서 만난다. 이 함수를 고치면서 테스트를 붙이는 것이 TEST-04의 대표 케이스다.

RLS 자체는 DB 계층이라 단위 테스트 대상이 아니다. CLAUDE.md도 `npm run test:rules`가 레거시이며 로컬 Supabase 기반 RLS 통합 테스트로 대체 예정이라고 적었는데, 그 대체는 아직 없다.

### TEST-05: 업로드 파이프라인 (확정)

```
src/features/image-upload/_lib/compress.ts                 없음
src/features/image-upload/_hooks/use-image-upload.ts       없음
src/features/image-upload/_hooks/use-poster-upload.ts      없음
src/features/image-upload/_hooks/use-dev-image-upload.ts   없음
```

같은 폴더의 `asset-lifecycle.ts`·`read-dimensions.ts`·`run-limited.ts`에는 테스트가 있다. 빠진 것이 하필 아키텍처 원칙 3의 핵심이다. EXIF 추출은 압축 전에 일어나야 하고, 순서가 뒤집히면 촬영 정보가 전부 소실된다. 그 순서를 고정하는 테스트가 없다. 브라우저 API 의존이 이유라면 `browser-image-compression`을 주입 가능하게 만들어 호출 순서만이라도 검증할 수 있다. 클라이언트 보안 보고서의 `SEC-C-02`(업로드 타입·크기 검증 부재)가 같은 파일을 다룬다.

### 조치 불필요로 확인한 것

TEST-07(단언 1개짜리 테스트 2건)과 TEST-08(mock 호출 검증 비중 높은 파일 6건)은 원 보고서가 직접 열어 본 뒤 정당하다고 결론지었고 재검증도 동의한다. 조치 항목이 아니라 확인 기록으로 남긴다.

다만 `features/gallery/_types/gallery-photo.test.ts`는 케이스가 하나뿐이라 `coords`·`shotAt`·`ev` 제외가 의도인지 누락인지 구분되지 않는다. 선택적 필드가 없는 사진 케이스를 하나 더하면 좋다(파일 위치는 CONV-02에서 별도로 정리 대상이다).

---

## E2E

22개 스펙(desktop·mobile 2 project)이 `CONTEXT.md`의 behavior contract를 대체로 충족한다. **TEST-06은 부분확정이고 하위 주장 2건은 기각됐다.**

### 기각된 주장 2건

**"`next.config` 308 redirects 미검증"은 사실이 아니다.** `e2e/pages/locale.e2e.ts:5-57`이 그 계약을 전부 단언한다.

```ts
test("루트는 브라우저 언어를 따르고 v1 URL은 /ko로 체인 없이 직행한다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ko$/);

  await page.goto("/dev/projects");
  await expect(page).toHaveURL(/\/ko\/dev\/projects$/);

  // v1 사진 URL — /albums → /ko/photo/albums 직행 (중간 /photo/albums 경유 없음)
  await page.goto("/albums");
  await expect(page).toHaveURL(/\/ko\/photo\/albums$/);
});
```

이어지는 두 테스트가 `/dev/about → /dev` 308을 무-로케일 포함 3케이스로, 그리고 루트 요청의 307 협상, 쿠키 우선순위, `cache-control: private, no-store`, set-cookie 부재, query 보존까지 단언한다. 308 체인 금지도 검증돼 있다.

**"테마 토글 UI 미검증"도 사실이 아니다.** `e2e/utils/assertions/public-page.assertions.ts:16`의 `themeCanBeChanged()`가 버튼 클릭 후 `html[data-theme]` 변경을 단언하고, `public-pages.e2e.ts`가 이를 호출한다.

```ts
async themeCanBeChanged(page: Page) {
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  // 라벨은 페이지 언어(/ko·/en)를 따르므로 두 사전 값 모두 매치한다.
  await page.getByRole("button", { name: /테마 전환|Toggle theme/ }).click();
  await expect(html).not.toHaveAttribute("data-theme", before ?? "");
}
```

두 건 모두 원 보고서가 스펙을 확인하지 않고 적었다. `locale.e2e.ts` 하나가 예상보다 훨씬 촘촘하다.

### 실제로 빠진 3건

**`/photo/map` 전용 스펙이 없다.** `custom-cursor.e2e.ts:13`, `photo.e2e.ts:180`, `public-routes.ts:18`이 부수적으로 방문할 뿐이다. 지도 핀, 위치 목록, 핀 클릭에서 사진 모달로 이어지는 흐름을 검증하는 스펙이 없다. `CONTEXT.md`는 "Photo Map"을 공개 area로 명시한다.

**앨범 상세의 `photoIds` 수동 순서가 미검증이다.** 앨범 상세를 방문하는 스펙은 4곳 있지만 전부 페이지가 열리는지까지만 본다. 앨범 내 사진 순서는 CLAUDE.md 데이터 모델의 핵심 계약("앨범 내 사진 순서 = `photoIds` 배열 순서")인데 화면 반영을 확인하지 않는다.

**언어 메뉴 전환 UI가 미검증이다.** `analytics-consent.e2e.ts:102`가 언어 버튼을 누르긴 하지만 동의가 생성되지 않는지만 본다. 상단 `LangMenu`로 `/ko/photo`와 `/en/photo`를 오갈 때 같은 페이지와 같은 query가 유지되는지(ADR-0002의 "언어 메뉴만 같은 페이지의 반대 언어 경로로 이동")를 검증하는 스펙이 없다. 리다이렉트 계약은 촘촘한데 토글 UI 쪽만 비어 있다.

관리자 E2E 7개 스펙은 오히려 잘 갖춰져 있고 TEST-02의 단위 테스트 공백을 부분적으로 메운다.
