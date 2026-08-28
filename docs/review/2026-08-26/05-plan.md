# 구조·중복·경계 — 실행 계획

[05-architecture.md](05-architecture.md) 의 항목 전부에 판정을 붙인 실행 계획이다.
형식은 [04-plan.md](04-plan.md) 를 따르고, 처리 결과는 작업 완료 후 `05-resolution.md` 에 적는다.

**세는 단위**: 05 문서는 항목 ID 34개다. 아래 판정표는 그 34개 기준이며, 06 문서에서 흡수한
2개(CONV-02·CONV-03)와 03 문서에서 이월된 2개(UI-S-04·UI-S-12)를 더한다.

이 계획은 두 가지를 함께 다룬다.

1. **05 문서의 남은 항목.** 코드로 재대조한 결과 34개 중 **8개가 이미 해소됐고 4개는
   04-plan 이 흡수**했다. 남은 것만 다룬다.
2. **05 문서 이후 38커밋이 새로 만든 마찰.** 리뷰가 커밋된 `4c32af3` 이후 01·02·03·04
   작업이 들어갔고, 그 리팩터들이 절반에서 멈춘 자리에 새 중복과 타입 없는 계약을 남겼다.
   전부 파일을 읽고 센 값이며 아래 NEW·POST·SEC 항목으로 적는다. **그중 둘은 구조 문제가
   아니라 관측 가능한 결함이다** — 블로그 편집 중 셸 이탈 가드가 돌지 않고(POST-01),
   이미지 없이 사진을 저장하면 화면이 무반응이다(POST-04).

`README.md` 작업 순서의 5~7단계에 해당한다. **착수는 04-plan 완주 후**이며 브랜치는
`refactor/code-review-2` 를 이어 쓴다.

---

## 착수 전 재대조 — 05 문서와 현재 코드의 차이

### 이미 해소된 항목 (작업 불필요)

| 항목                             | 어디서                   | 확인한 사실                                                                                                                                                         |
| -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-D-01·D-02·D-07 디코더 2~3벌 | 02 (`c9f1997`)           | `lib/supabase/decode/field.ts` 필드 리더 + 컬렉션 디코더 한 벌. `TableCollectionId` 로 `Partial` 제거, `?? "리터럴"` 7곳·throw 2곳 소멸. `sortRpc` 는 서술자로 흡수 |
| ARCH-D-09 캐시 태그              | 02 (BUG-S-15)            | 제안과 **반대 방향으로** 해소. `documentCacheTag` 를 site 전용으로 좁히는 대신 `list-crud.ts:66` 이 전 쓰기에서 컬렉션·문서 태그를 함께 무효화한다                  |
| ARCH-D-13 포트 검사              | 02 (BUG-S-12)            | 코드와 양쪽 주석 모두 정정                                                                                                                                          |
| ARCH-A-08 Escape 13곳            | 03 (`dadbf8d`)           | `use-escape-key.ts` 신설, 7곳 이관. 남은 6곳은 각각 파일에 근거 기록                                                                                                |
| ARCH-A-26 법적 문서 라우트       | 02 (`c97f2de`)           | `[legalDoc]` 통합 + 무-로케일 308                                                                                                                                   |
| ARCH-D-10 의 `src/**` 부분       | 01 (`ced6c4e`·`f3bee30`) | 남은 Firebase 언급 **12줄 / 3파일**이 전부 정당(레거시 Storage URL 마이그레이션 지원, 태그 이름 예시)                                                               |

### 04-plan 이 흡수한 항목

ARCH-A-03 · ARCH-A-19 · ARCH-A-18 · ARCH-A-11. 04 의 C2·C3·C5·C12·C13·C21 이 처리한다.

### 근거가 사라진 항목 — 유지 판정

