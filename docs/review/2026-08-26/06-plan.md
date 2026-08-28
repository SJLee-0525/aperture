# 규약·주석·테스트 — 실행 계획

[06-conventions-and-tests.md](06-conventions-and-tests.md) 의 항목 전부에 판정을 붙인 실행
계획이다. 형식은 [05-plan.md](05-plan.md) 를 따르고, 처리 결과는 작업 완료 후
`06-resolution.md` 에 적는다.

[README.md](README.md) 작업 순서의 **0단계(문서 예외)와 7단계(JSDoc 정리)**, 그리고 그 사이의
커버리지 게이트 뒤집기에 해당한다.

06 문서의 결론은 하나다. **구조적 규약은 무결점이고 문제는 서술 계층과 게이트에 있다.**
barrel 0건, hex 직박 0건, 레이어 역방향 0건, `TODO` 0건.
반대로 커버리지 임계값은 소스의 일부 위에서만 계산돼 항상 통과하고, `../` 금지와 barrel
금지를 강제하는 CI 규칙이 없으며, JSDoc **2,277건**이 TypeScript 가 아는 타입을 되풀이한다.

**05-plan 은 완주했다** (C34 = `c62b720`, 이후 지도·CSS 후속 6커밋으로 `94365c8`).
브랜치는 `refactor/code-review-2` 를 이어 쓴다.

---

## C1 재측정 — **완료** (`94365c8` 기준)

06 문서는 `5a9f279` 기준이고 현재 HEAD 는 **120커밋** 뒤다. 01~05 가 06 항목의 절반을
닫았고, 일부는 반대로 커졌으며, 처방이 틀린 것도 있었다.
**이 계획은 아래 값만 쓴다. 06 문서의 수치는 인용하지 않는다.**

### 05 가 닫은 것

| 06 항목 | 05 커밋 | 확인한 사실 |
| --- | --- | --- |
| CONV-02 `_types/` 2개 | C30 `9ea762e` | `find src -type d -name _types` → 0건 |
| CONV-03 boundaries 미감시 | C31 `576ddf8` | `shared` 가 `lib\|mocks` 포함. 없는 폴더명 6개 제거 |
| `vitest.config.ts:13` 거짓 주석 | C33 `9c9b98e` | firebase 근거 문장 삭제됨 |
| CONV-06 legal 1,090줄 | C29 `4b9ecb0` | 6분할. 최대가 `privacy-en.tsx` 383줄 |
| CONV-06 chat 731줄 | C32 `ef54a4e` | 300줄 초과 목록에서 사라짐 |
| CONV-06 CustomCursor 722줄 | C26·C28 | `features/pointer-chrome/` 로 통합 |
| CONV-07 구조도 | C33 | `FRAME_STYLES`·"프레임 내보내기"·`features/export`·`src/utils` 전부 0건 |
| CONV-07 액센트 색 3개 | 03 `f1c90d2` | `globals.css` 와 일치 |
| Firebase 주석 64줄/44파일 | 01 | **12줄 / 3파일.** 전부 06 이 "정당" 판정한 것 |
| `Modal.module.css:25` rgba | — | 이미 `var(--scrim)` |
| `<span>관리 →</span>` 4개소 | 04 | `AdminHubGrid.tsx:30` 1곳 |
| TEST-03 「디코더 두 벌」 | 02 + C6 | `lib/supabase/decode/` 한 벌 |

**E2E 주장 4건이 기각됐다.** 06 이 스스로 기각한 둘(308 redirects · 테마 토글)에 더해,
재측정에서 둘이 더 기각됐다.

- **LangMenu 전환** — `e2e/pages/locale.e2e.ts:156-168` 이 `menuitemradio` 클릭으로 양방향 단언.
- **`/photo/map` 핀→모달** — `photo.e2e.ts:179-181` + `photo.assertions.ts:30-37`(`openMapPhoto`)가
  `aside` 링크 → `?photo=` → `role=dialog` → 닫기를 단언. **지도 마커 자체만 미검증.**

### 살아 있는 것 — 확정 수치

| 항목 | 06 문서 | 현재 |
| --- | --- | --- |
| JSDoc `@param {` | 1,407 | **1,452** |
| JSDoc `@returns {` | 813 | **825** |
| 합계 | 2,220 | **2,277** |
| 그중 설명 없음 | 943 | **약 1,070** |
| 오배치 JSDoc | 2 | **4** |
| 관리자 JSX 한국어 리터럴 | 191 | **540** (106파일) |
| 관리자 파일 중 사전 import | — | **0개** |
| `.module.css` rgba | 45 / 15파일 | **30 / 14파일** |
| 계획 단계 참조 | 41줄 | **36줄** (조치 34) |
| 비유 (비테스트) | 8 | **9** |
| 비유 (테스트) | 5 | **7** |
| `admin-*` 테스트 0 | 24디렉토리 / 61파일 | **23 / 55** |
| `src/**` 비테스트·비mock·비`.d.ts` | 623파일 / 54,974줄 | **714 / 57,599** |
| `../` import (`src/**`) | 1 | **1** |
| barrel `index.ts` | 0 | **0** |
| `no-restricted-imports` 등 3종 | 없음 | **없음** |

### CONV-06 잔여 — 확정

05 가 상위 3개를 해소해 300줄 초과 목록의 얼굴이 바뀌었다.

| 줄 | 파일 | 판정 |
| --- | --- | --- |
| 644 | `constants/dictionary.ts` | **유지** (05 ARCH-A-22) |
| 624 / 503 / 337 | `mocks/{dev,dev-articles,photos}.ts` | **유지** — 데이터 |
| **612** | `photo-detail/_components/PhotoModal.tsx` | **분할** (C14) |
| 566 | `hooks/use-image-zoom.ts` | **유지** |
| 404 | `hooks/use-overlay-drag.ts` | **유지** |
| 383 / 365 | `legal/_lib/legal/privacy-{en,ko}.tsx` | **유지** — C29 산출물 |

`PhotoModal` 은 05 가 C20·C21·C22·C24 로 네 번 건드렸는데 607→612 로 늘었다.
훅 둘은 06 목록에 없던 새 발견이고, 핀치·휠·더블탭·팬이 같은 제스처 상태를 공유하며
테스트와 `coverage.include` 를 이미 갖췄다. 다음에 그 파일을 열 때 순수 계산을 `_lib` 로 뽑는다.

