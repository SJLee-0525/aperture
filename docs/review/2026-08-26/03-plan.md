# 공개 화면 — 실행 계획

[03-public-ui.md](03-public-ui.md) 의 항목 전부에 판정을 붙인 실행 계획이다.
형식은 [01-plan.md](01-plan.md) 를 따르고, 처리 결과는 작업 완료 후 `03-resolution.md` 에 적는다.

**세는 단위**: 03 문서는 `###` 섹션 48개, 항목 ID 52개다(한 섹션이 ID 를 2~3개 묶은 곳이 있고
CLAUDE.md 액센트 색 섹션에는 ID 가 없다). 아래 판정표는 **섹션 48개 기준**이다.

고치는 항목은 어떤 커밋에 들어가는지, 고치지 않는 항목은 왜 그런지를 적는다. 기각·이월한
항목의 근거는 해당 파일 주석에도 남겨 다음 리뷰가 같은 지적을 다시 올리지 않게 한다.

지금 실제로 사용자가 막히는 것은 셋이다.

- **UI-S-06** 모바일 하단 탭바 라벨이 라이트 2.56:1, 다크 3.07:1 이다. 주 내비게이션 라벨 4개 중
  3개가 상시 이 색이고 `MobileTabBar.module.css:45-47` 이 `font-size:10px; font-weight:600` 이라
  large text 예외에 걸리지 않는다.
- **UI-P-01** `--text-1` 이 정의되지 않아 `ExifPanel.module.css:45` 의 `outline` 단축이 IACVT 로
  무효화된다. 사진 상세 공유 버튼의 포커스 링이 실제로 사라져 있고 globals 에 전역 폴백이 없다.
- **UI-S-07/S-08/P-09** 팝업 세 종류가 Escape 후 트리거로 포커스를 돌려주지 않는다. 언어 전환은
  ADR-0002 가 지정한 유일한 언어 전환 UI 라 영향이 크다.

## 작업 순서와 경계

`02-correctness` 는 커밋 9개(`e0ad1a5` → `737740e`)로 끝났다. 이 계획을 통째로 진행하고
`05-architecture` 는 그 뒤다.
05 를 먼저 할 이유는 없다. 05 의 큰 항목(ARCH-A-03 관리자 CRUD, ARCH-A-05 수상 모달,
ARCH-D-01 디코더 통합)은 전부 관리자·데이터 계층이라 03 과 파일이 겹치지 않는다.

겹치는 것은 넷뿐이고 각각 이렇게 처리한다.

| 05 항목                            | 겹치는 03 항목    | 처리                                                   |
| ---------------------------------- | ----------------- | ------------------------------------------------------ |
| ARCH-A-08 `useEscapeKey` 13곳 통합 | UI-P-09·S-07·S-08 | **이 계획으로 당겨온다**(C7). 팝업 훅이 그 위에 얹힌다 |
| ARCH-A-06/A-07 `?photo=` 쓰기 경로 | UI-P-25           | 같은 `use-query-modal.ts`. 02 의 BUG-C-06 뒤에 C12     |
| ARCH-A-09 앨범 모달 로딩           | UI-P-11           | 파일만 같고 수정 지점이 다르다. 독립 진행              |
| ARCH-A-01 CustomCursor 720줄 분해  | UI-S-12·S-17      | S-17 은 1줄이라 C17. S-12 는 05 로 이월                |

02 가 이미 끝났으므로 순서 의존은 전부 해소됐다. 다만 02 가 같은 파일을 만진 곳이 셋이라
착수 시 현재 코드를 다시 읽고 시작한다. `use-query-modal.ts`(BUG-C-06 이 `openRef` 로 바꿨고
UI-P-25 는 그대로 남아 있다), `analytics-consent.ts`(BUG-C-16 뒤에도 UI-S-24 의 매 호출
`localStorage` 읽기는 남아 있다), `[lang]/(public)/[legalDoc]`(BUG-C-12 로 신설, 아래 §404 라우팅).

## 보고서에서 정정한 것

착수 전에 코드로 재확인한 결과 03 문서의 사실 8개가 달랐다. 계획은 아래 확인값을 따른다.