**ARCH-A-04 (`useLang` 서버 컴포넌트화).** 05 문서가 원 보고서의 87% 를 반증하고 "착수 전
번들 절감 근거를 다시 세워야 한다" 고 적었다. 실측: `useLang` 소비 **49파일**(비테스트) 중
다른 훅도 이벤트 핸들러도 없는 파일이 **7개**이고, 그중 `LocalizedLink`(링크 프리미티브)·
`app/not-found.tsx`·`app/[lang]/not-found.tsx`·`app/[lang]/layout.tsx` 는 다른 이유로
클라이언트여야 하며 `AlbumDetailView` 는 `motion` + `PhotoModal` 때문에 클라이언트다.
**실제 후보는 `DevStackSection`·`ExifPanel` 둘이다.** 문서가 스스로 정한 규칙("그 값이 작으면
이 항목은 하지 않는 게 맞다")에 따라 유지한다.

**ARCH-A-22 (`dictionary.ts` 640줄 분할).** 문서가 "A-04 의 번들 근거가 다시 서기 전에는
착수하지 않는다" 고 조건을 걸었고 그 전제가 지금 없다. 통합 검증관도 유지 쪽이었다.

### 「이론적 개선」 6건 — 전부 유지 판정

ARCH-D-05 · D-08 · D-15 · D-17 · A-25 · A-27. 여섯 모두 문서가 착수 가정("콘텐츠 종류를
추가하면", "새 호출자가 생기면")을 스스로 적었고 그 가정이 지금 없다. `05-resolution.md` 에
근거와 함께 남긴다.

### 06 문서에서 흡수하는 항목

**CONV-03**(ESLint boundaries 가 `src/lib`·`src/mocks` 미감시)은 ARCH-A-20 과 같은 발견이고,
**CONV-02**(`_types/` 폴더 2개 — `gallery`·`map`)는 폴더 배치 커밋과 같은 성격이다. 둘 다
같은 파일을 두 번 열지 않도록 05 가 받는다. 06-plan 에는 주석 규칙과 테스트 범위만 남는다.

---

## 보고서에서 정정한 것

| #   | 보고서 서술                                                           | 확인한 사실                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | ARCH-D-03 의 셋째 지점 — `getDevProject` 의 mock 폴백이 계약을 가른다 | **기각.** `MOCK_DEV_PROJECT_DETAILS` 는 `mocks/dev.ts:376` 이 "수상 모달 딥링크에서만 조회하며 공개 목록에 노출하지 않는 fixture" 라고 적은 의도된 설계이고 `mocks/dev.test.ts:22-33` 이 계약을 고정한다. live 에는 목록 밖 published 프로젝트가 존재할 수 없다. 나머지 두 지점은 실재한다 |
| 2   | ARCH-D-09 — `documentCacheTag` 를 site 전용으로 좁힌다                | **반대 방향으로 이미 해소됐다.** 지금 좁히면 02 의 BUG-S-15 수정이 되돌아간다                                                                                                                                                                                                              |
| 3   | ARCH-A-28 — `max-width: 1180px` 가 15개                               | **17파일 18줄**이다. 그리고 개수보다 중요한 것은 **9벌이 4줄 블록 단위로 바이트 동일**이라는 사실이고, 원 보고서의 `PublicPageShell` 제안은 헤더·푸터·랜딩·스켈레톤 8줄을 받지 못한다                                                                                                      |
| 4   | ARCH-A-08 — 13곳을 전부 교체한다                                      | 03 이 7곳만 이관하고 6곳은 각각 근거를 남겼다. "전부 교체" 는 이미 반증된 처방이다                                                                                                                                                                                                         |
| 5   | ARCH-A-23 의 대상 `DevProjectCard.tsx`                                | **그 이름의 파일이 없다.** 실제 대상은 `PhotoTile.tsx`·`Chip.tsx` 둘이다                                                                                                                                                                                                                   |
| 6   | ARCH-D-10 — `src/**` 64줄 / 44파일                                    | 01 작업 후 **12줄 / 3파일**이 남았고 전부 정당하다. 남은 실제 대상은 `vitest.config.ts:13` 의 거짓 근거 주석, CLAUDE.md 구조도, ADR-0001 개정 표기 셋뿐이다                                                                                                                                |
| 7   | (보고서가 잡지 않음)                                                  | CLAUDE.md 가 서술하는 **프레임 내보내기 기능이 코드에 없다.** `features/export/`·`FRAME_STYLES` 뿐 아니라 Project Vision 과 스택 표의 "내보내기 · 클라이언트 canvas · 프레임 6종" 행도 구현이 없다                                                                                         |
| 8   | (보고서가 잡지 않음)                                                  | 문서에 없는 feature 가 12개가 아니라 **13개**다. `features/status/` 가 빠졌다                                                                                                                                                                                                              |

---

## 보고서 밖 — 최근 리팩터가 새로 만든 마찰

### 공개 화면·훅 (03 작업)

**NEW-01 · dialog 라는 개념을 담는 모듈이 없다.** `src/hooks/` 32파일에서 훅이 훅을 부르는
엣지가 **3개**뿐이다. `use-focus-trap`·`use-scroll-lock`·`use-dialog-isolation`·
`use-roving-list-focus` 는 들어오는 엣지도 나가는 엣지도 0이다. 결과로 **오버레이 6개가
6가지 다른 조합**을 손으로 적는다.

| 컴포넌트           | focusTrap | scrollLock                                          | escapeKey       | dialogIsolation | overlayLayer |
| ------------------ | --------- | --------------------------------------------------- | --------------- | --------------- | ------------ |
| `Modal`            | ✓         | ✓                                                   | ✓               | —               | 간접         |
| `ChatPanel`        | ✓         | ✓ `{fixBodyOnMobile:false}`                         | ✓               | ✓               | 간접         |
| `ArticleTocDrawer` | ✓         | ✓                                                   | ✓               | ✓               | 간접         |
| `MobileMenu`       | ✓         | ✓ `{fixBodyOnMobile:false, lockRootOnMobile:false}` | ✓               | —               | 간접         |
| `ImageLightbox`    | ✓         | ✓                                                   | **자체 리스너** | —               | ✓ 직접       |
| `PhotoModal`       | ✓         | ✓                                                   | **자체 리스너** | —               | ✓ 직접       |

여섯 전부 `createPortal(..., document.body)` + `role="dialog"` + `aria-modal="true"` 를 각자 적고
`useMounted` 도 넷이 각자 부른다. 규칙이 모듈이 아니라 **여섯 벌의 호출 순서에만** 있다.

**NEW-02 · `useEscapeKey` 인터페이스 3항목 중 2개가 소비처 0.** `options.capture` 를 넘기는
프로덕션 호출부가 7곳 중 **0곳**, 테스트 6케이스 중 0곳이다. 반환값 `boolean`(isTopLayer)도
7곳 중 0곳이 쓴다. JSDoc 은 "다른 키 처리도 이 값으로 게이트한다" 고 적었지만 실제로
게이트하는 두 곳은 이 훅을 쓰지 않고 `useOverlayLayer` 를 직접 부른다.

**NEW-03 · keydown 소유자 6벌의 타깃·페이즈가 다르다.**
`use-escape-key.ts:42`(document/bubble) · `ImageLightbox.tsx:219`(document/capture) ·
`PhotoModal.tsx:296`(**window/capture**) · `use-photo-modal.ts:74`(window/bubble) ·
`CustomCursor.tsx:625`(window/bubble) · `use-focus-trap.ts:53`(컨테이너/bubble).
`window` capture 는 `document` capture 보다 먼저 뛰므로 `PhotoModal.tsx:296` 이
`useEscapeKey` 를 쓰는 오버레이 전부를 선점한다. **지금 증상은 없지만 순서가 코드가 아니라
우연에 기대고 있고 어디에도 기록이 없다.**

**NEW-04 · `3204a8f` 가 사진 상세와 나머지 모달의 history 계약을 갈라 놓았다.** BUG-C-06 을
고치면서 `use-query-modal.ts` **한 파일만** 손댔고, 같은 커밋이 그 JSDoc 을
`usePhotoDetailSession` 으로 고쳐 두 훅이 같은 개념임을 명시해 놓고 다른 쪽은 두었다.

- `useQueryModal`: 판정이 동기 `openRef`, 첫 열기만 push
- `usePhotoDetailSession`: 판정이 effect 로만 갱신되는 `wasOpen`, push 를 **import 조차 하지 않는다**
- 사진 경로는 **push 하는 쪽(`PhotoTile.tsx:66`)과 pop 판정하는 쪽(`use-photo-detail-session.ts:52`)이
  서로 다른 모듈**이다. 둘을 잇는 것은 계약이 아니라 "URL 이 null→값 으로 바뀌었더라" 는 관찰이다.
- `PHOTO_QUERY_KEY` 를 export 해 두고도 리터럴 `"photo"` 가 `PhotoTile.tsx` 에 2번 하드코딩돼 있다.
- 커밋 메시지가 지적한 "effect 로만 갱신하면 낡은 값을 본다" 가 `use-photo-detail-session.ts:27-32` 에 그대로 남았다.

**NEW-05 · 디코더 단일화가 스칼라만 접고 객체·배열 리더는 5파일에 복제했다.**

- `objects()` 가 `decode/dev.ts:18` 과 `decode/site.ts:6` 에 **문자 단위로 동일**하고,
  같은 판정이 `photo.ts:28`(`readExif`)·`photo.ts:42`(`readCoords`)·`music.ts:15`(`readTimeline`)에
  세 번 더 인라인이다. 같은 개념 **5벌**.
- `readLinks()` 가 `dev.ts:28` 과 `site.ts:14` 에 **JSDoc 문장까지 동일**하게 두 벌.
- `{period, title}` 타임라인 리더가 `music.ts:14`(`readTimeline`)와 `dev.ts:45`(`readEducation`)에 두 벌.
- `EMPTY_IMAGE` 가 `field.ts:89` 에서 export 되는데 **외부 참조가 0건**이다.
- `field.ts:6-12` 주석이 "컬렉션 디코더는 이 함수들만 쓴다" 고 선언하는데 이미 거짓이다.

**NEW-06 · `.sr-only` 가 7벌이 됐다.** `10a985e` 가 전역 유틸을 신설했지만 로컬 구현 **6벌**을
접지 않았고 기법도 갈렸다 — 전역은 `clip-path: inset(50%)`, 로컬 6벌은 폐기된 `clip: rect()` 다.
그중 셋(`DevImageField`·`PosterUploadField`·`PhotoUploadField`)은 04 의 C16 이 지운다.
**`dev-blog` 의 `ArticleCard`·`ArticlesView`·`PinnedArticles` 셋이 05 몫이다.**
`07-rejected.md:36` 이 "`.sr-only` 는 저장소에 존재하지 않는다" 며 통합안을 기각했었는데
이제 존재하므로 그 기각 사유가 소멸했다.

**NEW-07 · 03 이 만든 공개 화면 CSS 규칙 4종이 어디에도 문서화되지 않았다.** 스크림 3층 서열,
focus 소유권, `.sr-only` 기법, skip-link. 규칙은 `globals.css` 주석 3덩어리에만 산다. 관리자는
`docs/admin-ui-conventions.md` 를 갖는데 공개 화면 컨벤션 문서는 0개다. `globals.css:372` 주석이
관리자 문서를 가리키면서 자기 규칙은 자기 자신을 가리킨다. CSS 모듈에 남은 `focus-visible`
선언이 **47개**인데 어느 것이 정당한 오버라이드인지 구분하는 목록이 없다.

**NEW-08 · `[legalDoc]` 통합이 `legal-documents.tsx` 를 1,048 → 1,090줄로 키우고 책임을 넷으로
늘렸다.** 이중언어 본문 6벌(`:42`·`:762`·`:914`) + 라우팅 레지스트리(`:1031`) + 세그먼트
가드(`:1048`) + 정적 생성 목록(`:1052`) + SEO 메타(`:1057-1082`). 지금 `generateMetadata` 한 줄을
고치려면 2,000단어짜리 개인정보 처리방침이 든 파일을 연다. ARCH-A-15 가 6분할을 권고했는데
실제 작업은 반대로 갔다. JSX 를 갖는 파일이 `_lib/` 에 있는 것도 규약 밖이다.

### 관리자 CMS — 04 완주분 재검수 (`b81adae..HEAD` 16커밋 · 152파일)

04 는 `6b51182` 로 완주했다(22커밋). 아래는 그 결과를 다시 대조한 것이다.

**04 가 닫은 것** — 이전 초안에서 뺀다.

- `ArticleRow` 캐스케이드: 해소. 지금은 `row.badge` + `row.badgeIcon` 으로 **같은 모듈** 두
  클래스라 명시도 다툼이 없다. 04-resolution 이 그 사실을 스스로 기록했다.
- `.sr-only` 관리자 3벌: 사라졌다. `dev-blog` 3벌만 남는다.
- `use-*-admin` 쉼 6개: 삭제됐다.

**정정** — 이전 초안의 주장 하나가 코드로 반증됐다. `ProjectForm.tsx:178/187/205` 의
`field="features"/"roles"/"achievements"` 는 **죽은 배선이 아니다.**
`LocalizedProjectListField` 자신의 prop 이고 타입이 `LocalizedArrayKey` 이며
`onAdd(field)`·`onEdit(field,…)`·`onRemove(field,…)` 가 실제로 소비한다. 진짜 문제는 다른
것이다 — **같은 파일 안에서 `field="title"`(검증 키)과 `field="features"`(상태 키)가 같은
이름의 서로 다른 개념**이다.

---

**POST-01 · 블로그 편집기만 셸 이탈 가드에 연결되지 않았다. (기능 갭)**

`useUnsavedForm` 소비처는 엔티티 훅 6 + `use-config-dirty`(→ 설정 편집기 5) = **11개 폼**이다.
`use-article-recovery.ts:39` 는 `useUnsavedGuard(dirty)` 만 부르고 `useUnsavedForm` 을 부르지
않는다. 그 훅이 하는 일 중 하나가 `guard.setDirty(dirty)` 로 `UnsavedGuardProvider` 에
등록하는 것이므로, **`dirtyRef.current` 가 글 편집 중에도 항상 `false`** 다.

- `AdminChrome` 의 워드마크 `Link`·"사이트 보기" `Link`·로그아웃 버튼 셋이 `confirmLeave()` 를
  보는데 블로그에서만 무효다. 새로고침·탭 닫기(`beforeunload`)만 걸린다.
- **04-admin-cms.md:100 이 입력량이 가장 많은 화면이라고 적은 곳이 바로 거기다.**
- 04-plan 의 C8 은 "전 관리자 폼으로" 였고 04-resolution 은 "완료. 새로고침·취소·셸 링크 세
  경로" 라고 적었다. **셋째 경로가 블로그에만 빠진 사실이 문서에 없다.**

**POST-02 · 블로그 복구본이 평행 구현으로 남았다.** 04-plan 의 C9 는 "블로그는 기존 키를
유지하되 **구현만 공용으로 옮긴다**" 였다. `git log b81adae..HEAD -- dev-article-recovery.ts` 가
**0건**이다.

| 계약          | 11개 폼                               | 블로그                                                       |
| ------------- | ------------------------------------- | ------------------------------------------------------------ |
| dirty 지문    | `lib/admin/form-fingerprint.ts` (9줄) | `use-article-editor.ts:33` 자체 구현 (같은 `JSON.stringify`) |
| 복구본 저장소 | `lib/admin/form-recovery.ts` (123줄)  | `_lib/dev-article-recovery.ts` (137줄)                       |
| 복구본 훅     | `_hooks/use-form-recovery.ts` (91줄)  | `_hooks/use-article-recovery.ts` (89줄)                      |
| 복구 안내 UI  | `RecoveryNotice` 10줄                 | `ArticleForm.tsx:84-104` 인라인 21줄 (문구·버튼 라벨 동일)   |
| 이탈 문구     | `LEAVE_MESSAGE` 상수                  | `ArticleForm.tsx:67` 리터럴 재작성                           |
| 키 접두사     | `ADMIN_FORM_DRAFT_KEY_PREFIX`         | `ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX`                         |

두 저장소 모듈은 정렬 후 **바이트 동일한 줄이 61개**이고 `TTL_MS = 7*24*60*60*1000` 리터럴까지
같다. 구조도 같다 — 버전 필드, `savedAt > now` 거부, `Pick<Storage,…>` 포트, 예외 미전파.

**POST-03 · `useConfigDirty` 가 11개 폼 중 5개만 덮는다.** `_hooks/use-config-dirty.ts`(31줄)가
하는 일이 정확히 dirty 판정 3줄인데, 엔티티 훅 6개는 같은 일을 각자 인라인한다. 이번 범위가
엔티티 훅 여섯에 넣은 **배선 15줄이 6-way 바이트 동일**(컬렉션 문자열만 다름)이다 — import 3 ·
`savedFingerprint`/`dirty`/`confirmLeave`/`clearRecovery` 4 · `applyForm` 1 · cancel 2 ·
submit 2 · return 3. **15 × 6 = 90줄의 새 복사본이다.** 유일한 차이는 baseline 초기값이
`null` 이냐 `formFingerprint(form)` 이냐 하나다.

부수로 설정 훅 5개가 `dirty` 와 예전 `saved` state 를 **둘 다** 들고 있다
(`setSaved(false)`/`markDirty()` 가 global 7회 · music-config 6회 · tags 4회).
`use-config-dirty.ts` 주석이 "`saved` 는 dirty 의 반대가 아니다" 라고 인정하면서 정리하지 않았다.

**POST-04 · `image`·`photoIds` 검증이 여전히 화면에 연결되지 않았다.** 전수 대조 결과:

| 짝                             | validator 가 내는 `field`  | Form 의 `field=` / `issueFor` | 결과                                                                |
| ------------------------------ | -------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| album                          | `title.ko`, **`photoIds`** | `title` 만                    | **미연결** — `AlbumPhotoPicker` 에 `field`·`error` prop 자체가 없다 |
| photo                          | **`image`**, `title.ko`    | `title` 만                    | **미연결** — `PhotoUploadField` 에 `data-field`·`AdminField` 가 0회 |
| work · award · media · project | —                          | —                             | 정상                                                                |

사진은 `image` 가 **첫 issue** 라 `focusFirstIssue` 가 `false` 를 돌려주고 하단 `role="alert"` 도
`error` 가 `null` 이라 렌더되지 않는다. **저장을 눌러도 아무 일이 일어나지 않는다.**

**POST-05 · 검증 규칙 6벌.** `title.ko` 필수 3줄 블록이 **5벌 바이트 동일**(album·photo·work·
media·project), award 만 `name.ko` 로 갈렸으니 사실상 같은 규칙 6벌이다. JSDoc 한 줄,
`const issues: FieldIssue[] = [];`, `return issues;` 도 각각 6벌이다. **6개 파일 92줄이 담는
고유 규칙은 9개다.** `validate-media-input.ts`·`validate-project-input.ts` 는 지우면
`requireKoTitle(input)` 한 줄 호출만 남는 pass-through 다.

**POST-06 · 삭제 확인이 11벌, 공용 헬퍼가 없다.** `window.confirm` 호출부 16곳 중 삭제 확인이
11곳이고 `"{이름}" {대상}{을/를} 삭제할까요?` 를 **전부 각자 적는다**. 그중 둘만 결과 문장을
덧붙였다(`사진은 지워지지 않습니다.`·`되돌릴 수 없습니다.`) — 같은 파괴 동작인데 경고 강도가
갈렸다. 이름 없을 때 fallback `"제목 없음"` 이 **7파일**에 리터럴로 흩어져 있고 award 만
`"이름 없음"` 이다.

**`AdminRow` 가 삭제 버튼을 이미 소유하는데(`onDelete`·`deleteDisabled`·`deleteTitle`) 확인
문구만 소유하지 않는다.** 접힐 자리가 비어 있다.

같은 범위가 만든 `lib/i18n/korean-particle.ts`(17줄, `objectParticle`)는 **소비처가
`AdminDocGate` 하나**다(가상 seam). 위 11개 확인 문구는 조사를 전부 하드코딩한다 —
**confirm 통합에 이 헬퍼를 함께 쓰면 두 항목이 한 커밋으로 접히고 seam 이 진짜가 된다.**

**POST-07 · `AdminListShell` 은 있고 `AdminFormShell` 은 없다.** 목록 7개는 49~52줄로 줄었는데
폼 6개는 `<form>` → RecoveryNotice 10줄 → header 3줄 → sections → `role="alert"` 5줄 →
actions 8줄의 **골격 26줄 × 6 = 156줄**을 각자 적는다. 연속 동일 블록이 최대 31줄
(`공개 체크박스 + error 문단 + actions`)이고, 15줄 블록(`return (<form> {recovery.pending ? …`)은
**이번 범위가 넣은 것**이다.

갈래 셋: `admin-form.module.css` 를 받는 별칭이 `styles`(3파일) vs `base`(4파일)로 두 벌이고,
`AdminField` 사용량이 0~7 로 갈리며, `disabled` 조건이 `saving` vs `saving || uploading` 두 벌이다.

**POST-08 · 목록 6벌이 갈라진 게 아니라 완전히 같아졌다.** `AdminPhotosList` ↔
`AdminMusicWorksList` 가 49줄 중 **29줄 바이트 동일**이다. `AdminListShell` 의 12개 prop 중
10개를 6벌 모두가 **리터럴로** 넘기고 그중 6개가 한국어 문자열이다. 드래그 힌트 문구는
6벌 바이트 동일이다. 셸이 소유한 것은 "4분기 렌더" 뿐이고 "이 화면이 무엇인가" 는 여전히
호출부 6곳에 흩어져 있다.

그리고 **`AdminDevArticlesList.tsx:5` 가 셸의 CSS 모듈을 직접 import 한다**
(`base.state`·`base.stateError`·`base.list`). 셸의 12-prop 인터페이스가 필터 있는 화면을 못
받아서 그 화면이 셸의 스타일시트로 손을 뻗고, `status`/`error`/`isEmpty` 3분기를 children
안에서 두 번째로 다시 구현한다. 계획에도 resolution 에도 없다.

**POST-09 · 죽은 인터페이스 3건.**

- `AdminHubGrid.badgeLabel` — **pass 사이트 0**. 넘기는 곳이 없다.
- `use-image-upload.ts:97`·`use-poster-upload.ts:76` 의 `completed: 0, total: 0` — **영원히
  리터럴 0**이고 두 소비처(`PhotoUploadField`·`PosterUploadField`)는 읽지 않는다.
  `UploadProgress` 가 이미 같은 기본값을 갖는다. 셋의 반환을 통일했다는 표시만 남고 실제
  계약은 다르다 — `use-dev-image-upload` 의 `stage` 는 `reading`·`compressing` 을 못 내고
  `error` 는 N개를 한 줄로 접는다.
- `upload-progress.ts:37` 의 `MAX_UPLOAD_BYTES` — 외부 소비처 0.

**POST-10 · 행 CSS 중복이 남았고, 공용 Row CSS 가 두 어휘를 담는다.**

- 썸네일 4파일(`PhotoRow`·`AlbumRow`·`ProjectRow`·`WorkRow`)의 `.title` 8줄이 **4벌 동일**,
  `.thumbImg` 4벌 동일, `.thumb` 은 치수 두 줄만 다르다. 메타 컬럼(`.count`·`.year`·`.date`)은
  **이름만 다르고 선언 4줄이 3벌 동일**이며 `@media` 의 `display:none` 까지 같다.
- `InterviewRow` ↔ `DevTimelineRow` 의 `.row`·`.controls` 가 완전 동일, `LinkRow` 의 `.row` 는
  공용 `.row` 와 선언이 일치한다.
- `admin-row.module.css` 를 import 하는 11파일 중 **8개가 공용 Row 컴포넌트를 안 쓴다**.
  `.move` 는 `AdminRow`·`AdminSortableRow` 어느 쪽도 쓰지 않는다 — 한 파일이 서로 겹치지 않는
  두 어휘를 담고 있다.
- `admin-shell` 폴더 안 중복도 그대로다 — `.title` 3벌, `.state`·`.stateError` 2모듈
  (`--t-body` vs `--t-small` 만 다름), `.grid2` 11벌(10 + `LocalizedFieldPair` 의 `.pair`).

**POST-11 · 배관이 남은 두 자리.**

- `useAdminDocLoad` 와 `AdminDocGate` 는 **소비처 집합이 정확히 같은 7페이지**이고 한 번도 따로
  쓰이지 않는다. `status`·`error`·`doc` 3값을 훅에서 꺼내 게이트로 넣는 배관이 7벌이고,
  게이트가 `doc` 을 받지 않아 `{doc ? <Form/> : null}` 삼항이 7곳에 남았다.
- `AdminRow` 의 props 14개 중 **7개가 호출부 1곳**이다(`handle`·`innerRef`·`style` 은
  `AdminSortableRow` 전용, `dense`·`deleteDisabled`·`deleteTitle` 은 `TagRow` 전용,
  `publishedLabels` 는 `ArticleRow` 전용). 본체가 41줄이라 인터페이스가 구현만큼 크다.
- `ArticleRow` 만 `publishedBusy` 를 넘기지 않는다(6/7 이 넘김). 셸이 준 연타 가드를 블로그
  행만 못 받는다.

**POST-12 · `ROUTES` 의 NEW 상수 7개만 리터럴이다.** 같은 파일의 수정 경로 8개는 전부
함수(`adminMusicWorkRoute(id)`)인데 NEW 7개는 하드코딩 문자열이다. 목록 경로를 바꾸면 함수
8개는 따라오고 NEW 7개는 조용히 갈린다. 같은 파일 안에서 규칙이 두 가지다.
`storage-keys.ts` 도 draft 접두사가 2벌이라 `clear-admin-workspace` 가 두 접두사를 안다.

---

**POST-13 · `void _id` 관용구 7벌**, 그리고 **사진만 함수 이름이 어긋난 채 남았다** — 다섯은
`xToInput`/`emptyXInput`, 사진만 `createPhotoInput`/`createEmptyPhotoInput` 이다. `2b0e6cc` 가
고친 것은 파일 이름(`photo-draft.ts` → `photo-form-data.ts`)뿐이다.

### 서버 경계·챗 (01·02 작업)

**SEC-01 · 관리자 게이트 전처리 5벌, 실패 표현이 5곳 모두 다르다.** `authorizeAdminToken` 뒤
verdict 를 접는 3줄이 5곳에 각각 있다.

| 호출부                                  | throttled           | unauthorized               |
| --------------------------------------- | ------------------- | -------------------------- |
| `image-source/route.ts:57-58`           | `tooManyRequests()` | `unauthorized()` 지역 헬퍼 |
| `portfolio-embeddings/route.ts:66-69`   | `tooManyRequests()` | 인라인 `NextResponse.json` |
| `portfolio-embeddings/route.ts:133-136` | 같은 파일 안 2벌째  | 같음                       |
| `preview-article-markdown.ts:50-53`     | `throw Error(...)`  | `throw Error(...)`         |
| `revalidate-public.ts:37-43`            | `throw Error(...)`  | `throw Error(...)`         |

`tooManyRequests` 는 두 파일에 **바이트 동일한 5줄**로 복사돼 있다. 그리고 **테스트 세션
우회가 적용된 관리자 표면이 5 중 1**이다 — `preview-article-markdown.ts:48` 만
`isTestAdminSessionEnabled()` 로 건너뛰고 나머지 셋은 건너뛰지 않는다. 어느 표면이 우회
대상인지 판단할 자리가 없다.

**SEC-02 · `ad5b93b` 가 뽑은 것은 *전송*이지 *카운터*가 아니다.** "IP 키로 창 안에서 세고
상한을 넘으면 남은 TTL 을 초로 돌려준다" 는 개념이 세 소비처에 각각 있다.

- `INCR` → `if count == 1 then PEXPIRE` Lua 관용구 **3벌**. 그중 `admin-auth-throttle.ts:47-53` 과
  `triage-rate-limit.ts:35-41` 은 **바이트 동일한 5줄**
- UTC 일 버킷 키 2벌 · TTL 상수 `172_800_000` 2벌 · retry-after 계산 `Math.max(1, Math.ceil(...))`
  **완전 동일한 2줄** · env 정수 파서 3벌 · 환경 변수 타입 3벌
- `DEFAULT_DAILY_LIMIT` 라는 **같은 이름의 다른 상수 2개**(챗 1,000 · 트리아지 50)
- `UpstashEvalResult` 는 5변형 union 인데 `reason`/`status` 를 읽는 소비처가 **3 중 1**이다

**SEC-03 · 본문 크기 상한이 3가지 모양이고 `readLimitedBody` 가 동명이인 2벌이다.**
`a568151` 이 `read-limited-body.ts` 를 `lib/http` 로 옮겨 seam 을 만들었지만
`image-source/route.ts:19-42` 에 같은 개념의 24줄짜리 지역 구현이 남았다(시그니처만 다르다).
그리고 **`sentry-alert/route.ts:43` 이 도달 불가 분기다** — `readLimitedBody` 가 상한 초과에
`null` 을 돌려주고 `:39` 가 413 으로 끊으므로, `verifySentrySignature` 안의
`Buffer.byteLength(rawBody) > max`(`:75`)는 이 호출부에서 참이 될 수 없다. 함수 쪽 가드는
자체 테스트가 고정하는 모듈 불변식이라 남기고 **route 분기만 지운다.**

**SEC-04 · API 오류 응답 본문이 8 route 에 5가지 모양이다.**
`{error:{code,message}}`(챗) · `{error:"Unauthorized"}` · `{error:"한국어 문장"}` ·
`{error:"Project not found"}` · 본문 없음(`sentry-alert`). 그리고 `image-source/route.ts` 에만
`export const runtime`·`maxDuration` 선언이 없다.

**SEC-05 · 챗 오류 표현 4벌, `ChatErrorCode` 22개를 클라이언트가 읽지 않는다.**
`use-chat.ts:15` 가 `{code?: string}` 을 타입에 두지만 `:50-53` 의 `getServerError` 는
**`message` 만** 검사·반환하고 `.code` 를 읽는 코드가 `features/chat` 전체에 0곳이다.
`ChatUpstreamError` 의 `kind` 4종 중 `invalid` 는 `publicErrorFor:389-393` 이 분기하지 않아
기본 502 로 떨어지고, `sse-stream.ts` 의 `MAX_STREAM_CHARS` 초과도 평문 `Error` 라
같은 502 가 된다 — **상한 초과와 알 수 없는 실패가 방문자에게 같은 응답이다.**

**SEC-06 · `replaceRagDocuments` 시그니처가 4 → 6 파라미터가 되며 순서 의존이 계약이 됐다.**
`e04a54c` 가 `assertWithinDocumentLimit` 를 export 하고 반환값 `staleIds` 를 6번째 위치 인자
`precomputedStaleIds` 로 되받는다. **호출부가 같은 `chunks`·`target` 으로 먼저 불렀다는 사실이
정확성 조건인데 타입으로 강제되지 않는다.** 다른 `chunks` 로 얻은 목록을 넘기면 상한 검사가
조용히 건너뛰어지고 삭제 대상도 틀린다. 이 인자를 지우면 DB 조회 1회가 늘 뿐 동작은 같다.

**SEC-07 · `AdminChrome.tsx` 에 로그아웃 절차가 2벌**(`:30-33` 버튼, `:38-41` 유휴).
2줄이 동일하고 차이는 `guard.confirmLeave()` 유무 하나다. 로그아웃 이후 절차가 늘어나면
두 곳을 고쳐야 한다. **04 의 C8 이 이 파일을 만들었으므로 재검수에서 현행을 다시 확인한다.**

**SEC-08(낮음) · `contact-draft-storage.ts:97-98` 이 쓰기마다 타이머와 리스너를 더한다.**
`window.setTimeout(drop, TTL)` 은 취소되지 않고 `pagehide` 리스너는 `{once:true}` 라 발화 전까지
누적된다. **정정: 호출부가 `ChatContactDraftButton.tsx:35` 한 곳의 버튼 클릭이라 N 이 작다.**
심각도 낮음으로 기록하고 이전 타이머를 지우는 한 줄만 더한다.

> **`public-sanitize.ts` 는 유지한다.** 세 함수 모두 소비처가 1곳이라 기계적 deletion test 는
> pass-through 로 나오지만, 이 모듈이 담는 것은 코드가 아니라 **"정화는 공개 fetcher 뒤에서만
> 한다" 는 불변식**이고 세 디코더 주석이 그 이름을 가리켜 발견 가능하게 만든다. 02-resolution 이
> 그 결정을 기록했다. 고칠 것은 이름 불일치뿐이다 — 세 주석이 `sanitizeForPublic` 이라는
> 존재하지 않는 이름을 가리킨다.

---

## 확정한 설계 결정

| #   | 결정                                                                                           | 근거                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 04-plan 완주 후 착수하고 **완주 직후 재검수를 먼저 한다**(C0 · 완료)                           | 계획을 세우는 동안에도 04 가 21커밋 진행했고 `validate-work-input.ts` 가 13→17줄로 바뀌었다. 중간 시점 실측은 POST 항목이 대체했다                                                                                          |
| D12 | **POST-01·POST-04 를 Phase 3 의 맨 앞에 둔다**                                                 | 둘은 구조 문제가 아니라 관측 가능한 기능 갱이다. 블로그 편집 중 셸 링크 가드가 돌지 않고, 이미지 없이 저장하면 화면이 무반응이다. 구조 작업(C13~C18)이 그 위에 얹힌다                                                       |
| D2  | ARCH-A-01·A-12·UI-S-04·UI-S-12 를 **한 단계**로 묶는다                                         | 넷이 두 파일을 공유한다. 분해를 먼저 해야 성능 2건의 수정 지점이 함수 단위로 드러나고, 폴더 통합은 그 뒤라야 이동 대상이 확정된다                                                                                           |
| D3  | `SortableCollectionId` 로 `sortableListCrud`/`documentCrud` 를 나눈다                          | 서술자가 `listDescriptor(table, sortRpc)` 팩토리로 이미 6개를 묶어 분류가 새로 생기지 않는다. `sort-rpc.ts:30` throw 와 `devArticlesCrud.updateOrder`·`.list` 함정이 타입으로 대체된다                                      |
| D4  | `listProjected` 는 **테이블명만** 서술자로 흡수한다                                            | 6개 호출부의 select 가 전부 다르고 `dev_articles` 하나가 둘을 갖는다. `orderColumns` 의 `["id"]` 가 서술자 order 와 다른 것은 의도이고 `admin-list.ts:120-121` 이 그렇게 적었다. 드리프트 위험은 테이블명 리터럴에만 있었다 |
| D5  | ARCH-A-28 은 **토큰 + 유틸리티 클래스**                                                        | `--page-max` 가 18줄 전부를, `.u-page-main` 이 바이트 동일한 9벌을 받는다. `PublicPageShell` 은 헤더·푸터·랜딩·스켈레톤을 받지 못해 절반만 해결한다                                                                         |
| D6  | `features/about` → `features/photo-about`, `features/sentry-triage` → `src/lib/sentry-triage/` | 전자는 이름이 전역인데 사진 섹션 전용이고 `music`·`dev` 에 각자의 About 뷰가 있다. 후자는 24파일이 전부 `_lib/` 이라 UI 없는 서버 파이프라인이 `features/` 에 있다                                                          |
| D7  | `useDialog` 합성 훅을 만든다                                                                   | 오버레이 6개가 6가지 조합을 손으로 적고 `createPortal`+`role="dialog"`+`aria-modal` 을 각자 쓴다. scrollLock 옵션이 실제로 다르므로 **옵션은 그대로 받되 조립만 접는다** — 인터페이스를 넓히지 않는다                       |
| D8  | 관리자 게이트를 `withAdminToken` 하나로 접는다                                                 | 5벌 × 3줄 + `tooManyRequests` 바이트 동일 2벌이 있고 실패 표현이 5가지다. 접는 자리가 비어 있다                                                                                                                             |
| D9  | Upstash **카운터**를 전송 위에 한 겹 더 둔다                                                   | `ad5b93b` 가 전송만 뽑았다. Lua 관용구 3벌 중 둘은 바이트 동일이고 retry-after 계산도 2줄 동일이다                                                                                                                          |
| D10 | ARCH-A-02(챗 분해)는 **마지막 단계**에 둔다                                                    | 저장소에서 가장 복잡한 경로다. 기존 1,267줄 테스트가 그물이지만 다른 항목이 끝난 뒤라야 실패 원인이 이 변경으로 좁혀진다                                                                                                    |
| D11 | 진행 방식은 04-plan 과 동일                                                                    | 커밋마다 네 게이트, 중간 승인 없이 끝까지, `git push`·PR 없음                                                                                                                                                               |

---

## 실행 규약

04-plan 과 같다.

1. 한 커밋 분량의 수정을 끝낸다.
2. `npm run check && npm run lint && npm run test:coverage && npm run deps:check`
3. 실패하면 원인을 찾아 고친다. 계획의 전제가 틀린 것으로 드러나면 계획을 고치고 기록한다.
4. 통과하면 `[TYPE] 한글 제목` 규약으로 커밋한다.
5. 새 공용 파일을 만든 커밋은 그 파일을 `vitest.config.ts` 의 `coverage.include` 에 같은 커밋에서 더한다.

시각 변화가 있는 커밋은 그 안에서 `npm run test:visual` 을 돌려 스냅샷 갱신분을 같은 커밋에 담는다.

**C1 부터 끝까지 중간 승인 없이 진행한다.** 멈추는 경우는 셋 — 게이트 실패의 원인이 계획의
전제가 틀린 것이고 어느 쪽으로 고칠지가 설계 판단인 경우, 계획에 없는 파괴적 동작이 필요해진
경우, C0 재검수처럼 계획이 **실측 후 판정**이라고 미리 적어 둔 지점. **`git push` 는 하지 않는다.**

---

## 커밋 계획

### C0 · 04 완주 직후 재검수 — **완료**

04 는 `6b51182` 로 완주했다(22커밋 · 224파일). `b81adae..HEAD` 16커밋 152파일을 재대조한 결과는
아래 「04 완주분 재검수」 절에 있다. 이전 초안의 ArticleRow 캐스케이드 항목과 NEW-06 의
관리자 3벌은 04 가 닫았고, 그 자리에 새 항목 **POST-01~10** 이 나왔다.

### C1 · `[DOCS] 구조 검토 항목 실행 계획 추가`

`docs/review/2026-08-26/05-plan.md` 와 `README.md` 문서 표의 행 추가.

### Phase 1 — 데이터 계층

**C2 · `[FIX] mock 콘텐츠 getter의 공개 게이트 통일`** (ARCH-D-03)

- `src/lib/content/mock-list.ts` 에 `publishedInOrder<T extends {order:number; published:boolean}>`.
  `content/photo.ts`(2곳)·`music.ts`·`dev.ts`·`chat.ts` 가 전부 이걸 쓴다.
- `chat.ts:56-73` 의 `pickPublicFields` 가 6개 컬렉션을 published 필터도 정렬도 없이 돌려주는
  것을 닫는다. 지금 mock 에 초안이 `dev-articles.ts:493` 한 줄뿐이라 드러나지 않을 뿐이다.
- `local-list-repository.ts:224-228` 의 `remove` 에 `patch` 와 같은 존재 검사를 넣는다.
  live 는 `list-crud.ts:237` 이 0행을 실패로 처리한다.
- **`src/lib/content/*.test.ts` 를 신설한다.** 지금 이 폴더에서 테스트가 있는 것은
  `dev-articles.ts` 하나다 — 계약이 갈라지는 바로 그 자리가 무방비다.
- 정정 1 에 따라 `getDevProject` 의 mock 폴백은 건드리지 않고 왜 유지인지를 주석 한 줄로 남긴다.

**C3 · `[REFACTOR] 행 병합 분리와 공개 전송 계층의 서버 경계`** (ARCH-D-04)

- `src/lib/supabase/row-merge.ts` 신설 — `mergeRow`·`toDate`·`toNullableDate` 이관.
  서술자만 참조하는 순수 모듈이다.
- `list-crud.ts:10` 이 새 모듈을 직접 import 한다(re-export 금지).
  **브라우저에서 `transport.ts` 를 부르는 곳은 이 한 줄뿐임을 전수 확인했다.**
- `transport.ts` 상단에 `import "server-only"`. `rag.ts:1` 이 이미 그 형태다.
- 이 커밋에서 `npm run build` 를 함께 돌린다. 공개 fetcher 를 브라우저 번들에서 부르는
  경로가 남아 있으면 게이트가 아니라 빌드가 잡는다.

**C4 · `[REFACTOR] Supabase REST 호출을 한 클라이언트로`** (ARCH-D-11)

- `src/lib/supabase/rest-client.ts` 에 `restFetch(path, {params, accessToken?, retry?, cache})`.
- `baseHeaders` 가 `transport.ts:61` 과 `rag.ts:40` 에 동일 구현으로 두 벌이고 `apikey` 규약
  주석까지 복사돼 있다. 재시도도 갈린다 — `transport.ts:71`·`rag.ts:269` 는 `fetchWithRetry`,
  `rag.ts:103,223,243`·`transport.ts:204` 는 맨 `fetch` 다.
- **C3 이 선결 조건이다.** `transport.ts` 를 브라우저에서 떼지 않으면 통합 결과가
  `server-only` 경계를 가질 수 없다.

**C5 · `[REFACTOR] 정렬 가능한 컬렉션을 타입으로 좁힌다`** (ARCH-D-06 + 02 이월)

- `constants/collections.ts` 에 `SortableCollectionId` 를 두고 그 6개의 서술자에서 `sortRpc` 를
  필수로 만든다.
- `listCrud` 를 둘로 나눈다. `documentCrud(...)` 가 `{newId, get, create, update, setPublished, remove}` 를,
  `sortableListCrud(...)` 가 거기에 `{list, updateOrder}` 를 더한다. 호출부는 7개다.
- `sort-rpc.ts:30` 의 런타임 throw 가 사라지고, 서술자 select 가 `...,data` 라 모든 글의
  Markdown 본문을 끌어오는 `devArticlesCrud.list` 함정도 인터페이스에서 사라진다.
- `admin-list.ts` 의 테이블명 리터럴 6곳을 `tableFor(COLLECTIONS.X)` 로 바꾼다(D4).
  select 와 `orderColumns` 는 호출부에 남기고 `:120-121` 의 기존 근거 주석을 유지한다.

**C6 · `[REFACTOR] 디코더의 객체·배열 리더 통합`** (NEW-05)

- `objects()`(5벌)·`readLinks()`(2벌)·타임라인 리더(2벌)를 `decode/field.ts` 로 올린다.
  `field.ts:6-12` 의 "컬렉션 디코더는 이 함수들만 쓴다" 가 그때 참이 된다.
- `EMPTY_IMAGE` 를 export 목록에서 뺀다(외부 참조 0건).
- `decode/dev.ts:27`·`music.ts:25`·`site.ts:13` 의 "`sanitizeForPublic` 이 한다" 를 실제 이름으로 고친다.
- 순수 함수라 테스트가 싸다. `field.test.ts` 에 새 리더의 형 검증 케이스를 더한다.

**C7 · `[CHORE] 데이터 계층 배치와 죽은 코드 정리`** (ARCH-D-12, D-14, D-16)

- `lib/ai/rag-query.ts:11` 의 `keywordSimilarity` 삭제. **프로덕션 참조 0건**이고
  `rag-query.test.ts` 만 8회 부른다. 테스트를 `createKeywordScorer(query)(document)` 로 바꾼다.
- `lib/photo-filter-query.ts` → `lib/photo/filter-query.ts`,
  `lib/contact-draft-storage.ts` → `lib/contact/draft-storage.ts`(테스트 동반).
  `vitest.config.ts` 의 `coverage.include` 두 줄도 같은 커밋에서 고친다.
- `constants/sections.ts` 의 `sectionFromPath` 를 `lib/navigation/section-from-path.ts` 로 옮긴다.
  `SECTION_BY_PREFIX`·`SectionId`·`DEFAULT_SECTION` 은 constants 에 남는다. `empty-configs.ts`
  (상수→상수)와 `navigation.ts`(타입 전용)는 유지한다.
- `lib/content/rag-source.ts` 의 `getRagSourceData` 진입부에서 mock 모드면 명시적 오류를 던진다.
- SEC-08: 이전 타이머를 지우는 한 줄을 `draft-storage.ts` 에 더한다(같은 파일 이동 커밋이라 함께).

### Phase 2 — 서버 경계

**C8 · `[REFACTOR] 관리자 게이트 전처리를 하나로`** (SEC-01)

- `src/lib/auth/with-admin-token.ts` 에 게이트 하나를 두고 route 5곳과 server action 2곳이 쓴다.
  실패 표현을 한 벌로 맞춘다. `tooManyRequests` 바이트 동일 2벌이 사라진다.
- **테스트 세션 우회를 어느 표면에 적용할지 게이트 인자로 명시한다.** 지금은
  `preview-article-markdown.ts:48` 하나만 우회하고 그 이유가 주석에만 있다.
- `image-source/route.ts` 에 빠진 `export const runtime`·`maxDuration` 을 더한다.

**C9 · `[REFACTOR] Upstash 카운터를 전송 위에 한 겹으로`** (SEC-02)

- `src/lib/rate-limit/counter.ts` 에 창 카운터와 일 카운터를 둔다.
  `INCR`+`PEXPIRE` Lua 3벌(둘은 바이트 동일), UTC 일 버킷 2벌, TTL 상수 2벌,
  retry-after 계산 2줄 동일, env 정수 파서 3벌, env 타입 3벌이 여기로 모인다.
- `DEFAULT_DAILY_LIMIT` 동명이인 두 상수의 이름을 소비처에 맞게 나눈다.
- `UpstashEvalResult` 의 5변형을 실제로 읽는 소비처가 하나뿐이므로, 나머지 둘에게는
  좁힌 반환을 준다.

**C10 · `[FIX] 본문 상한 단일화와 API 오류 응답 형태`** (SEC-03, SEC-04)

- `image-source/route.ts:19-42` 의 지역 `readLimitedBody`(동명이인)를 `lib/http` 판으로 흡수하거나,
  대상이 `Response` 라 흡수할 수 없으면 이름을 나누고 관계를 주석에 남긴다.
- `sentry-alert/route.ts:43` 의 도달 불가 분기를 지운다. `verifySentrySignature:75` 의 가드는
  자체 테스트가 고정하는 모듈 불변식이라 남기고 그 사실을 JSDoc 에 적는다.
- Content-Length 선검사 인라인 2벌을 `lib/http` 헬퍼로 모은다.
- 오류 응답 본문 5가지를 정리한다. 공개 GET·관리자 POST·웹훅 셋으로 나누고 각 부류의
  형태를 하나로 맞춘다.

### Phase 3 — 관리자 후속 (04 잔여)

**C11 · `[FIX] 미저장 가드와 복구본을 블로그 폼까지`** (POST-01, POST-02)

04 의 C8·C9 가 선언한 "전 관리자 폼" 에서 블로그만 빠졌다. **기능 갱이므로 이 단계의 먼저다.**

- `use-article-recovery.ts:39` 의 `useUnsavedGuard(dirty)` 를 `useUnsavedForm(dirty)` 로 바꾼다.
  그것만으로 `AdminChrome` 의 워드마크·사이트 보기·로그아웃 세 가드가 블로그에도 걸린다.
- `ArticleForm.tsx:67` 의 리터럴을 `LEAVE_MESSAGE` 상수로 바꾼다.
- `dev-article-recovery.ts`(137줄)를 `lib/admin/form-recovery.ts`(123줄)에 흡수한다.
  정렬 후 61줄이 바이트 동일이고 `revive` 옵션과 `version` 인자만 더하면 된다.
  **키 접두사는 그대로 둔다** — `RECOVERY_VERSION = 3` 계약을 깨면 기존 복구본이 사라진다.
- `ArticleForm.tsx:84-104` 의 인라인 복구 패널 21줄을 `RecoveryNotice` 로 교체한다.
- `use-article-editor.ts:33` 의 자체 `fingerprint` 를 `lib/admin/form-fingerprint.ts` 로 바꾼다.
- `ArticleRow` 에 `publishedBusy` 를 넘긴다(6/7 이 넘기는데 블로그만 안 넘긴다).
- **`npm run test:e2e:admin` 을 함께 돌린다.**

**C12 · `[FIX] 업로드 필드의 검증 오류를 화면에 연결`** (POST-04)

- `PhotoUploadField` 와 `AlbumPhotoPicker` 가 `field`·`error` 를 받아 `data-field` 를 내고
  오류 문구를 그린다. 지금 둘 다 `data-field`·`AdminField` 가 0회라
  `validatePhotoInput` 의 `image`(첫 issue)와 `validateAlbumInput` 의 `photoIds` 가
  **저장만 막고 화면에 아무 표시도 하지 않는다.**
- 회귀를 막는 테스트를 두 폼에 붙인다.

**C13 · `[REFACTOR] 검증 필드 이름을 타입으로`** (POST-05, POST-13)

- `FieldIssue.field` 를 폼별 유니온 키로 좁혀 생산자·DOM·소비자가 어긋나면 `tsc` 가 잡게 한다.
  **C12 가 손으로 고친 두 개를 다시 끊어지지 않게 하는 게 이 커밋의 목적이다.**
- `LocalizedProjectListField` 의 `field` prop 을 `arrayKey` 로 개명한다. 같은 파일 안에서
  `field="title"`(검증 키)과 `field="features"`(상태 키)가 같은 이름의 다른 개념이다.
- `title.ko` 필수 3줄 블록 5벌과 메시지 6벌을 공용 규칙 빌더로 접는다.
  6파일 92줄이 담는 고유 규칙은 9개다.
- `void _id` 관용구 7벌을 공용 헬퍼로 접고, 사진의 `createPhotoInput`/`createEmptyPhotoInput`
  을 형제 다섯의 `xToInput`/`emptyXInput` 이름으로 맞춘다.

**C14 · `[REFACTOR] 편집 훅의 dirty·복구 배선을 한 벌로`** (POST-03)

- `useConfigDirty` 를 baseline 초깃값을 받는 형태로 넓혀 엔티티 훅 6개가 함께 쓰게 한다.
  이번 범위가 넣은 **15줄 배선이 6-way 바이트 동일**이고 차이는 baseline 하나다(90줄).
  이름도 호출자 부류("config")가 아니라 하는 일로 바꾼다.
- `RecoveryNotice` 조립 11벌을 접는다. 복구 적용 콜백 이름이 엔티티 `applyForm`·설정
  `applyRecovered` 로 갈렸는데 시그니처가 같다.
- 설정 훅 5개의 `saved` state 와 `dirty` 가 겹치는 부분을 정리한다
  (`setSaved(false)`/`markDirty()` 가 global 7회·music-config 6회·tags 4회).
- 설정 편집기 5벌의 `onNavigate` 3줄이 바이트 동일이다 — 함께 접는다.
- **앨범만 `prepare` → `validate` 역순인 것을 다섯에 맞춘다.**

**C15 · `[REFACTOR] 삭제 확인을 행 껍데기로`** (POST-06)

- `AdminRow` 가 이미 삭제 버튼을 소유하는데 확인 문구만 소유하지 않는다.
  `confirmDelete?: {name, noun}` 을 받아 11벌을 접는다.
- **`lib/i18n/korean-particle.ts` 의 `objectParticle` 을 여기서 쓴다.** 지금 소비처가
  `AdminDocGate` 하나라 가상 seam 이고, 11개 문구는 조사를 전부 하드코딩한다.
- 이름 없을 때 fallback `"제목 없음"` 이 7파일에 리터럴로 흩어져 있고 award 만
  `"이름 없음"` 이다. 한 곳으로 모은다.
- 경고 강도를 맞춘다. 같은 파괴 동작인데 결과 문장을 붙인 것이 11 중 2벌이다.

**C16 · `[REFACTOR] 폼 껍데기와 문서 열기 배관 접기`** (POST-07, POST-11)

- `admin-shell/_components/AdminFormShell.tsx` — 폼 경계·복구 안내·제목·오류 문단·
  액션 줄을 받는다. 지금 골격 26줄 × 6 이고 최대 연속 동일 블록이 31줄이다.
  목록에는 셸이 생겼는데 폼에는 대응물이 없다.
- `admin-form.module.css` 별칭을 `styles`(3파일) / `base`(4파일) 중 하나로 통일한다.
- `useAdminDocLoad` 와 `AdminDocGate` 를 합친다. 소비처 집합이 **정확히 같은 7페이지**이고
  한 번도 따로 쓰이지 않는다. 게이트가 `doc` 을 받지 않아 `{doc ? <Form/> : null}`
  삼항이 7곳에 남았다. children-as-function 으로 바꾸면 7페이지가 34 → 약 20줄이 된다.
- `AdminRow` 의 props 14개 중 호출부 1곳짜리 7개를 정리한다. `AdminHubGrid.badgeLabel`
  은 pass 사이트가 0 이므로 지운다.

**C17 · `[REFACTOR] 목록 셸의 남은 리터럴과 행 CSS 중복`** (POST-08, POST-10, POST-12)

- `AdminListShell` 위에 한 층을 더해 6벌이 넘기는 **리터럴 10개(그중 한국어 6개)**를 줄인다.
  지금 `AdminPhotosList` ↔ `AdminMusicWorksList` 가 49줄 중 29줄 바이트 동일이고
  드래그 힌트 문구가 6벌 동일이다.
- **`AdminDevArticlesList` 가 셸의 CSS 모듈을 직접 import 하는 것을 없앤다**
  (`base.state`·`base.stateError`·`base.list`). 셸이 필터 있는 화면을 못 받아 그 화면이
  셸의 스타일시트로 손을 뻗고 상태 3분기를 두 번째로 다시 구현하고 있다.
- 행 CSS 중복을 접는다 — 썸네일 4파일의 `.title` 8줄 4벌 · `.thumbImg` 4벌 ·
  메타 컬럼 3벌(이름만 다름) · `InterviewRow` ↔ `DevTimelineRow` 완전 동일 ·
  `LinkRow` 의 `.row` 는 공용과 선언이 일치한다.
- `admin-shell` 폴더 안 중복도 같이 접는다 — `.title` 3벌, `.state`·`.stateError`
  2모듈(`--t-body` vs `--t-small` 만 다름), `.grid2` 11벌.
- `admin-row.module.css` 가 두 어휘를 담고 있다 — `.move` 는 공용 Row 어느 쪽도 안 쓰고
  이 파일을 import 하는 11파일 중 8개가 공용 컴포넌트를 안 쓴다. 둘로 나눈다.
- `ROUTES` 의 NEW 상수 7개만 리터럴이고 수정 경로 8개는 함수다.
  `adminNewRoute(base)` 하나로 맞춰 목록 경로 변경이 조용히 갈라지지 않게 한다.
- **시각 회귀 커밋이다.** `npm run test:e2e:admin` 을 함께 돌린다.

**C18 · `[CHORE] 업로드 훅의 거짓 반환 필드 제거`** (POST-09)

- `use-image-upload.ts:97`·`use-poster-upload.ts:76` 의 `completed: 0, total: 0` 을 지운다.
  **영원히 리터럴 0 이고 읽는 소비처가 0곳**이며 `UploadProgress` 가 이미 같은 기본값을 갖는다.
- 세 훅의 반환을 강제로 맞추지 않고, `stage`·`error` 의 실제 계약이 다르다는 사실을
  타입으로 드러낸다(`use-dev-image-upload` 는 `reading`·`compressing` 을 못 낸다).
- `MAX_UPLOAD_BYTES` 는 외부 소비처가 0 이므로 export 에서 뺀다.

### Phase 4 — 공개 화면

**C19 · `[REFACTOR] 수상 목록·상세를 공용 컴포넌트로`** (ARCH-A-05, 높음)

- `src/components/AwardList.tsx`(+짝 CSS)가 `{awards: {id, year, name, place?}[], label, onSelect}` 를
  받는다. `place` 는 호출부가 `string` 으로 만들어 넘긴다(개발은 `pickText` 후).
- `src/components/AwardDetailModal.tsx` 가 `{award, label, open, onClose, children?}` 을 받고
  개발의 `projectLink` 는 `children` 으로 주입한다.
- **CSS 13블록이 값 단위로 같고 클래스명만 다르다.** `MusicCareerView.module.css` 에 `@media` 가
  0개라 좁은 화면에서 음악 수상의 `place` 가 밀리는데 `DevCareerView.module.css:133` 의 보정이
  공용화로 함께 적용된다.
- `use-dev-tools.ts` 에 `LIST_DEV_AWARDS_TOOL` 을 추가한다. 음악 수상만 WebMCP 도구와
  챗봇 문맥 등록을 갖는 비대칭을 없앤다.

**C20 · `[REFACTOR] 오버레이 조립을 합성 훅으로`** (NEW-01, NEW-02, NEW-03)

- `src/hooks/use-dialog.ts` 에 `useDialog(open, opts)` 를 두고 focusTrap·scrollLock·escape·
  isolation·overlayLayer·mounted 조립과 `role="dialog"`·`aria-modal` 계약을 흡수한다.
  **scrollLock 옵션은 그대로 통과시킨다(D7)** — 여섯의 옵션이 실제로 다르므로 인터페이스를
  넓히지 않고 조립만 접는다.
- 6개 오버레이를 이관한다. `ImageLightbox`·`PhotoModal` 은 Escape 와 방향키가 한 리스너라
  키 처리는 그대로 두고 나머지 조립만 받는다.
- `useEscapeKey` 의 소비처 0인 `options.capture` 와 반환 `boolean` 을 지운다(NEW-02).
- **keydown 소유자 6벌의 타깃·페이즈 표를 훅 JSDoc 에 남긴다**(NEW-03). `PhotoModal.tsx:296` 의
  `window` capture 가 다른 오버레이를 선점하는 것이 의도인지 우연인지를 그 자리에서 확정한다.
- 03 이 세운 접근성 계약이 회귀하지 않도록 `npm run test:e2e` 의 접근성 스위트를 함께 돌린다.

**C21 · `[REFACTOR] 상세 모달의 URL 쓰기 경로 단일화`** (ARCH-A-06 + A-07 + A-23 일부, NEW-04)

- `usePhotoDetailSession` 을 `useQueryModal` 위에 세운다. 두 훅이 같은 history 판정(`openRef`
  하이브리드)을 쓰게 한다. 지금 photo 쪽만 effect 로 갱신되는 boolean 이다.
- `openPhoto(id)` 를 유일한 쓰기 경로로 export 한다. `MapView.tsx:49` 의
  `router.push(\`${pathname}?photo=${id}\`)`와`PhotoTile.tsx:63-67`의 직접 URL 조작이 이걸
호출한다. 전자는 기존 query 를 통째로 버리는 유일한 구현이고`replace-current-url.ts:3-5` 가
  적은 금지 패턴이기도 하다.
- `src/constants/routes.ts` 에 `DETAIL_QUERY_KEYS = {photo, work, award, project}`.
  `features/analytics/_lib/analytics-query.ts:11` 의 `ANALYTICS_QUERY_ALLOWLIST` 도 여기서 파생시킨다.
- `PhotoTile.tsx`·`Chip.tsx` 에 `"use client"` 를 명시한다(정정 5).

**C22 · `[PERF] 앨범 상세의 모달 로딩과 직렬화량`** (ARCH-A-09)

- `AlbumDetailView.tsx:7` 의 정적 `PhotoModal` import 를 `OnDemandPhotoModal` 로 바꾼다.
  갤러리와 지도는 이미 `next/dynamic` 이고 앨범만 반대 방향이다.
- `albums/[id]/page.tsx` 의 사진 해석을 `features/albums/_lib/to-album-gallery-photos.ts` 로
  옮겨 투영본만 내린다. 지금 EXIF·좌표를 포함한 전체 `Photo[]` + 전체 `Tag[]` 가 직렬화된다.

**C23 · `[REFACTOR] 라우트에 남은 도메인 투영 이동`** (ARCH-A-10)

- `article-projection.ts` 에 `resolveArticleTagLabels`·`resolveRelatedProjectCards`.
  `dev/articles/[slug]/page.tsx:117`(`lang`)과 `:128`(`ko` 고정)이 같은 조인을 두 번 돈다.
- `features/albums/_lib/album-page-copy.ts` — `photo/albums/[id]/page.tsx:73-84` 의 ko/en 설명
  문자열이 라우트에 하드코딩돼 있다.
- `features/search/_lib/read-search-query.ts` — `search/page.tsx:56-57` 의 `?q` 배열 정규화.
- 선례가 이미 저장소에 있다(`toAlbumCards`·`toDevProjectCards`·`resolve-album-cover.ts`).

**C24 · `[REFACTOR] 지면 폭과 그리드 브레이크포인트 단일 출처`** (ARCH-A-28, A-24)

- `globals.css` 에 `--page-max: 1180px` 를 두고 17파일 18줄이 참조한다.
- 완전 동일한 9벌(`margin:0 auto` + `padding: var(--s-8) var(--s-6) var(--s-16)`)을
  `.u-page-main` 유틸 하나로 접는다. 계산값이 같아 시각 변화가 없어야 한다.
- `src/constants/breakpoints.ts` 의 `PHOTO_GRID_BREAKPOINTS` 를 `PhotoGrid.tsx:27-28`·
  `PhotoTile.tsx:74`·`AlbumCard.tsx:47` 셋이 참조한다.
- `PhotoGrid` 의 resize 리스너를 `PhotoModal.tsx:68-74` 가 쓰는 `useSyncExternalStore` +
  `matchMedia` 로 통일한다.
- **시각 회귀 커밋이다.** 같은 커밋에서 `npm run test:visual`.

**C25 · `[REFACTOR] 첫 문장 분리 승격과 스켈레톤 분할`** (ARCH-A-21 일부, ARCH-A-16, NEW-06)

- `src/lib/text/split-lead.ts` — `AboutView.tsx:38`·`MusicAboutView.tsx:43`·`DevAboutView.tsx:54`
  가 전부 `text.indexOf(". ")` 분리이고 주석이 복붙을 자백한다.
- `components/PublicPageSkeletons.tsx`(230줄, export 7개)를 `components/skeletons/` 아래
  파일당 하나로 나눈다. `components/` 의 다른 45개가 전부 "1파일 1컴포넌트 + 짝 CSS" 인데
  혼자 이탈했고, **사실상 barrel 로 동작해 `search/loading.tsx` 가 개발 스택 스켈레톤까지 끌고 온다.**
- `dev-blog` 의 `.sr-only` 로컬 3벌(폐기된 `clip: rect()`)을 전역 유틸로 교체한다(NEW-06).

### Phase 5 — 포인터 크롬 (D2 · 넷을 한 단계로)

**C26 · `[REFACTOR] CustomCursor 분해`** (ARCH-A-01, 높음)

`:91-660` 의 `useEffect` 하나에 가변 지역 변수 45개와 내부 함수 30개, 최소 다섯 책임이 있다.
props 0개인데 구현이 722줄이라 depth 가 아니라 은닉이고, 상태 전이가 effect 클로저에 갇혀
인터페이스로 관찰할 수 없다.

- `_lib/cursor-state.ts` — `createCursorState(cursorEl, anchorEl)` 이
  `{setVisible, setPressed, setLoading, setSnapped, setMode, setAccent, measure, draw}` 를
  돌려준다(현 `:133-396`). 순수 DOM 조작이라 jsdom 단위 테스트가 가능해진다.
- `_lib/auto-scroll-controller.ts` — 현 `:195-242, 493-531`. 이미 테스트된 `auto-scroll.ts` 의 소비자.
- `_lib/cursor-loading-registry.ts` — 로딩 id Set 과 타이머 둘. `utils/custom-cursor-events.ts` 와 짝.
- `_hooks/use-cursor-pointer-events.ts` — 리스너 17개 등록·해제만.
- `CustomCursor.tsx` 는 ref 둘과 위 넷의 조립으로 60줄 이하.

**C27 · `[PERF] 포인터 크롬의 관찰 범위와 조상 체인 캐싱`** (03 이월 UI-S-04, UI-S-12)

- `CustomScrollbar.tsx:197` 의 `mutationObserver.observe(document.body, {childList:true, subtree:true})`
  범위를 좁힌다.
- `CustomCursor.tsx:54,62-63` 의 휠마다 조상 체인 `getComputedStyle` 을 C26 이 만든 함수 경계
  안에서 캐시한다. 03-resolution 이 "프레임 비용이 측정되지 않았다" 고 적었으므로
  **수정 전후를 실측해 resolution 에 수치를 남긴다.**

**C28 · `[REFACTOR] 포인터 크롬 두 feature 통합`** (ARCH-A-12)

- `custom-cursor` + `custom-scrollbar` + `src/utils/custom-cursor-events.ts` 를
  `src/features/pointer-chrome/` 으로 합친다. 지금 둘이 import 없이 DOM 계약으로만 결합돼
  ESLint 도 dependency-cruiser 도 보지 못한다 — `cursor-target.ts:18-19` 가 스크롤바 소유
  셀렉터를 하드코딩하고 `CustomScrollbar.module.css:73` 이 커서 소유 변수를 소비한다.
- `_lib/pointer-chrome-contract.ts` 에 `DATA_CURSOR_SNAPPED`·`DATA_SCROLLBAR_UI`·
  `CURSOR_ACCENT_VAR` 상수와 계약 JSDoc.
- `eslint.config.mjs` 의 platform 패턴에 `pointer-chrome` 을 추가한다.
- `src/utils/` 는 이 파일이 유일한 항목이라 폴더가 사라진다.

### Phase 6 — 배치와 게이트

**C29 · `[REFACTOR] 법적 문서의 본문과 라우팅 분리`** (ARCH-A-15, NEW-08)

- `_lib/legal/{privacy,terms,accessibility}-{ko,en}.tsx` 6분할.
- **라우팅 4항목**(`LEGAL_DOCUMENTS`·`isLegalDocumentKind`·`LEGAL_DOCUMENT_KINDS`·
  `LEGAL_DOCUMENT_METADATA`, 약 60줄)을 `_lib/legal-registry.ts` 로 뺀다. 지금 `generateMetadata`
  한 줄을 고치려면 2,000단어짜리 본문 파일을 연다.
- JSX 를 갖는 파일이므로 `_lib/` 이 아니라 `_components/` 가 맞는 위치인지 함께 판단한다.
- ADR-0004·0006 이 개인정보 처리방침 갱신을 배포 조건으로 걸어 앞으로도 계속 손댄다.

**C30 · `[REFACTOR] 폴더 배치 정리`** (ARCH-A-17, A-21, A-13, CONV-02)

- `features/sentry-triage`(24파일 · 전부 `_lib/`) → `src/lib/sentry-triage/`. `lib/monitoring/` 과 이웃이 된다.
- `features/about` → `features/photo-about`.
- `hooks/use-chat-screen-target.ts` → `features/chat/_hooks/`,
  `hooks/use-typing.ts` → `features/landing/_hooks/`(테스트 동반). 소비처가 각각 1곳이다.
  **`use-register-chat-screen-target.ts` 는 소비처가 5곳이라 그대로 둔다**(실측).
- CONV-02: `features/gallery/_types/`·`features/map/_types/` 두 폴더를 규약(`_lib/`)에 맞춘다.
- `vitest.config.ts` 의 include 경로를 함께 고친다.

**C31 · `[FIX] 레이어 경계 게이트를 실제 폴더에 맞춘다`** (ARCH-A-20, CONV-03)

`eslint.config.mjs:56-58` 의 `shared` 패턴에 `lib` 이 없어 `src/lib/**` 가 어느 element type 에도
매칭되지 않고 `default: "allow"` 로 떨어진다. 존재하지 않는 폴더명 6개
(`stores|api|services|schemas|providers|i18n|styles`)도 들어 있다. `lib|mocks` 를 넣고 없는
폴더명을 뺀다. 현재 실제 위반은 0건이지만 게이트가 없다.

### Phase 7 — 챗 경로

**C32 · `[REFACTOR] 챗 요청 처리 분해와 오류 표현 정리`** (ARCH-A-02, SEC-05)

`handle-chat-request.ts:404-731` 의 async 함수 하나가 7단계를 순차 수행하고 주입 파라미터가
**11개**, 그 안의 `generateMessage`(`:558`)가 115줄 중첩 클로저다. 소스 731줄에 테스트
**1,267줄**이라 한 단계를 검증하려면 매번 전체 파이프라인을 세운다.

- `_lib/parse-chat-request-body.ts` — `(request) => Result<ChatRequest, {status, code, lang}>`
- `_lib/enforce-chat-quota.ts` — rate limit 과 문자 예산 판정
- `_lib/chat-request-deadline.ts` — abort/timeout 배선을 `{signal, timedOut, cleanup}` 으로
- `_lib/generate-chat-message.ts` — 클로저를 최상위 함수로 승격
- `handle-chat-request.ts` 는 넷을 잇는 60줄 오케스트레이터로 남는다.
- SEC-05: `ChatUpstreamError` 의 `kind` 4종 중 분기되지 않는 `invalid` 를 매핑에 넣거나 union
  에서 뺀다. `sse-stream.ts` 의 `MAX_STREAM_CHARS` 초과가 알 수 없는 실패와 같은 502 로 나가는
  것을 구분한다. **`ChatErrorCode` 22개를 클라이언트가 읽지 않는다는 사실을 확정하고,
  응답 계약에서 뺄지 클라이언트가 쓰게 할지 정한다.**
- SEC-06: `replaceRagDocuments` 의 `precomputedStaleIds` 위치 인자를 타입으로 묶거나
  `assertWithinDocumentLimit` 의 반환을 그대로 넘기는 형태로 바꿔 순서 의존을 없앤다.
- **기존 1,267줄 테스트가 무수정으로 통과해야 한다.** 통과하지 않으면 인터페이스가 바뀐 것이다.

### Phase 8 — 문서

**C33 · `[DOCS] 구조도·ADR·공개 화면 컨벤션`** (ARCH-D-10 잔여, NEW-07)

**앞의 모든 이동이 끝난 뒤에 쓴다.** C28·C30 가 폴더를 옮기므로 순서를 바꾸면 두 번 고친다.

- `vitest.config.ts:13` 의 "repository 조립 모듈은 firebase 를 끌고 오므로" 를 지운다.
  **존재하지 않는 근거가 커버리지 게이트를 실제로 좁히는 유일한 사례다.**
- CLAUDE.md 구조도 — 문서에 없는 feature **13개**(`chat`·`search`·`custom-cursor`·
  `custom-scrollbar`·`motion`·`monitoring`·`webmcp`·`site-footer`·`status`·`admin-maintenance`·
  `admin-shell`·`admin-global`·`sentry-triage`)를 이번 작업 결과 기준으로 반영하고,
  `src/` 최상위의 `assets/`·`instrumentation.ts`·`instrumentation-client.ts`·`proxy.ts` 를 더한다.
- **존재하지 않는 것을 지운다** — `features/export/`, `FRAME_STYLES`. 정정 7 에 따라
  Project Vision 과 스택 표의 "프레임 내보내기 · 클라이언트 canvas" 서술도 함께 다룬다.
- `docs/adr/0001-serverless-rag.md` 에 ADR-0005 로 대체됐다는 개정 표기를 단다(`:17-18` 이
  벡터를 Firestore `ragDocuments` 에 저장한다고 서술한다).
- **`docs/public-ui-conventions.md` 를 만든다**(NEW-07). 스크림 3층 서열, focus 소유권,
  `.sr-only` 기법, skip-link 네 규칙이 지금 `globals.css` 주석에만 산다. 관리자는 문서를 갖는데
  공개 화면은 없다. CSS 모듈의 `focus-visible` 47개 중 어느 것이 정당한 오버라이드인지도 여기 적는다.
- `CONTEXT.md` 에 이번에 생긴 용어(`pointer-chrome`, `useDialog`, `withAdminToken`)를 더한다.

**C34 · `[DOCS] 구조 검토 항목 처리 결과 문서 추가`**

`05-resolution.md`. 형식은 `02-resolution.md`·`03-resolution.md` 를 따른다. `humanizer` 스킬을
적용하고 `README.md` 표에 두 행을 더한다. 담을 것:

- 항목별 처리 결과표. **이미 해소 6건 · 04 흡수 4건 · 유지 판정 8건**의 근거를 각각 남긴다.
- §"보고서에서 정정한 것" 8건 + 실행 중 새로 드러난 것.
- **NEW-01~~14 · SEC-01~~08 의 처리 결과.** 리뷰 문서 밖에서 나온 항목이므로 어떻게 찾았는지를
  함께 적는다(`4c32af3..HEAD` 재대조).
- ARCH-A-04 의 실측(49 → 7 → 2)과 그에 따라 ARCH-A-22 의 전제가 사라진 경위.
- C27 의 프레임 비용 실측 수치.

---

## 항목별 판정 (ID 34개 + 흡수 2 + 이월 2)

| 항목                                      | 판정                                            | 커밋      |
| ----------------------------------------- | ----------------------------------------------- | --------- |
| ARCH-A-01 CustomCursor 722줄              | 수정                                            | C26       |
| ARCH-A-02 handleChatRequest 327줄         | 수정                                            | C32       |
| ARCH-A-03 관리자 CRUD 껍데기              | 04 흡수 (완료)                                  | —         |
| ARCH-A-04 useLang 리프 클라이언트화       | **유지** (실측 후보 2파일)                      | —         |
| ARCH-A-05 수상 목록·모달 복붙             | 수정                                            | C19       |
| ARCH-A-06 `?photo=` 쓰기 4벌              | 수정                                            | C21       |
| ARCH-A-07 useQueryModal 통합              | 수정                                            | C21       |
| ARCH-A-08 Escape 13곳                     | **완료** (03 `dadbf8d`, 7곳 이관·6곳 근거 기록) | —         |
| ARCH-A-09 앨범 상세 모달 로딩             | 수정                                            | C22       |
| ARCH-A-10 라우트의 도메인 투영            | 수정                                            | C23       |
| ARCH-A-11 AdminMonitoring 이동            | 04 흡수 (완료)                                  | —         |
| ARCH-A-12 커서·스크롤바 DOM 결합          | 수정                                            | C28       |
| ARCH-A-13 hooks 소비처 1곳 2개            | 수정                                            | C30       |
| ARCH-A-15 legal-documents 1,090줄         | 수정 (라우팅 분리 추가)                         | C29       |
| ARCH-A-16 PublicPageSkeletons             | 수정                                            | C25       |
| ARCH-A-17 sentry-triage 위치              | 수정 (`lib/` 로 이동)                           | C30       |
| ARCH-A-18 moveItem 5벌                    | 04 흡수 (완료)                                  | —         |
| ARCH-A-19 ko/en 필드쌍                    | 04 흡수 (18/30개소, 잔여는 04 후속)             | —         |
| ARCH-A-20 eslint shared 패턴              | 수정                                            | C31       |
| ARCH-A-21 about 이름 + split-lead 3벌     | 수정 (개명 + 승격)                              | C25 · C30 |
| ARCH-A-22 dictionary 640줄 분할           | **유지** (A-04 전제 소멸)                       | —         |
| ARCH-A-23 components 순수성 누수          | 수정 (대상 2파일)                               | C21       |
| ARCH-A-24 브레이크포인트 하드코딩         | 수정                                            | C24       |
| ARCH-A-25 검색 2분할                      | **유지** (이론적)                               | —         |
| ARCH-A-26 법적 문서 라우트                | **완료** (02 `c97f2de`)                         | —         |
| ARCH-A-27 on-demand 2층위                 | **유지** (이론적)                               | —         |
| ARCH-A-28 `max-width: 1180px`             | 수정 (토큰 + 유틸, 실측 17파일)                 | C24       |
| ARCH-D-01 디코더 2~3벌                    | **완료** (02 `c9f1997`)                         | —         |
| ARCH-D-02 서술자 단일 출처                | **완료** (02, `TableCollectionId`)              | —         |
| ARCH-D-03 mock/live 계약                  | 부분 수정 (2/3 지점. 셋째는 기각)               | C2        |
| ARCH-D-04 mergeRow 위치                   | 수정                                            | C3        |
| ARCH-D-05 이미지 파생본 4파일             | **유지** (이론적)                               | —         |
| ARCH-D-06 listCrud 인터페이스             | 수정                                            | C5        |
| ARCH-D-07 무검증 캐스팅                   | **완료** (02, 필드 리더)                        | —         |
| ARCH-D-08 site_documents 코덱             | **유지** (이론적)                               | —         |
| ARCH-D-09 캐시 태그                       | **완료** (02 BUG-S-15, 반대 방향)               | —         |
| ARCH-D-10 Firestore 잔재                  | 부분 수정 (`src/**` 는 01 완료, 문서·게이트만)  | C33       |
| ARCH-D-11 REST 클라이언트 2벌             | 수정                                            | C4        |
| ARCH-D-12 keywordSimilarity 죽은 코드     | 수정                                            | C7        |
| ARCH-D-13 포트 검사                       | **완료** (02 BUG-S-12)                          | —         |
| ARCH-D-14 lib 루트 평면 파일              | 부분 수정 (함수만 이동)                         | C7        |
| ARCH-D-15 buildRagChunks 부분성           | **유지** (이론적)                               | —         |
| ARCH-D-16 rag-source mock 미경유          | 수정                                            | C7        |
| ARCH-D-17 `cache()` 미적용                | **유지** (이론적)                               | —         |
| CONV-02 `_types/` 폴더 2개 (06 흡수)      | 수정                                            | C30       |
| CONV-03 boundaries 미감시 (06 흡수)       | 수정                                            | C31       |
| UI-S-04 스크롤바 관찰 범위 (03 이월)      | 수정                                            | C27       |
| UI-S-12 휠마다 getComputedStyle (03 이월) | 수정                                            | C27       |

수정 30 · 부분 수정 4 · 완료(선행 작업) 8 · 04 흡수 4 · 유지 8.

### 보고서 밖 항목의 배치

| 항목                                 | 커밋 | 항목                        | 커밋      |
| ------------------------------------ | ---- | --------------------------- | --------- |
| NEW-01 dialog 합성점 부재            | C20  | POST-05 검증 규칙 6벌       | C13       |
| NEW-02 useEscapeKey 죽은 인터페이스  | C20  | POST-06 삭제 확인 11벌      | C15       |
| NEW-03 keydown 규약 6벌              | C20  | POST-07 AdminFormShell 부재 | C16       |
| NEW-04 history 계약 분기             | C21  | POST-08 목록 셸 잔여 리터럴 | C17       |
| NEW-05 디코더 객체·배열 리더         | C6   | POST-09 죽은 인터페이스 3건 | C16 · C18 |
| NEW-06 `.sr-only` 로컬 3벌           | C25  | POST-10 행 CSS 중복         | C17       |
| NEW-07 공개 화면 컨벤션 문서 0       | C33  | POST-11 배관 2자리          | C16       |
| NEW-08 legal 책임 4개                | C29  | POST-12 NEW 경로 리터럴     | C17       |
| POST-01 블로그 이탈 가드 미연결      | C11  | POST-13 `void _id` 7벌      | C13       |
| POST-02 블로그 복구본 평행 구현      | C11  | SEC-01 관리자 게이트 5벌    | C8        |
| POST-03 dirty 배선 6벌               | C14  | SEC-02 Upstash 카운터       | C9        |
| POST-04 검증 오류 미표시             | C12  | SEC-03 본문 상한·죽은 분기  | C10       |
| SEC-04 API 오류 응답 5벌             | C10  | SEC-05 챗 오류 표현 4벌     | C32       |
| SEC-06 replaceRagDocuments 순서 의존 | C32  | SEC-07 로그아웃 절차 2벌    | C11       |
| SEC-08 초안 타이머 누적              | C7   |                             |           |

---

## 검증

**커밋마다**: `npm run check && npm run lint && npm run test:coverage && npm run deps:check`

**시각 변화 커밋**(C17·C24): 같은 커밋에서 `npm run test:visual` 후 스냅샷 갱신분 포함.
관리자 화면은 `test:visual` 이 보지 않으므로 `test:e2e:admin` 이 그 자리를 대신한다.

**추가 확인**

| 시점    | 무엇을                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------- |
| C3      | `npm run build` — `import "server-only"` 뒤 공개 fetcher 가 브라우저 번들에 남아 있으면 빌드가 잡는다 |
| C11     | `npm run test:e2e:admin` — 블로그 이탈 가드가 셸 링크 셋에서 실제로 걸리는지. 복구본 키 마이그레이션  |
| C12     | 이미지 없이 사진 저장·사진 없이 앨범 저장 시 오류 문구와 포커스 이동                                  |
| C16·C17 | `npm run test:e2e:admin` — 폼 셸·목록 셸 이관 회귀                                                    |
| C20     | `npm run test:e2e` 접근성 스위트 — 03 이 세운 focus·ESC·스크롤 잠금 계약                              |
| C21     | 지도·갤러리·앨범에서 사진을 열고 닫아 history 동작 확인. 정적 진입(`?photo=` 딥링크)도                |
| C24     | 320px·760px·1100px 세 폭에서 그리드 열 수                                                             |
| C26~C28 | `npm run test:e2e` — 자동 스크롤·스냅·로딩 표시                                                       |
| C32     | 기존 `handle-chat-request.test.ts` 1,267줄이 **무수정** 통과                                          |

**새 테스트가 고정할 계약**

| 대상                                | 고정할 것                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `publishedInOrder`                  | 초안 제외와 order 정렬. `content/*` 네 getter 가 같은 결과                     |
| `local-list-repository.remove`      | 없는 id 는 실패. live 와 같은 오류 조건                                        |
| `row-merge`                         | `data` 잔존값이 행 스칼라를 이기지 못한다                                      |
| `restFetch`                         | 헤더 조립(`apikey` 만), 재시도 on/off, `accessToken` 이 `Authorization` 으로만 |
| `sortableListCrud` / `documentCrud` | `devArticles` 에 `updateOrder`·`list` 가 **타입에 없다**                       |
| `decode/field` 새 리더              | `objects`·`readLinks`·타임라인이 형 불일치를 폴백으로 흡수                     |
| `withAdminToken`                    | throttled·unauthorized 응답 형태, 테스트 세션 우회 대상                        |
| `rate-limit/counter`                | 창 카운터의 첫 요청 TTL 설정, 일 버킷 경계, retry-after 초 계산                |
| `useDialog`                         | 여섯 조합이 같은 portal·ARIA 계약, scrollLock 옵션 통과                        |
| `usePhotoDetailSession`             | `useQueryModal` 과 같은 push/replace 판정. 한 틱에 두 번 열기                  |
| `FieldIssue` 유니온                 | 생산자 키와 `data-field` 가 어긋나면 `tsc` 실패                                |
| `useConfigDirty`(개명 후)           | baseline 유무 두 형태, 저장 후 dirty 해제, 언마운트 시 `setDirty(false)`       |
| `form-recovery` 흡수본              | 블로그 `version: 3` 계약과 `revive` 가 기존 복구본을 그대로 읽는다             |
| `AdminRow` confirm                  | 취소 시 `onDelete` 미호출, 조사(`을`/`를`) 선택                                |
| `AdminFormShell`                    | 오류 문단이 저장소 실패 전용, 복구 안내 렌더 조건                              |
| `split-lead`                        | 첫 문장 분리와 `". "` 가 없는 문자열                                           |

**수동 확인**

- 블로그 글을 편집하다 셸 워드마크·"사이트 보기"·로그아웃을 눌러 경고가 뜨는지(C11 전제).
- 기존 `ap-admin-dev-article-draft:v1:` 복구본이 C11 이후에도 복구되는지.
- 이미지 없이 사진을 저장했을 때 업로드 필드에 문구가 뜨고 포커스가 가는지(C12 전제).