### 06 문서의 처방이 틀린 두 곳

**1. CONV-01 의 "실제 위반 2줄" 은 현재 0줄이다.** `Modal.module.css:25` 는 이미 고쳐졌고,
`AlbumCard.module.css:29` 는 오분류다. 그 줄의 `.count` 는 모달 스크림이 아니라 커버 사진 위에
절대배치된 "N장" 필 배지이고 `color: var(--text-inverse)` 로 항상 흰 글자다. `var(--scrim)`
(다크 0.7)으로 바꾸면 다크에서만 어두워지는 무의미한 차이가 생긴다.

대신 **정반대 분류에서 실제 후보 5건**이 나왔다. 사진 위가 아니라 테마를 따라야 하는 UI 색이다.

```
site-header/_components/MobileMenu.module.css:93       .scrim rgba(0,0,0,0.22)+blur(18px)
map/_components/LocationList.module.css:14             모바일 시트 box-shadow 0.16
photo-detail/_components/PhotoModal.module.css:196     ≤900px 바텀시트 box-shadow 0.28
photo-detail/_components/OnDemandPhotoModal.module.css:120   동일
components/RangeSlider.module.css:52                   thumb box-shadow 0.25
```

**2. TEST-05 의 처방("`browser-image-compression` 을 주입 가능하게")은 필요 이상이다.**
`compress.ts:15` 와 `lib/exif/extract.ts:75` 둘 다 함수 본문 안의 **동적 import** 라 `vi.mock` 으로
가로챌 수 있다. `FileReader`·`Image`·`canvas` 직접 사용은 네 파일 어디에도 없고(grep 0건),
`createImageBitmap` 은 `read-dimensions.test.ts` 가 이미 `vi.stubGlobal` 로 다루는 선례가 있다.
훅의 저장 경계도 이미 주입 가능하다 — 셋 다 `getAdminImageStore()` 를 함수 본문에서 부르고
mock 구현(`lib/admin/mock/mock-image-store.ts`)이 있다. **프로덕션 코드를 안 건드린다.**

### 근거가 사라진 항목 — 기각

**TEST-04 의 대표 케이스 서술.** 06 은 "`AUTH-05` 가 이 함수에서 실제 결함을 찾았다. 고치면서
테스트를 붙이는 것이 대표 케이스"라고 적었다. **01-plan D15 가 AUTH-05 를 기각했다.**
`require-admin-session.ts:8` 이 "role 은 다시 검사하지 않는다"를 결정으로 적어 뒀고, 계정이
관리자 하나뿐이라 "로그인했지만 admin 이 아닌" 상태가 없다.
**→ 결함 수정이 아니라 문서화된 결정을 테스트로 고정하는 작업이다.**

**CONV-04 의 "`../` 1건은 구조적 예외" 서술.** `tsconfig.json:22` 가 `"@/*": ["./src/*"]` 이고
`src/proxy.ts` 가 존재하므로 **`@/proxy` 로 표현된다.** `proxy-locale.test.ts:6` 의
`import { proxy } from "../../../proxy"` 는 예외가 아니라 그냥 위반 1건이다.
06 문서와 05-plan 이 같은 오해를 옮겨 적었다. **→ C5 에서 파일 예외를 두지 않고 import 를 고친다.**

### 05 가 남긴 구멍 하나