| #   | 보고서 서술                                | 확인한 사실                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | UI-S-01·UI-S-21 이 03 의 미처리 항목이다   | 둘 다 02 진행분으로 작업 트리에 이미 반영돼 있다. `theme-script.ts` 가 `LANGS` 로 프리픽스를 벗기고, `use-focus-trap.ts:33` 이 `getClientRects().length > 0` 이다. 03 의 실작업 대상은 46개 섹션이다                                                                                                                                        |
| 2   | 결과 수 영어 문구가 4곳                    | 5곳이다. `ArticlesView.tsx:115` 의 `` `${filtered.length} articles` `` 가 빠져 있었다                                                                                                                                                                                                                                                       |
| 3   | 이중 폴백 이미지는 `DevProjectCard` 뿐     | **3곳**이다. `DevProjectCard.tsx:56,65` · `ArticleBody.tsx:49-50`(상수 `BROKEN_IMAGE_FALLBACK`, 사용은 `:226-240`) · `ArticleCard.tsx:94,103`. CSS 짝도 3벌이다(`DevProjectsView.module.css:60-66`, `ArticleBody.module.css:121-127`, `ArticleCard.module.css:38-44`). `ArticleCard` 를 빼고 라우트를 지우면 블로그 목록 카드 커버가 깨진다 |
| 4   | UI-S-02 는 미디어 쿼리를 맞추면 끝         | `globals.css:227` 블록은 CustomCursor 의 `cursor:none` 도 함께 지배한다. 폭 조건을 그 블록에 더하면 900px 이하에서 커스텀 커서가 꺼진다. 스크롤바 규칙을 별도 미디어 쿼리로 분리해야 한다                                                                                                                                                   |
| 5   | UI-P-16 대상은 3파일                       | `OnDemandDevProjectDetail.tsx:44,53` 이 같은 `secL` 을 쓴다. `SearchResults.tsx:47`·`DevStackSection.tsx:37` 의 `u-label` 그룹 라벨도 같은 성격이다                                                                                                                                                                                         |
| 6   | UI-P-19 배너 gap 은 "버튼 사이" 간격       | `.banner` 가 `flex-direction: column`(`AnalyticsConsentBanner.module.css:11`)이라 문단과 버튼 행 사이 간격이다                                                                                                                                                                                                                              |
| 7   | `LocationList` 헤더를 `<h1>` 으로 승격한다 | 그 헤더는 `<aside id="map-location-scroll-container">`(`LocationList.tsx:74-75`) 안이다. 페이지 유일 헤딩이 complementary 랜드마크에 갇힌다                                                                                                                                                                                                 |
| 8   | UI-P-01 두 줄을 함께 `--accent` 로         | 두 줄의 성격이 다르다. `:40` 은 `.shareButton:hover` 의 **글자색**, `:45` 는 `:focus-visible` 의 **포커스 링**이다. `--text-1` 은 기본 텍스트 토큰 `--text`(#18181b)의 오타로 읽힌다. 둘 다 `--accent` 로 바꾸면 hover 시 글자가 파래져 원래 의도(글자가 진해짐)와 달라진다                                                                 |

**보고서가 맞고 이 계획의 초안이 틀렸던 것**: 접근성 E2E 라우트는 **13개**다
(`accessibility.e2e.ts:4-18`). 초안이 "14개"로 정정했던 것이 오류다. 공개 라우트 20개와 빠진 7개
(`/photo/map`·`/photo/about`·`/photo/albums/[id]`·`/music/about`·`/music/career`·`/music/media`·
`/search`)는 `page.tsx` 전수 대조로 확인했다.

추가로 하나 더 찾았다. `src/app/dev-project-image/route.ts:5` 와 `dev-project-image-dark/route.ts:5` 가
`accent: "#16a34a"` 를 하드코딩한다. 이건 CLAUDE.md 표의 낡은 값이고 실제 토큰 `--accent-dev` 는
`#087a32` 다. C14 에서 두 라우트를 제거하면서 함께 해소된다.

## 404 라우팅 (C15 의 전제)

`app/[lang]/not-found.tsx` 를 추가하는 것만으로는 목표를 못 맞춘다. Next 문서가 명시한다
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md:133`):
루트 `app/not-found.js` 가 앱 전체의 **매칭되지 않는 URL** 을 처리한다. 중첩 `not-found.js` 는
그 세그먼트 안에서 던진 `notFound()` 만 받는다.

| 요청           | 지금     | `[lang]/not-found.tsx` 만 추가                                            | `[...rest]` 까지 추가                    |
| -------------- | -------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| `/fr/anything` | 루트 404 | `[lang]/layout.tsx:40` 이 던지지만 그 레이아웃 자체가 실패하므로 루트 404 | 루트 404 (fr 은 지원 언어가 아니라 허용) |
| `/en/bogus`    | 루트 404 | **루트 404 그대로**                                                       | 로케일 404                               |
| `/en/a/b`      | 루트 404 | 루트 404                                                                  | 로케일 404                               |

따라서 C15 는 `app/[lang]/[...rest]/page.tsx` 가 `notFound()` 를 부르는 catch-all 을 함께 넣는다.

**`[legalDoc]` 은 이미 들어와 있다.** 02 의 BUG-C-12 가
`app/[lang]/(public)/[legalDoc]/page.tsx` 를 `dynamicParams = false`(`:26`)로 신설했다. 단일 동적
세그먼트가 catch-all 보다 우선하므로 `/ko/bogus` 는 이쪽이 잡는다. 그래도 catch-all 은 필요하다.
`[legalDoc]` 은 1세그먼트만 매칭하므로 `/ko/a/b` 는 여전히 `[...rest]` 몫이다. 즉 C15 의
catch-all 은 처음부터 "2세그먼트 이상 전용"이고 그 사실을 파일 주석에 적는다.

`dynamicParams = false` 로 인한 404 가 `[lang]/not-found.tsx` 까지 올라오는지는 **실측으로
확인한다.** 올라오지 않으면 `[legalDoc]/page.tsx` 에서 명시적으로 `notFound()` 를 부르거나
`(public)/not-found.tsx` 를 더한다. E2E 로 `/ko/bogus`·`/en/bogus`·`/en/a/b`·`/bogus` 네 경로를
고정한다.

## 확정한 설계 결정

| #    | 결정                                                                                                                                                    | 근거                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1   | 48개 섹션 전부 판정한다                                                                                                                                 | 기각·이월도 근거를 남겨야 재보고되지 않는다                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D2   | ARCH-A-08 을 당겨와 `useEscapeKey` 를 먼저 세운다                                                                                                       | 팝업 3종 수정이 Escape 처리를 새로 쓰는데, 나중에 A-08 이 같은 코드를 다시 쓰게 된다                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D3   | mega-menu 는 APG **Disclosure Navigation** 패턴. `role="menu"` 계열을 쓰지 않는다                                                                       | APG 가 사이트 내비게이션에 menu role 을 권하지 않는다. hover·focus·pin 3상태와 menu 규약을 섞으면 복잡도만 커진다                                                                                                                                                                                                                                                                                                                                                                                                                  |
| D4   | mega-menu 의 `onFocus` 자동 열림을 제거한다                                                                                                             | 키보드 진입만으로 패널이 펼쳐져 탭 경로가 20회가 되고, `pinned` 이 null 이라 Escape 가 무동작이 되는 원인이 이것 하나다. 마우스 hover 열림은 유지                                                                                                                                                                                                                                                                                                                                                                                  |
| D5   | `--text-4` 를 비텍스트 전용 토큰으로 규정한다                                                                                                           | 보고서가 제안한 라이트 `#8a8a93` 도 흰 배경 대비 3.42:1 이라 본문 4.5:1 에 못 미친다. 값만 올려서는 해결되지 않는다. 승격 대상 `--text-3` 은 라이트 5.51:1 / 다크 6.14:1 로 통과한다                                                                                                                                                                                                                                                                                                                                               |
| D6   | 스크림은 층위별 토큰 3종을 신설한다                                                                                                                     | `--scrim` 하나로 합치면 라이트박스 0.82→0.7, Modal 0.5→0.55 로 의도한 농도 위계가 사라진다                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D7   | 공개 focus 규칙은 `:where()` 특이도 0 폴백                                                                                                              | 기존 개별 규칙을 깨지 않으면서 사진 위 글래스 크롬만 반전 색으로 덮을 수 있다                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D8   | 결과 수는 영어 표기를 유지하고 `design/README.md` 이탈 표 11번으로 등재한다                                                                             | 사용자 확정. 단 `1 photos` 단수 깨짐은 언어 정책과 무관한 오류라 함께 고친다                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D9   | `/photo/map` 의 `<h1>` 은 sr-only, `LocationList` 헤더는 `<h2>`                                                                                         | 시각 변화 0. 페이지 유일 헤딩을 `<aside>` 밖에 둔다                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D10  | UI-P-08 은 `:focus-visible` 만 추가한다                                                                                                                 | 사용자 확정. `@media (hover:none)` 상시 노출은 채택하지 않는다. 터치 환경에서 메타가 안 보이는 상태는 유지 판정으로 기록                                                                                                                                                                                                                                                                                                                                                                                                           |
| D11  | UI-S-05 는 `aria-current` 만 부여한다                                                                                                                   | 사용자 확정. 색 외 시각 인디케이터는 넣지 않는다. 1.4.1 지적이 남는다는 사실을 03-plan 에 명시                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D12  | 이미지 폴백은 인라인 SVG 컴포넌트 하나로 통일한다                                                                                                       | `[data-theme]` 는 수동 토글이라 03:251 이 제안한 `<source media="(prefers-color-scheme: dark)">` 가 듣지 않는다. 세 CSS 파일 모두 `html[data-theme="dark"]` 로 전환한다. 토큰을 쓰는 인라인 SVG 면 요청 0회에 테마도 정확하고 UI-P-17 의 `"POSTER"` 도 같은 것으로 대체된다                                                                                                                                                                                                                                                        |
| D13  | 랜딩 초기 가시성은 인라인 스크립트가 붙이는 `html[data-js]` 로 게이트한다                                                                               | `@media (scripting: none)` 은 Safari 지원이 늦었고, theme-script 는 이미 `<head>` 동기 실행이라 추가 파일이 없다. 게이트 방향도 안전하다(스크립트가 죽으면 `opacity:0` 이 안 걸려 콘텐츠가 보인다)                                                                                                                                                                                                                                                                                                                                 |
| D14  | 이미지 보호는 이벤트 대상을 `img` 로 좁힌다. 래퍼 JSX 는 건드리지 않는다                                                                                | 훅 한 곳과 CSS 한 줄로 3파일의 텍스트 복사가 살아난다. 앞으로 래퍼를 넓게 붙여도 안전하다                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| D15  | 커스텀 스크롤바의 탭 스톱을 제거한다(`tabIndex` -1 고정 + `aria-hidden` 고정)                                                                           | 네이티브 스크롤바도 탭 스톱이 아니고, 방향키 스크롤은 컨테이너가 이미 처리한다. 마우스 드래그 기능은 그대로다                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D16  | 성능 3종 중 측정 없이 안전한 것만 착수한다                                                                                                              | UI-S-04(CustomScrollbar 레지스트리)와 UI-S-12(CustomCursor 휠 경로)는 리팩터 표면이 넓고 ARCH-A-01 과 겹쳐 05 로 이월한다                                                                                                                                                                                                                                                                                                                                                                                                          |
| D17  | 접근성 E2E 를 공개 라우트 20개 + `mobile` 프로젝트로 넓힌다                                                                                             | 이 게이트가 있어야 03 의 수정이 회귀 신호를 갖는다. 특히 UI-S-06 은 모바일에서만 렌더되는 요소라 desktop 전용 스캔으로는 영원히 안 잡힌다                                                                                                                                                                                                                                                                                                                                                                                          |
| D18  | 404 는 공용 뷰 추출 + `[lang]/not-found.tsx` + `[lang]/[...rest]` catch-all 세 벌이다                                                                   | 앞의 둘만으로는 `/en/bogus` 가 루트 404 로 간다(§404 라우팅)                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D19  | UI-P-03 의 실제 해소는 **지도의 모바일 브레이크포인트를 760px → 767px 로 올리는 것**이다. 헤더 높이 토큰 신설은 같은 커밋에 묶되 단독으로는 넣지 않는다 | 브레이크포인트가 셋 다 다르다. 탭바는 `MobileTabBar.module.css:28` 의 `min-width:768px` 에서 사라지고, 헤더는 `(public)/layout.module.css:7` 의 `min-width:768px` 에서 76px 이 되며, 지도는 `MapView.module.css:21` 의 `max-width:760px` 에서만 탭바를 뺀다. 761~767px 에서 base 규칙의 `76px` 이 **우연히 18px 완충** 역할을 한다. 헤더 높이를 정확한 58px 로만 바꾸면 잘림이 44px+safe 에서 62px+safe 로 **늘어난다**. 브레이크포인트를 767px 로 맞추면 그 구간이 모바일 분기로 들어가 `- 58px - 탭바 - safe` 를 정상적으로 뺀다 |
| D19b | 토큰 치환은 **`58px`·`76px` 리터럴만** 바꾸고 `- var(--mobile-tab-bar-height) - env(safe-area-inset-bottom, 0px)` 항은 보존한다                         | 모바일 분기는 헤더 높이 하나만 빼는 식이 아니다. "`calc(100dvh - var(--public-header-height))` 로 바꾼다"를 글자대로 적용하면 탭바·safe-area 항이 사라진다                                                                                                                                                                                                                                                                                                                                                                         |
| D20b | `--accent-music` 참조는 현재 색을 보존하는 전용 시맨틱 토큰으로 옮긴다                                                                                  | `--danger` 는 라이트 `#ff2d55` 라 현재 `#b4232d` 에서 눈에 띄게 밝아진다. D6 과 같은 원칙으로 색을 보존하면서 섹션 액센트 결합만 끊는다                                                                                                                                                                                                                                                                                                                                                                                            |
| D20  | `PageToolbar` 의 `role="status"` 는 prop 게이트로 넣는다                                                                                                | 공용 컴포넌트라 무조건 달면 두 소비처(`GalleryView.tsx:68`, `ArticlesView.tsx:115`)가 최초 렌더에서도 낭독된다. 선례 `OnDemandDevProjectDetail.tsx:23` 도 `role={label ? "status" : undefined}` 로 조건부다                                                                                                                                                                                                                                                                                                                        |

## 실행 규약

커밋 하나를 단위로 진행한다.

1. 한 커밋 분량의 수정을 끝낸다.
2. 아래 네 게이트를 돌린다.

   ```bash
   npm run check && npm run lint && npm run test:coverage && npm run deps:check
   ```

3. 실패하면 원인을 찾아 고치고 다시 돌린다. 테스트가 낡은 계약을 고정하고 있으면 테스트를
   함께 고친다. 계획 자체의 전제가 틀린 것으로 드러나면 계획을 고치고 그 사실을 기록한다.
4. 네 게이트를 모두 통과하면 `[TYPE] 한글 제목` 규약으로 커밋한다
   ([git-commit-convention](../../../.claude/skills/git-commit-convention/SKILL.md)).
   브랜치는 `refactor/code-review-2` 를 이어 쓴다.
5. 다음 커밋으로 넘어간다.

시각 변화가 있는 커밋(C2·C3·C5·C6·C9·C11·C13·C14)은 그 커밋 안에서 `npm run test:visual` 을
돌려 스냅샷을 갱신하고 갱신분을 같은 커밋에 담는다. C19 뒤에는 `npm run test:e2e` 도 함께 돌린다.

## 커밋 계획

브랜치는 `refactor/code-review-2` 를 이어 쓴다. 커밋마다 `npm run check`·`lint`·`test:coverage`·
`deps:check` 네 게이트를 통과시킨 뒤 다음으로 넘어간다.

### 착수 전 계측 (커밋 아님)

`accessibility.e2e.ts` 의 라우트를 20개로 넓히고 `:27` 의 `test.skip` 을 걷어낸 상태로 로컬에서
한 번 돌려 실제 axe 위반 목록을 확보한다. 이 목록이 C4~C12 의 실제 범위를 확정한다. 스펙 자체는
C19 에서 커밋한다.

### C1 · `[DOCS] 공개 화면 검토 항목 실행 계획 추가`

`docs/review/2026-08-26/03-plan.md` 와 README 표의 행 추가.

### Phase 1 — 토큰·전역 층

한 곳을 고치면 전 화면에 퍼지는 층이라 먼저 세운다.

**C2 · `[FIX] 정의되지 않은 CSS 토큰 참조 제거`** (UI-P-01, UI-P-19)

- `ExifPanel.module.css:40` 의 hover 글자색은 `var(--text)`, `:45` 의 포커스 링은 `var(--accent)`
  로 나눈다(정정 8). 링 쪽 선례가 `Modal.module.css:87`·`AlbumCard.module.css:44` 다.
- `--s-0` 세 곳은 현재 전부 `0` 으로 계산되므로 고치면 세 지면이 동시에 움직인다.
  `SearchResults.module.css:40`·`SiteFooter.module.css:34` 는 0 이 의도와 일치하므로 선언을
  지운다. `AnalyticsConsentBanner.module.css:12` 는 `var(--s-3)` 을 넣고 배너를 열어 확인한다.

**C3 · `[FEAT] 공개 페이지 focus 소유권 규칙 신설`** (UI-P-07, UI-P-30, UI-S-25, UI-P-08)

- `globals.css` 에 `:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible`
  폴백. 특이도 0 이라 기존 개별 규칙을 이기지 않는다.
- 사진 위 글래스 크롬(`PhotoModal .nav`, `ImageLightbox .close/.nav`)만 반전 색 링으로 덮는다.
- 유출된 관리자 패턴 두 곳을 정정한다. `ContactView.module.css:110-114` 의
  `.input:focus, .textarea:focus { outline: none }` 과 `SearchBox.module.css:27` 의
  `.input { outline: none }` 이 대상이다. `SearchBox` 의 가시 표시는 `:14` 의
  `.box:focus-within{border-color}` 이므로, 테두리 어포던스는 유지하되 링이 `:focus-visible`
  에서 살아나게 한다. `docs/admin-ui-conventions.md:88` 이 공개 페이지 적용을 금지한 패턴이다.
- `PhotoTile.module.css` 에 `.tile:focus-visible .ov{opacity:1}` 추가 (D10).
- `docs/admin-ui-conventions.md` 에 "공개 페이지 focus 규칙" 절을 신설한다.

**C4 · `[FEAT] 화면 낭독기 전용 유틸과 본문 건너뛰기 링크`** (UI-P-23, UI-S-03)

- `globals.css` Primitives 에 `.sr-only` 신설. 저장소 유일 구현인 `ChatPanel.module.css:538` 의
  로컬 클래스를 이 프리미티브로 교체한다.
- `(public)/layout.tsx` 첫 자식으로 스킵 링크. 타깃 `#page-content` 는 `:57` 에 이미 있다.
- 사전 키 `skipToContent` 추가.

**C5 · `[FIX] 텍스트 대비와 현재 위치 표시`** (UI-S-06, UI-A-14, UI-S-05)

- `--text-4` 를 라이트 `#8a8a93` / 다크 `#6f6f78` 으로 올리고, globals 주석에 "아이콘·구분선·
  disabled 전용. 본문 텍스트에 쓰지 않는다"를 명시한다.
- 공개 트리의 `var(--text-4)` 참조는 **16파일 17줄**이다(관리자 15파일 18줄, globals 정의 2줄,
  합계 37줄). 전수 점검해 본문 텍스트면 `--text-3` 으로 올린다. 공개 대상:
  `MobileTabBar`·`MobileMenu`·`SearchResults`·`PhotoModal`·`OnDemandPhotoModal`·`ExifPanel`·
  `MusicWorksView`(2줄)·`MusicCareerView`·`LocationList`·`LandingView`·`ArticlePagination`·
  `ArticleNavigationTable`·`DevCareerView`·`ChatPanel`·`ExifStrip`·`app/status.module.css`.
  관리자 15파일은 04 문서 소관으로 남긴다.
- `MobileTabBar.tsx:39-46` 활성 링크에 `aria-current="page"`, `DesktopMegaMenu` 현재 섹션 버튼과
  `SiteFooter.tsx:75,81` 사이트맵에도 같은 속성. 시각 인디케이터는 넣지 않는다(D11).

**C6 · `[REFACTOR] 스크림과 섹션 액센트 토큰 정리`** (UI-P-18, UI-P-20)

- `--scrim`(기본) / `--scrim-strong`(사진 상세) / `--scrim-stage`(라이트박스)를 라이트·다크 짝으로
  정의하고 현재 농도 위계(0.5 < 0.66 < 0.82)를 보존한다. `Modal`·`PhotoModal`·
  `OnDemandPhotoModal`·`ImageLightbox` 네 파일의 직접 rgba 를 교체한다.
- 사진 위 글래스 크롬의 `rgba(0,0,0,.35)`·`rgba(255,255,255,.2)` 중복 4파일도 같은 커밋에서
  토큰화한다.
- `DevProjectsView.module.css:197-203` 의 `--accent-music` 결합을 끊는다. `--danger` 로 바꾸면
  라이트가 `#b4232d`(짙은 크림슨)에서 `#ff2d55`(밝은 핑크레드)로 **눈에 띄게 바뀌므로** 채택하지
  않는다. `--trouble-accent` 를 라이트 `#b4232d` / 다크 `#ff5b60` 으로 신설한다(D20b).
  색을 보존하려면 **세 가지를 함께** 옮겨야 한다. `:199` 의 `color` 는 다크 오버라이드가 없어
  지금 `--accent-music` 의 다크 값 `#ff5b60` 을 그대로 받으므로 새 토큰도 라이트·다크 짝이어야
  하고, 배경은 `:198` 의 11% 와 `:202` 의 16% 분기를 유지해야 한다. 라이트 값 하나만 박으면
  다크 화면이 어두워진다.
- `:196` 주석이 "문제=음악 섹션 레드, 결과=현재 섹션 액센트"라고 **결합을 의도라고 적어 두었다.**
  D20b 가 그 결합을 끊으므로 주석도 같은 커밋에서 고친다. 색은 그대로이되 근거를 "섹션 액센트가
  아니라 고정 대비 톤"으로 바꾼다.

### Phase 2 — 키보드와 포커스

**C7 · `[REFACTOR] Escape 처리를 공용 훅으로 통합`** (ARCH-A-08 당겨옴)

`src/hooks/use-escape-key.ts` 에 `useEscapeKey(active, onEscape, opts?)` 를 두고 내부에서
`use-overlay-layer.ts` 의 top-layer 판정과 `stopImmediatePropagation()` 을 강제한다. 13곳을 교체한다.
`FilterBar.tsx:57`·`MobileMenu.tsx:68`·`DesktopMegaMenu.tsx:119`·`Select.tsx:53` 네 곳이
top-layer 조정에 참여하게 되는 것이 유일한 동작 변경이다.

**C8 · `[FIX] 팝업 3종의 ARIA 규약과 키보드 조작`** (UI-P-09, UI-S-07, UI-S-08)

`src/hooks/use-popup-disclosure.ts` (open 상태·바깥 pointerdown·`useEscapeKey`·트리거 포커스
복귀)와 `src/hooks/use-roving-list-focus.ts` (↑↓·Home·End)를 신설한다.

- `Select.tsx` — 중간 `li`(`:87`)를 걷어내 `ul[role=listbox] > button[role=option]` 로.
  `useId()` 로 스크롤 컨테이너 id 를 만들어 `aria-controls` 에 연결한다. 하드코딩 상수
  `"filter-select-scroll-container"`(`:79`)는 `CustomScrollbar.tsx:155` 가 `scroller.id` 를
  IDREF 로 쓰므로 한 화면에 Select 가 둘 이상이면 그쪽도 함께 깨진다. roving 과 Escape 복귀 적용.
- `LangMenu.tsx` — `role="menu"` 규약 완전 준수(열 때 첫 항목 포커스, 방향키·Home·End,
  Escape·선택 후 트리거 복귀). backdrop `<button>`(`:65-71`)을 `<div aria-hidden="true">` 로.
- `DesktopMegaMenu.tsx` — Disclosure Navigation 패턴(D3). 그룹 버튼에 `aria-haspopup="true"` 와
  `useId()` 기반 `aria-controls`, 패널에 그 id. `onFocus` 자동 열림(`:49`) 제거(D4). Escape
  게이트를 `pinned` 에서 `shown` 으로 바꾸고 닫을 때 해당 그룹 버튼으로 포커스를 되돌린다.

**C9 · `[FIX] 오버레이의 포커스 이관과 스크림 시맨틱`** (UI-P-11, UI-S-13, UI-P-13, UI-P-22)

- 전면 스크림 `<button>` 4곳(`PhotoModal.tsx:389-394`, `ImageLightbox.tsx:287-293`,
  `LangMenu.tsx:65-71`, `MobileMenu.tsx:209-214`)을 `<div aria-hidden="true">` 로 통일한다.
  올바른 형태가 `OnDemandPhotoModal.tsx:114` 에 이미 있다. `Modal` 은 이미 정상이라 대상 아님.
  네 곳의 사정이 같지는 않다. `LangMenu` 의 backdrop 은 이미 `aria-hidden="true"` + `tabIndex={-1}`
  이라 탭 스톱이 아니고, 바꾸는 이유는 "button 에 `aria-hidden` 을 거는 형태"를 없애는 것이다.
  `MobileMenu` 의 스크림은 `aria-label={dict.menuCloseLabel}` 을 가진 **유일한 닫기 어포던스**라
  대체 버튼이 필수다(아래 항목).
- `MobileMenu.tsx` — 언어·테마 토글을 시트 패널(`:138-143`) 안으로 옮기고 헤더에서는 숨긴다.
  스크림 버튼을 `div` 로 바꾸므로 패널 안에 명시적 닫기 버튼을 함께 넣는다.
  `SiteHeader.module.css:153-159` 의 배경 투명 규칙도 이에 맞춘다.
- `YouTubeFacade.tsx` — `playing` 이 참이 될 때 iframe 또는 `tabIndex={-1}` 을 준 `.frame` 으로
  포커스를 옮기는 `useEffect` 추가.
- `OnDemandPhotoModal.tsx:136` 스피너를 `aria-hidden="true"` 로. `PhotoModal.tsx:470`·
  `ImageLightbox.tsx:98` 이 이미 그 형태다.

**C10 · `[FIX] 커스텀 스크롤바를 탭 순서에서 제외`** (UI-S-10)

`CustomScrollbar.tsx:153` 을 `tabIndex = -1` 고정, `:154` 를 `aria-hidden="true"` 고정으로(D15).
`ArticleTocList` 에 id 를 부여해 유일하게 남은 빈 IDREF 를 없앤다.

### Phase 3 — 구조와 상태

**C11 · `[FIX] 구획 라벨을 헤딩으로 승격`** (UI-P-16, UI-P-02)

- 공개 뷰의 구획 라벨을 전수 점검해 `<h2>`·`<h3>` 로 바꾸고 시각 스타일은 기존 클래스로 유지한다.
  `<section>` 에는 `aria-labelledby` 로 그 헤딩을 건다. 대상: `DevProjectDetail.tsx`(7),
  `OnDemandDevProjectDetail.tsx:44,53`, `DevCareerView.tsx:69`, `MusicCareerView.tsx:53`,
  `DevStackSection.tsx:37`, `SearchResults.tsx:47`. `FilterBar.tsx:96,109` 는 폼 그룹 라벨이라
  헤딩이 아니므로 제외한다.
- `MapView.tsx` 의 반환은 Fragment(`:63`) 안에 `.view` div(`:64`)와 `<MapPhotoModal>`(`:74`)
  둘이다. **`<main>` 으로 바꿀 대상은 `.view` div 하나**이며 `MapPhotoModal` 은 그 밖에 남는다.
  `.view` 첫 자식으로 sr-only `<h1>` 을 두고(D9), `LocationList.tsx:74` 의 위치 라벨은 `<h2>` 로
  올린다. `<aside>` 가 `<main>` 안에 들어가는 형태이며 HTML 상 허용된다.
  `photo/map/loading.tsx` 셸도 같이 맞춘다.

**C12 · `[FIX] 보조기술에 상태 변화를 전달`** (UI-P-15, UI-S-15, UI-S-09, UI-P-12, UI-P-25)

- `PageToolbar.tsx` 에 `countLive?: boolean` 같은 prop 게이트를 두고 `:32` 의 count `<span>` 에
  조건부 `role="status"` 를 건다(D20). `/photo` 만 켜고 `/dev/articles` 는 판단해 정한다.
  `src/components/PhotoGrid.tsx:106-118` 의 빈 상태(`photos.length === 0` 분기의 `<m.p>`)에도
  같은 처리.
- `AnalyticsConsentBanner.tsx:52-56` — 최초 노출은 sr-only `aria-live="polite"` 한 줄로 알리고
  포커스를 훔치지 않는다. 푸터 재오픈 경로에서만 배너로 포커스를 옮기고 닫을 때 트리거로 되돌린다.
- `ThemeToggleButton.tsx` — `toggleTheme` 안에서 `aria-pressed` 를 DOM 으로 직접 갱신한다.
  상태의 단일 출처를 `html[data-theme]` 에 둔 현 설계와 첫 페인트 정확성을 깨지 않는다.
- `PhotoModal.module.css` 에 `.nav:disabled{opacity:.3;cursor:default}`.
  `ImageLightbox.module.css:131-134` 와 같은 형태.
- `use-query-modal.ts` — 매칭되는 항목이 없으면 쿼리를 정리해 URL 을 정상화한다.
  `?work=`·`?award=`·`?project=` 세 종류가 대상이다. **02 의 BUG-C-06 뒤에 진행한다.**

### Phase 4 — 반응형과 자산

**C13 · `[FIX] 반응형 경계 정합`** (UI-S-02, UI-P-03, UI-P-21, UI-P-05, UI-P-10)

- `globals.css:227` 블록에서 스크롤바 숨김 규칙(`:241-250`)을 별도 미디어 쿼리로 분리하고
  `CustomScrollbar.module.css:109` 와 문자 그대로 같은 조건을 쓴다. `ENABLE_QUERY`(`:11-12`)에도
  같은 폭 조건을 넣어 `html[data-custom-scrollbar]`(`globals.css:292`)가 그 밴드에서 붙지 않게 한다.
  커서 규칙은 원래 블록에 남긴다(정정 4).
- 지도 밴드(UI-P-03)는 **두 변경을 한 커밋에 묶는다**(D19). 하나만 넣으면 회귀다.
  1. `MapView.module.css:21` 과 `photo/map/loading.module.css:37` 의 `@media (max-width: 760px)` 를
     `767px` 로 올려 탭바 브레이크포인트(`MobileTabBar.module.css:28` 의 `min-width:768px`)와
     정렬한다. **이것이 761~767px 밴드를 실제로 해소하는 변경이다.**
  2. `(public)/layout.module.css` 에 `--public-header-height`(58px / 768px 이상 76px)를 신설하고
     `--public-content-height` 를 그것으로 파생시킨다. 그다음 아래 **6곳의 `58px`·`76px` 리터럴만**
     `var(--public-header-height)` 로 바꾸고 나머지 항은 그대로 둔다(D19b).
     `MapView.module.css:6`(76px), `:25`(58px + 탭바 + safe),
     `photo/map/loading.module.css:5`(height 76px), `:6`(max-height 76px),
     `:41`(height, 58px + 탭바 + safe), `:42-44`(max-height, 같은 식).
     `:35` 의 `background: var(--map-land)` 는 높이 규칙이 아니라 대상이 아니다.
     `--mobile-tab-bar-height` 는 이미 토큰이라 손대지 않는다.
     base 규칙이 이기는 구간은 브레이크포인트 정렬 뒤 768px 이상뿐이고 그때 토큰이 76px 이므로
     치환이 안전해진다. 순서를 뒤집으면 잘림이 44px+safe 에서 62px+safe 로 늘어난다.
- `vh` → `dvh`: `PhotoModal.module.css:186,191`, `OnDemandPhotoModal.module.css:116`,
  `ImageLightbox.module.css:58`, `ImageLightbox.tsx:72` 의 인라인 계산.
- `src/components/PhotoGrid.tsx:41` 의 `useState(4)` 를 `useSyncExternalStore` + `matchMedia` 로.
  같은 패턴이 `PhotoModal.tsx:68-74,121` 에 있다. (이 파일은 `features/gallery` 가 아니라
  `components/` 에 있다.)
- `AlbumsSkeleton.module.css:20,26` 의 gap·padding 을 `AlbumsView.module.css:22`·
  `AlbumCard.module.css:36` 실측에 맞추고 `1px solid var(--line)` 테두리를 더한다.

**C14 · `[FIX] 이미지 폴백 통일과 보호 범위 축소`** (UI-P-29, UI-P-17, UI-S-23)

- `components/ImageFallback.tsx` 신설. 토큰(`--surface-2`·`--text-4`)을 쓰는 인라인 SVG 라
  네트워크 요청이 0회이고 `[data-theme]` 수동 토글에도 정확하다(D12).
- 적용은 **3곳 전부**다(정정 3): `DevProjectCard.tsx:56,65`, `ArticleCard.tsx:94,103`,
  `ArticleBody.tsx:49-50` + `:226-240`. 짝 CSS 3벌(`DevProjectsView.module.css:60-66`,
  `ArticleCard.module.css:38-44`, `ArticleBody.module.css:121-127`)의
  `.fallbackLight`/`.fallbackDark` 도 함께 제거한다.
- 세 곳을 모두 교체한 뒤에야 `src/app/dev-project-image/` 와 `dev-project-image-dark/` 라우트를
  제거한다. 두 라우트의 하드코딩 `#16a34a` 도 함께 사라진다. `opengraph-image.tsx` 는
  `createSiteImage` 기본값을 쓰므로 영향이 없다.
- `MusicWorksView.tsx:76,116` 의 리터럴 `"POSTER"` 도 같은 컴포넌트로 대체한다.
- `use-image-protection.ts:15-20` 의 이벤트 필터를 `[data-protected-image] img` 로 좁히고
  `globals.css:280` 의 `user-select:none` 도 같은 범위로 좁힌다(D14). 래퍼 3곳
  (`PhotoTile.tsx:47`, `DetailHero.tsx:56`, `MusicWorksView.tsx:64`)의 JSX 는 건드리지 않는다.

### Phase 5 — 문구와 라우팅

**C15 · `[FIX] 로케일 404 와 접근 이름`** (UI-S-14, UI-P-26, UI-P-06)

- `features/status/_components/NotFoundView` 로 마크업을 빼고 **셋을 함께** 넣는다(D18):
  `app/[lang]/not-found.tsx`, `app/[lang]/[...rest]/page.tsx`(`notFound()` 호출만),
  그리고 루트 `app/not-found.tsx` 는 로케일 없는 URL 폴백으로 남긴다.
  `[legalDoc]` 과의 관계는 §404 라우팅 그대로이며 그 요지를 catch-all 파일 주석에 적는다.
- `app/error.tsx` 도 같은 결함이다. `:32` 가 스토어 모드 `useLang()` 을 읽고 `status.module.css`
  를 404 와 공유한다(`app/status.module.css:1` 주석이 "에러·404 공유 스타일"). 공용 마크업을
  `features/status/_components/StatusView` 로 빼고 `app/[lang]/error.tsx` 를 함께 넣는다.
  바운더리별 로직(`reset` prop, `:36` 의 `captureExceptionIfLoaded`)은 각 파일에 남긴다.
  `error.tsx:22` 의 JSDoc "루트 레이아웃 하위(LangProvider 안)라 useLang으로 ko/en 대응"은 이
  변경으로 거짓이 되므로 같은 커밋에서 정정한다.
- `app/global-error.tsx` 는 **범위 밖으로 판정한다.** `:15` JSDoc 이 "LangProvider·globals.css·
  폰트·테마에 접근할 수 없다 → i18n·토큰 불가라 영어 고정"이라고 구조적 제약을 이미 적어 두었고,
  루트 레이아웃을 대체하는 바운더리라 로케일 세그먼트 안에 둘 수 없다. 다만 그 파일 안의 기존
  불일치 하나는 같은 커밋에서 고친다. `:15` 는 "영어 고정"인데 `:31` 이 `<html lang="ko">` 다.
  03 의 어떤 ID 도 잡지 않은 항목이라 03-plan 에는 "인접 수정"으로 표시한다.
- `RangeSlider.tsx:106,116` 이 `minLabel`·`maxLabel` props 를 받고 `FilterBar.tsx:110-119` 가
  사전 문구와 조합해 넘긴다. 각 input 에 `aria-valuetext` 를 붙여 단위까지 읽히게 한다.
- 결과 수는 영어 표기를 유지하되(D8) 단수/복수 헬퍼를 두고 5곳을 교체한다:
  `GalleryView.tsx:68`, `ArticlesView.tsx:115`, `AlbumCard.tsx:56`, `AlbumDetailView.tsx:58`,
  `LocationList.tsx:75`. `PageToolbar.tsx:18-19` 의 JSDoc 은 그대로 유효하다.

### Phase 6 — 모션과 정리

**C16 · `[FIX] 랜딩 초기 가시성과 모션 최소화 존중`** (UI-P-24, UI-S-26, UI-S-16)

- `theme-script.ts` 가 `html` 에 `data-js` 를 붙이고, `LandingView.module.css:209` 의
  `.row{opacity:0}` 과 `RevealWords.module.css:12` 의 `.word{opacity:0}` 을 `html[data-js]`
  하위로 게이트한다(D13). `.row` 는 `:201` 에서 시작하고 `:212-216` 이 `transition` 목록이다.
  보고서가 적은 `:213` 은 그 `transition` 안의 `background 0.2s` 줄이라 옮기면 선언이 깨진다.
  `theme-script.test.ts` 에 계약을 고정한다.
- `use-overlay-drag.ts` 의 `resetSurface`(`:102-118`)와 dismiss 경로(`:305`, `:311`)에도
  `prefersReducedMotion()` 확인을 넣는다. 닫기에서 애니메이션을 생략하면 `DISMISS_DELAY`
  타이머도 함께 줄인다.
- `use-typing.ts` 가 대상 ref 를 받아 `IntersectionObserver` 로 화면 밖일 때 멈춘다.

**C17 · `[CHORE] 죽은 선언과 효과 없는 힌트 제거`** (UI-P-28, UI-S-22, UI-S-17)

- `LandingView.module.css:83-90` 의 `@keyframes glowDrift`, 그 주석, `.glow` 의
  `will-change: transform`, `:285` 의 `animation:none` 을 함께 지운다.
- `SiteHeader.module.css` 에서 지울 대상은 **`:184` 한 줄**이다. `:183-184` 는 2-셀렉터 규칙인데
  `:183` 의 `.header [data-mobile-menu-trigger]` 는 헤더 안에 실재해 살아 있고, `:184` 의
  `.header [data-mobile-menu-layer]` 만 도달 불가다. `MobileMenu.tsx:134` 가 `document.body` 로
  포털하기 때문이다. `:176-179` 의 `:not()` 규칙은 별개이고 정상 동작하므로 그대로 둔다
  (07-rejected §1.2 6번과 같은 판정).
- `SiteFooter.module.css:125,131` 의 `.copyright` 중복 `padding` 을 하나로 합친다.
- `CustomCursor.module.css:43` 의 `will-change: width, height` 제거. 컴포지터 승격은 `transform`
  과 `opacity` 에만 적용된다. `.cursor` 의 `will-change: transform`(`:21`)은 유지한다.

**C18 · `[FIX] 렌더·제스처 경로의 불필요한 읽기 제거`** (UI-S-18, UI-S-24, UI-S-19)

- `use-image-zoom.ts:123-124,154` — 제스처 시작 시점에 치수를 한 번 재서 ref 에 캐시하고 이동
  중에는 캐시만 쓴다. `resize` 와 `resetKey` 변경 시 무효화한다.
- `analytics-consent.ts:140-157` — `:147` 이 호출마다 `localStorage.getItem` 을 하고 `:148` 의
  `cachedRaw` 비교는 그 읽기 뒤라 읽기를 줄이지 못한다. 첫 읽기 결과를 캐시하고 무효화는
  `subscribeAnalyticsConsent` 의 이벤트에만 맡긴다. 그 함수는 이미 `:176` 에서 `cachedRaw` 를
  비운다. 02 의 BUG-C-16 이 같은 파일을 만졌으므로 착수 시 현재 코드를 다시 읽는다.
- `use-search-suggestions.ts:36-40` 에 언마운트 가드. 선례가 `use-ordered-admin.ts:50-66` 에 있다.
  `SearchBox.tsx:83` 의 `aria-controls` 를 `showList` 일 때만 붙인다.

### Phase 7 — 게이트와 문서

**C19 · `[TEST] 접근성 E2E 를 공개 라우트 전체와 모바일로 확장`** (D17)

`accessibility.e2e.ts:4-18` 의 `ACCESSIBILITY_ROUTES` 를 13개에서 20개로 채우고 `:27` 의
`test.skip(testInfo.project.name !== "desktop")` 을 걷어낸다. 테스트가 **26개에서 80개**로 늘어난다
(13×2 → 20×2×2).

**C20 · `[DOCS] 섹션 액센트 값과 의도적 이탈 정정`**

- CLAUDE.md 상단 표의 사진·음악·개발 색을 실제 토큰 값으로 바꾼다. **세 토큰 모두 라이트·다크
  짝이므로 둘을 함께 적거나 "라이트 기준"을 명시한다.** 라이트는 `globals.css:68-70` 의
  `#0066cc`·`#b4232d`·`#087a32`, 다크는 `:146-148` 의 `#4da3ff`·`#ff5b60`·`#2ecc71` 이다.
  라이트만 적으면 `/design-check` 가 다크 화면을 대조할 때 같은 종류의 어긋남이 다시 생긴다.
  `/design-check` 가 이 표를 기준으로 구현을 대조하므로 지금 값을 믿고 "고치면" 실제 팔레트가
  망가진다.
- `design/README.md` 의도적 이탈 표에 11번(결과 수 영어 표기)을 등재한다.

**C21 · `[DOCS] 공개 화면 검토 항목 처리 결과 문서 추가`**

앞의 커밋을 전부 마친 뒤 `03-resolution.md` 를 쓰고 **단독 커밋**한다.
코드 커밋과 섞지 않는다.

형식은 [02-resolution.md](02-resolution.md) 를 그대로 따른다. 제목 줄에 브랜치·커밋 범위·
변경 규모, 그다음 항목별 처리 현황 표(항목 · 심각도 · 내용 · 처리), "리뷰와 달랐던 것",
"후속 필요", "검증" 순이다.

담을 내용은 넷이다.

- 판정표 48행의 **실제 처리 결과**. 계획의 판정과 달라진 것이 있으면 그쪽을 적고 왜 달랐는지 남긴다.
- **리뷰와 달랐던 것**. 이 계획이 이미 모아 둔 §"보고서에서 정정한 것" 8건에 더해, 실행 중에
  새로 드러난 것을 합친다. 특히 D19(브레이크포인트가 실해법이고 토큰만 넣으면 회귀)처럼 계획
  단계에서 뒤집힌 판단을 남긴다.
- **유지·이월 판정의 근거**. UI-P-08(터치 환경 메타 미노출), UI-S-05(색 외 구분 없음),
  UI-S-04·UI-S-12(프로파일링 선행), `global-error.tsx`(구조적 제약).
- **검증 결과 수치**. 테스트 통과 수, 커버리지 실측, axe 스캔 라우트·테마·뷰포트 조합 수.

문서를 쓸 때 `humanizer` 스킬을 적용한다. 저장소의 다른 검토 문서와 같은 결로 읽혀야 한다.
과장된 강조, 불릿 남발, "매우"·"중요한" 같은 빈 수식어, 기계적인 병렬 구조를 걷어낸다.
CLAUDE.md 의 주석 규칙(비유 금지, 대시로 문장 잇지 않기, 판단을 변호하지 않기)이 문서에도 그대로 간다.

마지막으로 [README.md](README.md) 의 문서 표에 `03-plan.md`·`03-resolution.md` 두 행을
더한다.

## 항목별 판정 (섹션 48개)

| 항목                               | 판정                                                        | 커밋     |
| ---------------------------------- | ----------------------------------------------------------- | -------- |
| UI-S-06 / UI-A-14 탭바 라벨 대비   | 수정                                                        | C5       |
| UI-P-02 `/photo/map` main·h1       | 수정                                                        | C11      |
| UI-P-08 타일 오버레이 hover 전용   | 부분 수정 (`:focus-visible` 만, D10)                        | C3       |
| UI-P-09 Select listbox 규약        | 수정                                                        | C8       |
| UI-S-07 / UI-S-08 팝업 포커스 상실 | 수정                                                        | C8       |
| UI-P-13 YouTube 재생 포커스        | 수정                                                        | C9       |
| UI-P-23 / UI-S-03 스킵 링크        | 수정                                                        | C4       |
| UI-S-10 스크롤바 탭 스톱           | 수정 (제거, D15)                                            | C10      |
| UI-S-05 `aria-current`             | 부분 수정 (속성만, D11)                                     | C5       |
| UI-S-13 시트 위 컨트롤             | 수정 (시트 안으로 이동)                                     | C9       |
| UI-P-11 스크림 button              | 수정 (4곳)                                                  | C9       |
| UI-P-07 / P-30 / S-25 focus 소유권 | 수정                                                        | C3       |
| UI-P-16 구획 헤딩                  | 수정 (전수)                                                 | C11      |
| UI-P-22 스피너 `aria-label`        | 수정                                                        | C9       |
| UI-S-23 이미지 보호 범위           | 수정                                                        | C14      |
| UI-S-21 focus trap fixed           | **02 에서 완료**                                            | —        |
| UI-P-01 `--text-1`                 | 수정 (두 줄을 나눠, 정정 8)                                 | C2       |
| UI-P-19 `--s-0`                    | 수정                                                        | C2       |
| UI-P-18 스크림 rgba                | 수정 (토큰 3종, D6)                                         | C6       |
| UI-P-20 개발 섹션의 음악 액센트    | 수정 (현재 색 보존 전용 토큰, D20b)                         | C6       |
| UI-P-28 `glowDrift`                | 수정 (삭제)                                                 | C17      |
| UI-S-22 죽은 셀렉터·중복 선언      | 수정                                                        | C17      |
| CLAUDE.md 액센트 색                | 수정                                                        | C20      |
| UI-S-02 900px 스크롤바 소실        | 수정 (블록 분리, 정정 4)                                    | C13      |
| UI-P-05 메이슨리 첫 페인트         | 수정                                                        | C13      |
| UI-P-03 761~767px 지도             | 수정 (브레이크포인트 767px 정렬 + 헤더 높이 토큰, D19·D19b) | C13      |
| UI-P-21 `vh` → `dvh`               | 수정                                                        | C13      |
| UI-P-10 앨범 스켈레톤              | 수정                                                        | C13      |
| UI-P-29 이중 폴백 이미지           | 수정 (3곳, 정정 3)                                          | C14      |
| UI-P-06 결과 수 문구               | 영어 유지 확정 + 단수 처리 (D8)                             | C15, C20 |
| UI-P-17 `"POSTER"`                 | 수정 (중립 폴백)                                            | C14      |
| UI-P-26 슬라이더 접근 이름         | 수정                                                        | C15      |
| UI-S-14 404·오류 화면 로케일       | 수정 (catch-all + `[lang]/error.tsx` 포함, D18)             | C15      |
| UI-P-12 nav disabled 표시          | 수정                                                        | C12      |
| UI-P-25 없는 id 딥링크             | 수정 (02 BUG-C-06 뒤)                                       | C12      |
| UI-P-15 결과 수 live region        | 수정 (prop 게이트, D20)                                     | C12      |
| UI-S-15 동의 배너 알림             | 수정                                                        | C12      |
| UI-S-09 테마 토글 상태             | 수정                                                        | C12      |
| UI-P-24 랜딩 초기 가시성           | 수정 (D13)                                                  | C16      |
| UI-S-19 검색 자동완성 가드         | 수정                                                        | C18      |
| UI-S-26 오버레이 드래그 모션       | 수정                                                        | C16      |
| UI-S-01 theme-script 로케일        | **02 에서 완료**                                            | —        |
| UI-S-04 CustomScrollbar 관찰 범위  | **05 로 이월** (D16)                                        | —        |
| UI-S-12 휠 `getComputedStyle`      | **05 로 이월** (D16, ARCH-A-01)                             | —        |
| UI-S-18 줌 레이아웃 읽기           | 수정                                                        | C18      |
| UI-S-16 `use-typing` 정지 조건     | 수정                                                        | C16      |
| UI-S-17 커서 `will-change`         | 수정                                                        | C17      |
| UI-S-24 동의 스냅샷 읽기           | 수정 (02 BUG-C-16 뒤)                                       | C18      |

수정 44 · 02 에서 완료 2 · 05 로 이월 2.

이월·부분 판정 4건은 해당 파일 주석에 근거를 남긴다. UI-P-08 은 터치 환경에서 메타가 보이지
않는 상태가 유지된다는 것, UI-S-05 는 색 외 시각 구분이 없어 1.4.1 지적이 남는다는 것,
UI-S-04·UI-S-12 는 프로파일링이 선행 조건이라는 것을 각각 적는다.

## 검증

각 커밋마다:

```bash
npm run check          # next typegen && tsc --noEmit
npm run lint
npm run test:coverage  # 임계값 85/80/85/85
npm run deps:check
```

계획 전체 완료 시점에:

```bash
npm run build
npm run test:e2e       # 확장된 accessibility.e2e.ts 포함, desktop + mobile
npm run test:visual    # C2·C3·C5·C6·C9·C11·C13·C14 가 시각 변화를 일으키므로 스냅샷 갱신 필요
```

눈으로 확인할 것 (자동 검사가 보증하지 않는 층):

1. 데스크톱 1440px 에서 Tab 을 눌러 첫 스톱이 스킵 링크인지, 그다음이 워드마크인지. mega-menu
   그룹 버튼에서 Tab 을 눌렀을 때 패널이 펼쳐지지 않고 다음 그룹으로 넘어가는지(D4).
2. 창을 720px 로 줄여 스크롤바가 네이티브든 커스텀이든 하나는 보이는지(UI-S-02).
3. 모바일 뷰포트에서 하단 탭바 라벨이 밝은 배경에서 읽히는지, 시트를 열었을 때 언어·테마
   토글에 Tab 으로 닿는지.
4. `--s-0` 세 곳이 전부 0 으로 계산되던 상태를 고치므로 동의 배너 간격, 검색 결과 상단 여백,
   푸터 태그라인 여백 셋을 함께 확인한다(UI-P-19).
5. `/ko` 를 JS 차단 상태로 열어 진입 링크 세 행과 리드 문장이 보이는지(UI-P-24).
6. `/en/bogus` 와 `/en/a/b` 가 영어 404 를 보이고 홈 링크가 `/en` 으로 가는지. `/bogus` 는
   루트 404 로 남는지(UI-S-14, D18).
7. 사진 상세 공유 버튼의 hover 글자색이 파랑이 아니라 진한 잉크색인지, 포커스 링은 액센트인지
   (UI-P-01, 정정 8).
8. 사진 상세에서 제목과 EXIF 텍스트가 드래그 선택·복사되는지, 이미지 우클릭은 여전히 막히는지
   (UI-S-23).
9. 라이트박스·사진 상세·기본 모달을 겹쳐 열어 스크림 농도 위계가 유지되는지(UI-P-18).
10. `/ko/photo` 와 `/ko/dev/articles` 목록 카드에서 커버 없는 항목이 새 폴백으로 그려지는지
    (UI-P-29 — 라우트 제거 전후로 확인).
11. 창을 **764px** 로 맞춰 `/ko/photo/map` 을 열고 지도 하단이 탭바에 가리지 않는지, 세로 스크롤이
    생기지 않는지(UI-P-03). 760px·767px·768px 세 경계도 함께 본다. 로딩 셸도 같은 폭에서 확인한다.
12. `/ko/dev/projects` 트러블슈팅 카드의 "문제" 라벨 색이 지금과 같은지(UI-P-20, D20b).