05-plan `:921` 이 「새 테스트가 고정할 계약」에 `row-merge`("`data` 잔존값이 행 스칼라를 이기지
못한다")를 적었으나 **`src/lib/supabase/row-merge.ts` 에 테스트가 없다.** 같은 표의 나머지
8건(`use-dialog`·`admin-gate`·`rate-limit/counter`·`mock-list`·`use-detail-query-session`·
`validate-rules`·`AdminFormShell`·`split-lead`)은 전부 있다. C7 이 흡수한다.

### 범위 밖 — Firebase 툴링 해체

`src/**` 에 firebase import 는 0건이지만 저장소 루트에는 `firebase` 12.17.1 · `firebase-tools` ·
`@firebase/rules-unit-testing` 세 패키지와 `firebase.json` · `firestore.rules` · `storage.rules` ·
`firestore.indexes.json` · `.firebaserc` · `test/security-rules.test.mjs` · `npm run test:rules`
가 남아 있다. 06 문서는 `src/**` 만 세서 이걸 놓쳤다.

**06-plan 범위에 넣지 않는다.** `docs/checklist/09-supabase-observation-teardown.md` §2.1~§2.4 가
이미 항목별로 소유하고 있고 **관찰 기간이 2026-08-29 에 끝난다.** 지금 당기면 롤백 경로
(Firebase 프로젝트 · Vercel 환경변수 · GCP 계정) 를 하루 먼저 없애는 셈이다. `src/` 에 남은
12줄은 데이터에 레거시 Storage URL 이 남아 있는 한 정당하고, 유일하게 게이트에 영향을 주던
`vitest.config.ts:13` 은 C33 이 이미 지웠다.

---

## 확정한 설계 결정

**D1 · 커버리지는 include 를 `src/**` 로 뒤집고 이중 임계값을 쓴다.**
vitest 4.1.10 의 `thresholds` 는 전역 값과 glob 키를 한 객체에 받는다.

```ts
thresholds?: Thresholds | ({ [glob: string]: Pick<Thresholds, ...> } & Thresholds)
```

같은 타입의 JSDoc 예제가 「전역 `functions`/`branches` + `'src/utils/**.ts'` glob 키」를 그대로
보여 준다. 공식 지원이다. (파일 경로는 번들 해시라 vitest 를 올리면 바뀐다. 근거는 이 타입
형태와 그 JSDoc 예제이지 경로가 아니다.)
단일 임계값으로 내리면 `_lib/` 139파일의 규율까지 풀리고, allowlist 를 유지하면 새 코드가
계속 게이트 밖에서 태어난다.

**D2 · glob 임계값은 전역 계산에서 빠지지 않는다.**
vitest 구현이 `// Global threshold is for all files, even if they are included by glob patterns`
주석과 함께 모든 파일을 `globalCoverageMap` 에 넣는다. **전역 임계값은 `_lib`·`lib` 을 포함한
전체 실측에서 잡는다.** glob 키는 `relative(config.root, file)` 로 매칭하므로
`"src/features/**/_lib/**"`·`"src/lib/**"` 형태가 맞다.

**D3 · 게이트 뒤집기를 테스트 추가보다 먼저 둔다.**
뒤집은 뒤라야 C7~C11 의 새 테스트가 처음부터 수치에 반영된다.
05 실행규약 5번("새 공용 파일을 같은 커밋에서 include 에 더한다")은 이 커밋으로 소멸한다.

**D4 · JSDoc `{Type}` 은 전량 정리하고 단독 커밋으로 낸다.**
설명 없는 약 1,070건은 삭제, 나머지 약 1,200건은 `{Type}` 만 벗기고 설명 유지.
TypeScript 가 타입의 출처라 위험이 0인데 diff 가 2,000줄대라 다른 변경을 전부 가린다.

**D5 · 주석 문체(대시 627줄·화살표 82줄)는 일괄 교정하지 않는다.**
원칙 5 는 "대시로 문장을 길게 잇지 않는다"이지 대시 금지가 아니다. 상당수가 `— 사진 전용`
같은 짧은 동격 표기다. 다른 이유로 이미 손대는 주석에만 적용한다.

**D6 · CONV-01 은 06 문서의 처방을 뒤집는다.**
사진 위 오버레이 25건이 정당하고 `AlbumCard.count` 가 그 분류다.
실제 조치 대상은 테마를 따라야 하는 UI 색 5건이다.

**D7 · TEST-05 는 주입 리팩터 없이 모듈 mock 으로 검증한다.**
동적 import 라 `vi.mock` 으로 충분하다. 프로덕션 코드를 안 건드리는 편이 회귀 위험이 없다.

**D8 · TEST-04 는 결함 수정이 아니라 계약 고정이다.** 01-plan D15 가 AUTH-05 를 기각했다.

**D9 · CONV-06 잔여는 `PhotoModal` 하나만 분할한다.**
06 이 명시한 대상이 그것이다. `use-image-zoom`·`use-overlay-drag` 는 06 목록에 없었고
단일 제스처 상태를 공유하며 테스트와 게이트를 갖췄다.

**D10 · CONV-07 은 별도 커밋을 두지 않고 문서 마감에 흡수한다.**
C33 이 거의 다 했고 남은 것이 `CLAUDE.md` 세 줄이다.

**D11 · 진행 방식은 04·05-plan 과 같되 중지점이 둘 있다.**
커밋마다 네 게이트, `git push`·PR 없음. 다만 **C13 과 C14 는 각각 착수 전에 멈춘다** —
사용자가 그 두 커밋을 다른 모델로 진행할 예정이다. C2~C12 는 중간 승인 없이 이어 간다.

---

## 실행 규약

1. 한 커밋 분량의 수정을 끝낸다.
2. `npm run check && npm run lint && npm run test:coverage && npm run deps:check`
3. 실패하면 원인을 찾아 고친다. 계획의 전제가 틀린 것으로 드러나면 계획을 고치고 기록한다.
4. 통과하면 `[TYPE] 한글 제목` 규약으로 커밋한다.

**C2~C12 는 중간 승인 없이 진행한다.** 그 구간에서 멈추는 경우는 둘 — 게이트 실패의 원인이
계획의 전제가 틀린 것이고 어느 쪽으로 고칠지가 설계 판단인 경우, 계획에 없는 파괴적 동작이
필요해진 경우.

**계획된 중지점 둘.** **C12 를 커밋한 뒤 C13 에 들어가기 전에 멈추고**, **C13 을 커밋한 뒤
C14 에 들어가기 전에 다시 멈춘다.** 사용자가 그 두 커밋을 다른 모델로 진행할 예정이다.
멈출 때는 직전까지의 게이트 결과와 다음 커밋이 건드릴 파일 목록을 함께 남긴다.

**`git push` 는 하지 않는다.** 의존성은 추가하지 않는다.

---

## 커밋 계획

### C2 · `[DOCS] 규약·주석·테스트 검토 항목 실행 계획 추가`

`docs/review/2026-08-26/06-plan.md` 와 `README.md` 문서 표의 행 추가. C1 재측정 값을 함께 적는다.

---

### Phase 1 — 규약 예외와 게이트

게이트를 먼저 세워야 이후 테스트 추가가 회귀 신호를 갖는다.

#### C3 · `[DOCS] 컨벤션에 문서화된 예외 두 줄을 더한다` (CONV-01, CONV-05)

코드 한 줄 안 고치고 **565건이 위반에서 사양으로 바뀐다.** `README.md` 작업 순서 0단계다.
CLAUDE.md 「컨벤션」 절에만 손댄다. 「디렉토리 구조」는 C33 이 이미 썼다.

- **스타일 항목**: 사진·이미지·영상 위 오버레이의 **테마 무관 고정색은 `rgba()` 직접 사용을
  허용한다.** 사진은 `[data-theme]` 을 따라 바뀌지 않으므로 토큰화하면 의도가 흐려진다.
  rgba 30건 중 25건이 여기 해당한다(`DetailHero` 6 · `ExifStrip` 4 · `PhotoTile` 2 ·
  `ImageLightbox` 2 · `YouTubeFacade` 2 · 스피너 border 3 · `AlbumCard.count` 등).
- **i18n 항목**: 관리자 화면(`/admin/*` · `features/admin-*`)의 UI 문자열은 사전을 경유하지
  않는다. 관리자는 본인 1명이고 한국어 고정이 합리적이며, 번역 대상이 없는 문자열에 간접층을
  더하지 않는다. **공개 화면은 100% 사전 경유를 유지한다.** 관리자 106파일 중 사전을 import
  하는 파일이 0개이므로 이 예외는 실태를 사양으로 승격하는 것이다.
- 두 예외의 **바깥**도 함께 적는다 — 테마를 따라야 하는 UI 색은 예외가 아니고(C4 가 처리),
  공개 화면 문자열은 예외가 아니다.

#### C4 · `[FIX] 테마를 따라야 하는 색을 토큰으로` (CONV-01 실제 조치)

C3 이 세운 예외의 반대편. 사진 위가 아니라 UI 표면인데 토큰을 안 쓰는 5건.

| 파일:줄 | 조치 |
| --- | --- |
| `MobileMenu.module.css:93` | `--scrim-soft` **신설**. `--scrim`(0.55/0.7)과 값 차이가 커서 재사용 불가 |
| `LocationList.module.css:14` | `--shadow-card` |
| `PhotoModal.module.css:196` | `--shadow-pop` |
| `OnDemandPhotoModal.module.css:120` | `--shadow-pop` |
| `RangeSlider.module.css:52` | `--shadow-card` |

같은 두 파일의 스피너 border(`PhotoModal:99`·`OnDemandPhotoModal:64`,
`rgba(255,255,255,0.18)`)는 **사진 위라 C3 예외에 속한다.** 건드리지 않는다.

토큰 값이 시각적으로 맞지 않으면 **토큰을 바꾸지 말고** 그 줄을 C3 예외로 분류하고 근거를
CSS 주석에 남긴다. 전역 토큰을 한 화면 때문에 조정하지 않는다.
`--scrim-soft` 신설은 C33 이 만든 `docs/public-ui-conventions.md` 의 스크림 서열에 반영한다.

#### C5 · `[FIX] import 규약에 CI 게이트를 붙인다` (CONV-04)

`../` 금지와 barrel 금지를 강제하는 것이 Claude Code hook 의 경고뿐이고 CI 는 검출하지 못한다.
`no-restricted-imports` · `import/no-internal-modules` · `boundaries/no-unknown` 셋 다 없다.

- **먼저 `src/features/lang/_lib/proxy-locale.test.ts:6` 의 `../../../proxy` 를 `@/proxy` 로 고친다.**
  `tsconfig.json:22` 가 `"@/*": ["./src/*"]` 이고 vitest alias 도 `@` → `./src` 이므로 해석된다.
  06·05 가 "alias 밖이라 표현 불가"라고 적은 것은 사실이 아니다. **파일 예외를 두지 않는다.**
- `eslint.config.mjs` 에 `no-restricted-imports` 로 `patterns: ["../*", "../**"]` 를 넣는다.
  위 수정 뒤 `src/**` 위반이 0이라 예외 목록 없이 켜진다.
- barrel 금지: `@/**/index` 경로 패턴을 같은 규칙에 더한다. `import/no-internal-modules` 는
  오탐이 크므로 실측 후 어느 쪽이 0오탐인지로 정한다.
- `boundaries/no-unknown` 을 켠다. C31 이 `shared` 에 `lib|mocks` 를 넣었으므로 이제 오탐이 없다.
- `e2e/**` 의 `../` 22건은 **규칙 대상이 아니다.** boundaries·import 블록이
  `files: ["src/**/*.{ts,tsx}"]` 로 한정돼 있고 e2e 는 `@/` alias 밖이다. 범위를 넓히지 않는다.

#### C6 · `[TEST] 커버리지 게이트를 exclude 기반으로 뒤집는다` (TEST-01)

06 이 든 유일한 "게이트가 실제로 좁혀진" 사례다. `coverage.include` 는 명시 allowlist 이고
04-resolution 실측이 94.6/87.8/94.2/96.5 로 여유가 10%p 넘게 남아 항상 초록이다.
04-resolution 후속 3번이 이 게이트를 06 에 넘겼다.

**게이트 밖에 테스트가 있는 영역**은 `lib/{monitoring,ai,cache,security,webmcp,seo}/**` 여섯과
`src/lib/supabase/**` 다. 06 문서가 함께 든 `lib/text`·`lib/auth` 는 **이미 include 안에 있고**
(`"src/lib/text/*.ts"` 글로브, `auth/` 는 `admin-auth-throttle`·`authorize-admin-token`·
`admin-gate` 세 파일 개별 등록), `lib/supabase/` 도 `decode/*`·`rest-client.ts`·`row-merge.ts` 는
이미 안에 있다. 뒤집기 효과를 과대평가하지 않도록 정확한 수치는 C6 실측으로 확정한다.

- `include: ["src/**/*.{ts,tsx}"]` 로 뒤집고 `exclude` 에 테스트 · `src/mocks/**` · `**/*.d.ts` ·
  `src/app/**/{layout,page,not-found,error,global-error,sitemap,robots}.tsx?` ·
  `instrumentation*.ts` · `src/proxy.ts` 를 넣는다. 라우트 껍데기는 CLAUDE.md 의 원칙
  ("app 은 fetch + features 조립")상 단위 테스트 대상이 아니다.
- **이중 임계값** (D1·D2).

  ```ts
  thresholds: {
    statements: <전체 실측>, branches: <전체 실측>,
    functions:  <전체 실측>, lines:    <전체 실측>,
    "src/features/**/_lib/**": { statements: 85, branches: 80, functions: 85, lines: 85 },
    "src/lib/**":              { statements: 85, branches: 80, functions: 85, lines: 85 },
  }
  ```

  **glob 에 걸린 파일도 전역 계산에 그대로 들어간다**(D2). 전역 값은 `_lib`·`lib` 을 포함한
  전체 실측에서 잡는다. 측정은 한 번이면 된다.
  `src/lib/**` 85% 가 즉시 실패하면 그 값을 실측치로 낮추고 C7~C9 가 끌어올린 뒤 다시 올린다 —
  **계획을 고치고 `06-resolution.md` 에 기록한다.**
- 05 실행규약 5번이 이 커밋으로 소멸한다. `06-resolution.md` 에 그 사실을 적는다.
- 지금 allowlist 에 있으면서 **테스트가 0인 파일**(`decode/{photo,dev,music,dev-article,site}.ts`,
  `row-merge.ts`)이 뒤집기 전후로 어떻게 잡히는지 확인한다. C7 의 대상이다.

---

### Phase 2 — 테스트 공백

게이트를 뒤집은 뒤라 새 테스트가 처음부터 수치에 반영된다.

#### C7 · `[TEST] 공개 읽기 경로의 디코더·fetcher 계약을 고정한다` (TEST-03)

CLAUDE.md 아키텍처 원칙 6 이 정한 공개 렌더 경로다. 여기가 잘못되면 공개 사이트 전체가 빈
화면이 된다. 06 의 "디코더가 두 벌" 서술은 낡았으나 **재측정에서 더 나쁜 것이 나왔다 —
`decode/*.ts` 는 `coverage.include` 에 글로브로 들어 있으면서 5개가 테스트 0이다.**
게이트 안에 있는 미검증 영역이다.

| 파일 | 고정할 계약 |
| --- | --- |
| `decode/photo.ts` | EXIF·좌표·dimensions 폴백. `data` 결손에 화면이 안 깨진다 |
| `decode/dev.ts` | `troubleshooting` 구형 평문 `{ko,en}` 하위호환 정규화 |
| `decode/music.ts` | works·awards·media 세 형태 |
| `decode/dev-article.ts` | `published_at` null 과 `pinned` |
| `decode/site.ts` | 문서 3종(`config`·`music`·`dev`) |
| **`row-merge.ts`** | **`data` 잔존값이 행 스칼라를 이기지 못한다.** 05 가 약속하고 빠뜨림 |
| `public/photo.ts` | `published=eq.true` + 서술자 `order` + **2차 키 `id.asc`** |
| `public/music.ts` | 세 컬렉션이 같은 게이트 |
| `public/dev.ts` | 목록·상세 published 게이트 |
| `public/site.ts` | `site_documents` 조회 |
| `public/retry-fetch.ts` | 재시도 조건·횟수, 재시도하지 않는 상태 코드 |

`paginateAll` 이 PostgREST `max_rows` 절단을 이어 읽는지도 fetcher 쪽에서 함께 고정한다.
전송 계층은 05 C3·C4 가 `server-only` 와 `restFetch` 로 정리해 뒀다(`rest-client.test.ts` 보유).
fetcher mock 은 그 경계를 따른다.

#### C8 · `[TEST] 관리자 세션 가드와 쓰기 경계를 고정한다` (TEST-04)

`src/lib/supabase/admin/` 아래 테스트는 `row-codec.test.ts` 하나뿐이다.

| 파일 | 고정할 계약 |
| --- | --- |
| `admin/require-admin-session.ts` | 세션 없음·`getSession` 오류에 던진다. **role 은 보지 않는다** |
| `supabase/auth.ts` | `isAdminUser` 가 `app_metadata.role` 만 본다 (원칙 2) |
| `admin/sort-rpc.ts` | `devArticles` 에 `updateOrder` 가 타입에 없다 |
| `supabase/photos.ts` 외 3 | 쓰기가 세션 가드를 먼저 부른다. 캐시 태그 무효화 대상 |

`require-admin-session` 은 결함 수정이 아니라 **문서화된 결정의 고정**이다(D8). JSDoc 이 적어 둔
"그런 계정이 생기면 `isAdminUser` 를 여기서 함께 확인해야 한다"는 조건도 테스트에 남긴다.

#### C9 · `[TEST] 업로드 파이프라인의 순서 계약을 고정한다` (TEST-05)

같은 폴더의 `asset-lifecycle`·`read-dimensions`·`run-limited`·`upload-progress` 에는 테스트가
있는데, 빠진 것이 하필 **아키텍처 원칙 3 의 핵심**이다. EXIF 추출은 압축 前에 일어나야 하고,
순서가 뒤집히면 촬영 정보가 전부 소실된다.

**프로덕션 코드를 바꾸지 않는다**(D7). `use-image-upload.ts:51-59` 가 이미 검증 가능하다.

```ts
const [exif, dimensions] = await Promise.all([extractExif(file), readDimensions(file)]);
setStage("compressing");
const compressed = await compressToWebp(file);
```

`extractExif`(`@/lib/exif/extract`)와 `compressToWebp`(`_lib/compress`)가 별개 모듈이므로
`vi.mock` 두 벌 + `getAdminImageStore` mock 하나로 `renderHook` 에서 순서를 단언한다.

| 파일 | 고정할 계약 |
| --- | --- |
| `_lib/compress.ts` | 3단 파생본(2048·960·320) 크기 인자와 webp 출력 |
| `_hooks/use-image-upload.ts` | **`extractExif` 가 `compressToWebp` 보다 먼저**다 |
| `_hooks/use-poster-upload.ts` | EXIF 없이 dimension→압축→업로드→DB |
| `_hooks/use-dev-image-upload.ts` | 동일 + 배치 동시성 `DEV_UPLOAD_CONCURRENCY = 3` |

**04-resolution 유지 판정 2번을 전제로 삼는다**: 업로드 취소는 구현하지 않았고
`browser-image-compression` 은 signal 을 받지만 Storage 업로드 중단은 보장되지 않는다.
취소 동작을 테스트로 고정하지 않는다.

#### C10 · `[TEST] E2E 가 비워 둔 계약 두 건` (TEST-06)

기각 4건을 뺀 실제 공백만 채운다.

- **앨범 상세 `photoIds` 순서** — CLAUDE.md 데이터 모델의 핵심 계약("앨범 내 사진 순서 =
  `photoIds` 배열 순서")이 **공개 화면**에 반영되는지. 관리자 드래그는
  `album-editor.e2e.ts:46-64` 가 보지만 공개 스펙은 0이다.
  `e2e/utils/assertions/photo.assertions.ts` 에 단언을 더하고 `e2e/pages/photo.e2e.ts` 에서 호출.
- **지도 마커** — `MapCanvas` 가 그리는 핀의 존재와 클릭. e2e 전체에서
  `pin|marker|maplibre` grep 0건이다. `e2e/pages/photo-map.e2e.ts` 에 `test.describe` 를 하나 더.

기존 헬퍼를 재사용하고 새 스펙 파일은 만들지 않는다. 데스크톱 전용 검증은
`test.skip(testInfo.project.name !== "desktop", "이유")` 관행을 따른다.
`docs/testing.md` 의 관찰 기록대로 **e2e 를 돌릴 때 빌드·유닛 테스트를 동시에 돌리지 않고**,
줄 번호가 아니라 테스트명으로 기록한다.

#### C11 · `[TEST] 설정 편집기 훅의 저장 병합 계약` (TEST-02)

05 Phase 3 이 복붙을 접은 결과 대상이 **23디렉토리 / 55파일**로 줄었고, 공용 파일 6개
(`useConfigDirty`·`form-recovery`·`AdminRow`·`AdminFormShell`·`FieldIssue`·`admin-gate`)의
테스트는 05 가 이미 붙였다.

남은 것 중 04-resolution 후속 1번이 지목한 **네 feature = 8디렉토리**를 대상으로 한다.

```
admin-global/_components(2)      · _hooks(1)
admin-music-config/_components(2) · _hooks(1)
admin-site/_components(1)        · _hooks(1)
admin-tags/_components(3)        · _hooks(1)
```

넷 다 설정 편집기이고 `_lib` 없이 훅과 컴포넌트만 있으며, 저장 병합 계약을 E2E 만 잡고 있다.
`docs/testing.md` 가 기록하듯 E2E 는 머신 부하에 따라 실행마다 소수가 실패하므로 유일한
안전망으로는 약하다.

**전제로 삼을 것 둘:**
- 04-resolution 유지 판정 1번 — 브라우저 뒤로가기는 App Router 에 막는 API 가 없어 보호되지
  않는다. 훅 JSDoc 에만 있는 계약이므로 테스트로 고정하지 않는다.
- 04-resolution 유지 판정 7번 — **블로그 편집기 CSS 는 공용 폼 골격에 합치지 않는다.**
  전폭 2단 + sticky 액션 바가 `docs/admin-ui-conventions.md` 의 의도적 예외다.

**나머지 15디렉토리(23 − 8)는 유지 판정**한다. 엔티티 폼·목록이고 05 가 만든 공용 셸 위에
얹혀 있으며 관리자 E2E 7스펙이 흐름을 잡는다. 근거를 `06-resolution.md` 에 적는다.

---

### Phase 3 — 주석

#### C12 · `[REFACTOR] 코드가 설명하지 않는 주석을 정리한다`

판단이 필요한 것만 모은다. 기계적 처리(C13)와 분리한다.

**오배치 JSDoc 4건.** 06 은 2건으로 셌으나 같은 클래스가 둘 더 있다.

- `components/Skeleton.tsx:13-20` — 설명이 헬퍼 `toSize`(`:21`)에 붙고 `Skeleton`(`:23`)은 비었다
- `admin-shell/_components/AdminChrome.tsx:18-24` — 같은 패턴. 내부 헬퍼
  `AdminChromeBar`(`:25`)에 붙고 export 되는 `AdminChrome`(`:68`)은 비었다
- `site-header/_components/MobileMenu.tsx:30-34` — 블록과 `const MobileMenu`(`:37`) 사이에 빈 줄 2개
- `admin-dev-articles/_lib/new-article-id.ts:3-12` — 어떤 선언에도 붙지 않고 떠 있다

앞 셋은 블록을 실제 선언으로 옮긴다. `new-article-id.ts` 는 파일 개요 의도이므로 `//` 블록으로
바꾸거나 `resolveNewArticleId`(`:21`)에 병합한다.

**범위를 넓히지 않는다.** JSDoc 닫힘 직후가 import 인 것이 6건 더 있으나
(`markdown-nodes.ts` · `monitoring/*` 3 · `webmcp/model-context.ts` · `types/webmcp.d.ts`)
전부 파일 개요 관행이고 저장소에 18건의 같은 형이 있다. 관행을 한 커밋에서 뒤집지 않는다.

**비유 — 비테스트 9줄.** CLAUDE.md 원칙 4 가 명시적으로 든 금지 표현만이다.

- `new-article-id.ts:4` — 붙들어 둔다
- `new-article-id.ts:8` — 주인을 잃는다
- `new-article-id.ts:15` — 붙들어 둔다
- `new-article-id.ts:36` — 붙들어 둔 / 놓아 준다 (한 줄에 둘)
- `ArticleBodyEditor.tsx:58` — 붙들어 둔다
- `use-article-editor.ts:146` — 놓아 준다
- `chat-response-contract.ts:126` — 회수한다
- `chat-response-contract.ts:140` — 회수한다
- `dev-article-sort.ts:11` — 가라앉으면

**앞의 둘(`:4`·`:8`)은 이 커밋이 옮기기로 한 오배치 JSDoc 블록(`:3-12`) 안에 있다.**
블록을 `//` 로 바꾸거나 `resolveNewArticleId` 에 병합하면서 표현도 함께 고친다.
따로 처리하면 블록만 옮기고 비유는 그대로 남는다.

**테스트 7줄.** `new-article-id.test.ts` 2 · `gemini-chat-provider.test.ts` 2 ·
`chat-provider-symmetry.test.ts` 1 · `openai-chat-provider.test.ts` 1 · `mock-image-store.test.ts` 1.
`it()` 제목과 그 위 JSDoc 이 섞여 있다 — 예를 들어 `gemini-chat-provider.test.ts:169` 는 주석이고
`:171` 이 제목이다. 프로덕션 주석과 같은 표현을 쓰므로 함께 고친다.

실제 상태와 결과로 바꾼다. **"사라진다" 계열 14건은 실제 데이터 손실을 뜻하므로 유지한다.**

**판단 변호 1건.** `chat-response-contract.ts:128` — `//` 가 아니라 `:125` 에서 시작하는
**JSDoc 블록 안**이다.

```
 * "본문 확정 + links/references 포기"가 "다 보여주고 오류"보다 항상 낫다.
```

무엇을 막는지로 바꾼다 — "링크 파싱이 실패해도 본문은 렌더한다."
**같은 블록의 `:126` 이 위 비유 대상이므로 두 항목이 한 블록에서 만난다.** 함께 고친다.

**계획 단계 참조 36줄 · 조치 대상 34줄.** CLAUDE.md 가 나쁜 예시로 든 문장("B5에서 새 저장소
경계를 얹는다")이 코드에 거의 그대로 있다.

**세는 패턴을 여기 고정한다** — 비테스트 파일의 주석 줄(`//` 또는 ` *` 로 시작) 중
`계획 §` · `\bB[0-9](\.[0-9])?\b` · `\bM[0-9]+\b` · `Phase [A-D]` 중 하나를 포함하는 줄, 파일:줄
중복 제거. 이 정의로 **36줄**이다(`계획 §` 24 + `B[0-9]` 8 + `M[0-9]` 2 + `Phase [A-D]` 3,
`mocks/music.ts:8` 이 "Phase B2" 로 두 패턴에 걸려 1건 중복). 다음 재측정이 흔들리지 않게
`06-resolution.md` 에도 같은 정의를 적는다.

사실 오류를 겸하는 **셋**이 우선이다.

- `constants/routes.ts:36` — "B4 에서 화면 구현". 이미 구현된 화면을 가리킨다
- `types/dev-article-tag.ts:6` — "B5 에서 별도 컬렉션이 된다". 이미 별도 컬렉션이다
- `mock-article-uploader.ts:7` — "B5 에서는 Storage 업로더가 들어온다". 이미 들어왔다

06 문서가 든 `dev-article-repository.ts:26`("B5 에서 감싸 끼운다")은 **05 가 그 파일을 손대며
사라졌다** — 해당 파일에 `B[0-9]` 0건이다. 대상에서 뺀다.

나머지 `B[0-9]` 참조 다섯은 사실 오류가 아니다. `use-dev-articles-admin.ts:24` 와
`dev-article-sort.ts:12` 의 "B5 이후에도 …" 는 미래가 아니라 유지 계약이고,
`dev-article-issue-message.ts:7`·`use-auth.ts:22`·`admin-list-repository.ts:5` 는 역사적 맥락이다.
단계 번호만 빼고 **현재 제약**으로 다시 쓴다. 근거 문장은 지우지 않는다.

**예외 2건은 남긴다.** 실존 문서를 인용하며 원칙 8("TODO에는 추적 대상을 적는다")에 부합한다.
05 C32 의 챗 분해로 한 건이 `handle-chat-request.ts` 에서 옮겨갔다.

- `features/chat/_lib/generate-chat-message.ts:157` — (checklist 08 M6 후속)
- `lib/ai/rag-search.ts:32` — (checklist 08 M6 기록)

테스트 쪽 `lib/ai/rag-search.test.ts:62` 에도 같은 인용이 있다. 위 36줄 집계(비테스트)에는
들어가지 않지만 같은 이유로 남긴다.

이 커밋에서 손대는 줄의 대시·화살표는 함께 정리한다. **손대지 않는 627줄은 건드리지 않는다**(D5).

#### C13 · `[REFACTOR] JSDoc 에서 타입 반복을 걷어낸다` — 단독 커밋

> **⛔ 착수 전 중지.** C12 를 커밋한 뒤 여기서 멈춘다. 사용자가 모델을 바꿔 진행한다.
> 넘길 것: C12 까지의 게이트 결과, 정규식 초안, 설명 없음 밀집 상위 파일 목록.

CLAUDE.md 는 "`@param`, `@returns` 도 타입을 그대로 반복한다면 생략한다"고 적었는데 코드베이스
전역이 반대다. 실측 **2,277건**, 그중 설명 없는 것 약 1,070.

- **삭제 약 1,070건** — `@param {Props} props` · `@returns {JSX.Element}` 처럼 타입 외에
  아무 정보가 없는 것.
- **`{Type}` 만 제거 약 1,200건** — 설명은 남긴다.
  `@param {unknown} value 문제 해결 목록.` → `@param value 문제 해결 목록.`

**정규식은 중첩 중괄호를 균형 파싱해야 한다** — `@param {Record<string, {a: b}>} x` 형태가 있다.
설명 없음 밀집 상위(`constants/routes.ts` · `admin-dev-config` 행 컴포넌트 4종 ·
`lib/i18n/locale-path.ts` · `components/Modal.tsx`)에서 먼저 돌려 정규식을 검증한다.

TypeScript 가 타입의 출처이므로 타입 안전성에 영향이 없다. **diff 가 2,000줄대라 반드시 단독
커밋이다.** 06 문서 스스로 "다른 작업이 끝난 뒤 단독 커밋이 맞다"고 적었다.

---

### Phase 4 — SRP 잔여와 문서

#### C14 · `[REFACTOR] 사진 상세 모달 분해` (CONV-06 잔여)

> **⛔ 착수 전 중지.** C13 을 커밋한 뒤 여기서 멈춘다. 사용자가 모델을 바꿔 진행한다.
> 넘길 것: C13 diff 규모, `PhotoModal.tsx` 의 현재 상태(관심사 경계), 05 가 이 파일에 남긴
> 계약(`useDialog`·`useDetailQuerySession`·`--page-max`).

`PhotoModal.tsx` **612줄**. 05 가 네 번 건드렸는데 607→612 로 늘었다. 한 컴포넌트에
라이트박스/바텀시트 분기(`MOBILE_QUERY` + `useSyncExternalStore`), 이미지 로드 상태 맵 2개
(`imageStatus`·`retryCounts`), 크롬 표시, 접힘 제스처(`COLLAPSE_TOUCH_THRESHOLD` ·
`CLOSE_WHEEL_THRESHOLD`)가 같이 있다.

- `_hooks/use-photo-modal-viewport.ts` — `matchMedia` 구독과 접힘/닫힘 임계값 판정
- `_hooks/use-photo-image-status.ts` — 로드 상태·재시도 맵 두 개
- 본체는 렌더와 조립만 남긴다.
- **`use-image-zoom.ts`(566)·`use-overlay-drag.ts`(404)는 유지**(D9). 근거를 `06-resolution.md` 에.

#### C15 · `[DOCS] 규약·주석·테스트 검토 항목 처리 결과 문서 추가`

**CLAUDE.md 세 줄** — C33 이 놓친 곳이다.

- `:210` `components/` 예시 목록이 여전히 `ExifList`·`MapPin`·`FrameCard`·`SectionHeading`·
  `WorkPoster`·`ProjectCard` 를 든다. **여섯 다 존재하지 않는다.** 실재하는 것으로 바꾼다 —
  `PhotoTile`·`Modal`·`Chip`·`ExifStrip`·`AwardList`·`AwardDetailModal`·`TimelineList`·
  `ShareButton`·`YouTubeFacade` 등.
- `:211-212` `lib/supabase/` 설명이 `client`·`auth`·`storage`·컬렉션별 쓰기·`list-crud`·
  `admin-list`·`rag` 일곱만 들고, `public/` 을 "transport.ts + 섹션별 디코더"로만 적는다.
  **02·05 가 추가한 `decode/`·`rest-client.ts`·`row-merge.ts` 가 빠졌다** — 하필 C7 이 그 셋에
  테스트를 붙이는 커밋이다. 일곱은 전부 실재하므로 지울 것은 없고 셋을 더한다.

그리고 `docs/review/2026-08-26/06-resolution.md` 신설, `README.md` 문서 표의 행 추가,
「작업 순서」 표의 0·7단계 완료 표기.

**06-resolution 에 적어야 할 것:**

- 06 항목 중 **01~05 가 이미 닫은 것**과 **06 이 실제로 한 것**의 구분
- C1 재측정 값 대 06 문서의 원 수치
- **06 의 처방이 틀렸던 세 곳** — CONV-01 의 `AlbumCard` 오분류, TEST-05 의 주입 리팩터 과잉,
  CONV-04 의 "`../` 는 구조적 예외" (실제로는 `@/proxy` 로 표현된다)
- **05 가 남긴 구멍 하나** — `row-merge` 테스트
- 커버리지 게이트 뒤집기 전후 실측치, 05 실행규약 5번이 소멸한 사실
- AUTH-05 기각으로 TEST-04 의 성격이 바뀐 사실
- 기각된 E2E 주장 4건(308 redirects · 테마 토글 · LangMenu 토글 · 핀→모달)
- 유지 판정 근거 — CONV-06 훅 둘, TEST-02 15디렉토리
- Firebase 툴링 해체를 checklist 09 §2.1 에 남긴 근거

---

## 항목별 판정 (ID 15개)

| ID | 판정 | 어디서 |
| --- | --- | --- |
| CONV-01 rgba | **처방 교체** — 사진 위 25건은 예외, 실제 조치는 UI 색 5건 | C3 · C4 |
| CONV-02 `_types/` | 05 가 처리 | 05 C30 |
| CONV-03 boundaries | 05 가 처리 | 05 C31 |
| CONV-04 import 게이트 | 수정. **"구조적 예외" 근거는 기각** | C5 |
| CONV-05 관리자 문자열 540건 | 문서 예외 | C3 |
| CONV-06 300줄 초과 | 상위 3개는 05. `PhotoModal` 만 분할, 훅 둘 유지 | 05 / C14 |
| CONV-07 구조도 | 05 가 거의 처리. 잔여 CLAUDE.md 세 줄 | 05 C33 / C15 |
| TEST-01 커버리지 게이트 | 수정 (이중 임계값) | C6 |
| TEST-02 관리자 CMS | 부분 수정 (8디렉토리). 15디렉토리 유지 | C11 |
| TEST-03 공개 읽기 경로 | 수정. `decode/` 5 + fetcher 5 + `row-merge` | C7 |
| TEST-04 세션 가드 | 수정 (**결함 수정 아님**) | C8 |
| TEST-05 업로드 | 수정 (**주입 리팩터 불필요**) | C9 |
| TEST-06 E2E | 2건으로 축소 (4건 기각) | C10 |
| 주석 문체 | 단계참조 34 · 비유 9+7 · 변호 1 · 오배치 4. 대시·화살표 유지 | C12 |
| JSDoc 2,277건 | 전량 정리 · 단독 커밋 | C13 |

---

## 검증

**커밋마다**: `npm run check && npm run lint && npm run test:coverage && npm run deps:check`

| 시점 | 무엇을 |
| --- | --- |
| C4 | 스크림·그림자를 라이트·다크 양쪽에서 확인. `test:visual` 갱신분을 같은 커밋에 |
| C5 | `@/proxy` 가 tsc·vitest 양쪽에서 해석되는지. lint 오탐 0 |
| C6 | 전체 실측치를 기록해 전역 임계값에 적는다. **뒤집기 전후 통과 테스트 수 동일**(2,507) |
| C7~C9 | `test:coverage` 로 새 테스트가 수치에 반영되는지 (C6 검증도 겸한다) |
| C10 | `test:e2e` 를 **다른 빌드·테스트 없이** 실행. 실패 시 총 소요 시간 먼저 확인 |
| C11 | `test:e2e:admin` — 새 단위 테스트가 E2E 계약과 어긋나지 않는지 |
| C13 | `npm run check` 만으로 충분. JSDoc 제거가 타입을 바꾸지 않는다 |
| C14 | `test:e2e` 사진 스위트 + `test:visual`. 아래 수동 항목 |

**새 테스트가 고정할 계약**

| 대상 | 고정할 것 |
| --- | --- |
| `decode/*` 5종 | `data` 결손 폴백. 구형 평문 하위호환. `published_at` null |
| `row-merge.ts` | `data` 잔존값이 행 스칼라를 이기지 못한다 |
| `public/*` 4종 | published 게이트 + 서술자 order + 2차 키 `id.asc`. `paginateAll` 절단 방지 |
| `public/retry-fetch.ts` | 재시도 조건·횟수, 재시도하지 않는 상태 코드 |
| `require-admin-session` | 세션 없음·오류에 던진다. **role 은 보지 않는다** |
| `auth.ts::isAdminUser` | `app_metadata.role` 만 본다 |
| `_lib/compress.ts` | 3단 파생본 크기 인자와 webp 출력 |
| `use-image-upload` | **`extractExif` 가 `compressToWebp` 보다 먼저**다 |
| `use-poster-upload` 외 1 | EXIF 없이 dimension→압축→업로드→DB. 동시성 3 |
| 설정 편집기 훅 4종 | 저장 병합, 저장 후 dirty 해제, 언마운트 시 `setDirty(false)` |
| 앨범 상세 e2e | `photoIds` 배열 순서가 **공개 화면** 순서다 |
| `photo-map.e2e.ts` | 지도 마커 렌더와 클릭 |

**수동 확인**

- 모바일 메뉴 스크림이 C4 이후 라이트·다크에서 각각 새 토큰 값으로 보이는지.
- C14 이후 지도·갤러리·앨범에서 사진을 열고 닫아 history 동작과 `?photo=` 딥링크가 유지되는지.
  320px·760px·1100px 세 폭에서 라이트박스/바텀시트 분기가 그대로인지.
- C6 이후 `test:coverage` 리포트에 `lib/{monitoring,ai,cache,security,webmcp,seo}/**` 와
  `src/lib/supabase/` 의 게이트 밖 파일들이 처음으로 나타나는지.
