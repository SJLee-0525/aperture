# 관리자 CMS — 실행 계획

[04-admin-cms.md](04-admin-cms.md) 의 항목 전부에 판정을 붙인 실행 계획이다.
형식은 [03-plan.md](03-plan.md) 를 따르고, 처리 결과는 작업 완료 후 `04-resolution.md` 에 적는다.

**세는 단위**: 04 문서는 `###` 섹션 27개, 항목 ID 31개다(한 섹션이 ID 를 2~3개 묶은 곳이 있다).
아래 판정표는 **ID 31개 기준**이며, 여기에 05 에서 흡수한 4개를 더한다.

고치는 이유는 셋이다.

1. **데이터 손실 경로가 열려 있다.** `beforeunload` 는 저장소 전체에서 블로그 편집기 한 곳뿐이고,
   나머지 여섯 엔티티 폼과 다섯 설정 편집기는 dirty 상태 자체를 추적하지 않는다. 관리자가 한 명이라
   잃은 입력을 대신 복구해 줄 사람이 없다.
2. **개선의 절반이 6~7배 비용이다.** 목록 6쌍 · 수정 라우트 7쌍 · 허브 3쌍이 바이트 단위 복붙이라
   `KeyboardSensor` 한 줄, 한국어 `announcements` 한 벌, `role="alert"` 하나가 전부 여섯~일곱 벌이 된다.
   `docs/admin-ui-conventions.md:84` 가 "목록 셸 추출"을 후속 과제로 적어 둔 채 그대로다.
3. **그 복붙을 접을 때 회귀를 잡아 줄 그물이 없다.** `admin-*` 의 `_components`·`_hooks` 86파일 중
   테스트가 있는 디렉토리는 세 곳뿐이고, `admin-music-awards`·`admin-music-media` 는 `_lib/` 폴더조차 없다.

`README.md` 작업 순서의 4단계(관리자 CMS 복붙 해소)에 해당한다. **착수는 03-plan 완주 후**이며
브랜치는 `refactor/code-review-2` 를 이어 쓴다.

## 범위

04 문서의 31개 ID 전부와, `05-architecture.md` 의 **관리자 항목 4건을 이 계획이 흡수한다**.
UI-A-06/08/31 과 ARCH-A-03 은 같은 사실을 두 번 측정한 것이고, 나머지 셋도 관리자 파일만 건드린다.

| 흡수하는 05 항목 | 04 의 대응 |
| --- | --- |
| ARCH-A-03 관리자 CRUD 껍데기 6~7세트 (높음) | UI-A-06 · UI-A-08 · UI-A-31 |
| ARCH-A-19 ko/en 필드쌍 30개소 (중간) | UI-A-07 의 폼 CSS 원자와 같은 층 |
| ARCH-A-18 `moveItem` 5벌 (낮음) | 없음 (설정 편집기 공통) |
| ARCH-A-11 `AdminMonitoring` 이동 (낮음) | 없음 |

**범위 밖**: ARCH-A-05(공개 수상 목록·모달)는 `MusicCareerView`·`DevCareerView` 라 05 에 남는다.
`vitest.config.ts` 의 include→exclude 뒤집기는 06 문서 소관이며 여기서는 신규 파일만 include 에 더한다.

## 보고서에서 정정한 것

착수 전 코드로 재확인한 결과 04 문서의 사실 11개가 달랐다. 계획은 아래 확인값을 따른다.

| # | 보고서 서술 | 확인한 사실 |
| --- | --- | --- |
| 1 | 목록 컴포넌트는 6개 | **7개**다. `AdminDevArticlesList.tsx`(136줄)가 dnd 없이 같은 head·hint·loading·error·empty 골격을 쓰고 toolbar 를 얹는다. 셸을 2층으로 나눠야 이 화면도 받는다 |
| 2 | `use-ordered-admin.ts` 가 feature 안에 있다 | **이미 `src/hooks/use-ordered-admin.ts`(145줄, 테스트 보유) 공용 훅이다.** feature 별 `use-*-admin` 6개는 `items` 를 도메인 명사로 renaming 하는 17줄 쉼이고, 목록 컴포넌트 6벌의 **유일한 구조적 차이가 그 rename** 이다 |
| 3 | `globals.css` 에 `.sr-only` 가 없다 | **있다.** `globals.css:395-405`, 03-plan 의 C4(`10a985e`)가 넣었다. `clip-path: inset(50%)` 형태다. `.srLabel` 4벌(`TagRow`·`TimelineRow`·`LinkRow`·`ArticleTagManagerPanel`)은 지금 바로 접힌다 |
| 4 | `--text-4` 가 라이트 2.56:1 · 다크 3.07:1 | 03-plan 의 C5(`82bccba`)가 **라이트 `#8a8a93` · 다크 `#6f6f78`** 로 이미 올렸고 "본문 텍스트 금지" 주석도 `globals.css:107-109` 에 있다. 라이트는 3.42:1 이라 그래픽 3:1 은 통과, 본문 4.5:1 은 여전히 미달이다. 남은 일은 관리자 **15파일 18줄**의 용도 분류다 |
| 5 | 취소 시 Storage 삭제는 개발 프로젝트 폼만 | **세 곳이다.** `use-photo-editor.ts:73`, `use-work-editor.ts:54`, `use-project-editor.ts:115`. 그리고 그 삭제는 오작동이 아니다. `trackUploads` 가 `!initialPaths.has(path)` 일 때만 쌓으므로 지워지는 것은 이번 세션 업로드분뿐이고, 저장된 문서의 이미지는 남는다. 결함은 삭제 대상이 아니라 **묻지 않는다는 것**이다 |
| 6 | `.delete`·`.remove` 정의가 40건이라 문서 예외의 "13곳" 전제가 깨졌다 | **개수는 맞지만 비교 대상이 틀렸다.** 선언 줄 40개는 **20개 파일**에 파일당 두 줄(기본 + 의사 상태)로 들어 있다. 그리고 `docs/admin-ui-conventions.md:18` 의 "13곳"은 Row 소형 텍스트 액션을 묶은 서술인데 `*Row.module.css` 가 저장소에 정확히 **13개**다. 문서는 맞게 셌다. 전제가 깨진 진짜 근거는 20개 파일 중 **7개가 Row 가 아니라는 것**이다: `SelectedPhotoChip` · `ArticleForm` · `WorkForm` · `ProjectForm` · `PosterUploadField` · `DevImageField` · `TroubleshootingField`. 예외를 Row 로 한정해 적어 뒀는데 폼·필드·칩으로 새어 나갔다 |
| 7 | 수상·영상 폼은 훅·유틸 분리만 빠졌다 | 정규화도 없다는 결론은 맞지만 **"형제 폼 넷"이 아니다.** 저장 전 trim 을 하는 것은 둘뿐이다 — `prepareWorkInput`(`work-form-data.ts:42`, `ticketUrl`·`program`)과 `prepareProjectInput`(`project-form-data.ts:51`, `techTags`). `normalizeAlbumInput`(`album-form-data.ts:22`)은 이름도 다르고 `coverPhotoId` 보정만 하며, `photo-draft.ts` 에는 prepare 계열이 아예 없다. **검증도 갈린다** — `validateAlbumInput`(`:29`)·`validatePhotoInput`(`:80`) 둘만 `_lib` 에 있고, 나머지 넷의 인라인도 다시 두 갈래다: 훅 안(`use-work-editor.ts:61`·`use-project-editor.ts:122`)과 컴포넌트 안(`AwardForm.tsx:71`·`MediaForm.tsx:70`). 여섯 폼의 형태가 세 갈래다(D19) |
| 8 | `ImageMigrationPanel.module.css` 를 세 패널이 재사용 | `EmbeddingMigrationPanel` 은 **자체 `.module.css` 자체가 없고** 그 파일을 직접 import 한다(`:16`). 버튼이 하나뿐이라 `:last-child` 가 그 하나를 accent 로 만든다. `.panel` 의 `max-width: 760px` 도 문서의 {720, 860, 960} 밖이다 |
| 9 | (04 가 잡지 않음) | `RagStaleBanner.tsx:30,34` 의 `styles.detail`·`styles.later` 가 CSS 에 없어 `undefined` 로 렌더된다. 지금은 `.actions a`/`.actions button` 자손 선택자가 받쳐 화면이 정상이라 증상이 없다 |
| 10 | 테스트 공백 24디렉토리 61파일 | 확정. 덧붙여 **`admin-music-awards`·`admin-music-media` 는 저장소에서 테스트가 0인 유일한 두 feature** 이고 `_lib/` 폴더 자체가 없다. UI-A-23 과 같은 뿌리다 |
| 11 | Row 8벌이 공통 6블록을 공유한다 | **여섯만 완전 일치다.** `.handle` 3규칙 + `.badge` 3규칙을 다 가진 것은 `Photo`·`Album`·`Work`·`Award`·`Media`·`Project` 여섯이고, `TagRow` 는 `handle` 만(공개 배지 없음), `ArticleRow` 는 `badge` 만(핸들 없음, `:disabled` 포함 4규칙)이다. 셸은 두 블록을 **선택 사항**으로 받아야 한다(D2 단서) |

## 확정한 설계 결정

| # | 결정 | 근거 |
| --- | --- | --- |
| D1 | 04 와 05 의 관리자 항목을 한 계획으로 합친다 | UI-A-06/08/31 과 ARCH-A-03 이 같은 사실이다. 나누면 같은 파일을 두 번 연다 |
| D2 | 목록 셸을 **2층**으로 나누고 Row 셸은 핸들·배지를 선택 사항으로 받는다 | `AdminListShell`(head·hint·loading·error·empty·신규 버튼) 위에 `AdminSortableList`(DndContext·센서·announcements)를 얹는다. 정렬 목록 6개는 둘 다, `AdminDevArticlesList` 는 셸만 쓴다(정정 1). `AdminSortableRow` 는 `TagRow`(배지 없음)와 `ArticleRow`(핸들 없음)를 받아야 하므로 두 블록이 필수가 아니다(정정 11) |
| D3 | `use-*-admin` 쉼 6개를 지우고 목록이 `useOrderedAdmin` 을 직접 부른다 | 그 rename 이 여섯 목록의 유일한 구조적 차이다(정정 2). 없애면 셸 하나가 여섯을 그대로 받는다 |
| D4 | 이탈 가드는 **세 경로**를 덮되 `<Link>` 를 버리지 않는다 | `beforeunload`(새로고침·탭 닫기), 취소의 dirty confirm, 셸 헤더의 in-app 내비게이션 **3개 전부** — `AdminChrome.tsx:37` 워드마크 `Link`, `:41` 사이트 보기 `Link`, `:44` 로그아웃 `button`. 앞의 둘은 `onNavigate`, 마지막은 `onClick` 이다. 공유 상태는 Context 로 내린다 — Next 문서가 이 시나리오를 `link.md:1092` 「Blocking navigation」 절에서 그대로 권한다. 한계 셋(`:499-503`: 수식키 클릭·외부 URL·`download`)과 브라우저 뒤로가기 미보장은 훅 JSDoc 에 남긴다 |
| D4b | 설정 편집기의 링크형 취소를 **버튼으로 바꾸지 않는다** | 그 다섯은 raw `<Link>` 가 아니라 `AdminButton href=` 이고, 링크 변형의 타입이 `Omit<ComponentProps<typeof Link>, "aria-disabled">`(`AdminButton.tsx:16-17`)라 `onNavigate` 가 지금도 통과한다. 구현도 `linkRest` 를 `<Link>` 에 그대로 펼친다(`:48-55`, `onClick` 만 감싼다). 버튼으로 바꾸면 prefetch 와 중클릭·새 탭이 사라지고 다섯 컴포넌트에 `useRouter` 가 들어가며, 같은 관리자 안에 이탈 가드가 두 방식으로 공존한다. Context 가 감싸면 호출부 변경이 0에 가깝고 D4 와 결론이 같아진다 |
| D5 | 복구본을 11개 폼 전부로 넓히고 **새 키 접두사**를 쓴다 | `ap-admin-draft:v1:{collection}:{id}`. `ap-admin-` 을 통째로 쓸어내면 같은 접두사를 공유하는 mock CMS 저장소 10개가 함께 사라진다(`clear-admin-workspace.ts:14-16`). `clearAdminWorkspace` 가 새 접두사도 쓸어내게 확장한다 |
| D6 | 검증은 필드 인라인 + 첫 오류로 포커스 | 하단 `role="alert"` 한 줄은 저장소 실패 전용으로 남긴다. 마우스 사용자도 스크롤을 되짚지 않게 하는 것이 목적이다 |
| D7 | `AdminField` 를 `<div>` + 명시 `<label htmlFor>` + context 로 바꾼다 | **85개 호출부 전부가 `AdminInput` 을 감싸므로**(전수 확인) 라벨이 고아가 되지 않는다. 힌트를 `<label>` 밖으로 빼면 UI-A-11 이 같은 변경으로 닫힌다 |
| D8 | 정렬은 `KeyboardSensor` + 한국어 `announcements` | 핸들이 이미 `role="button"`·`tabIndex=0`·`aria-roledescription="sortable"` 을 받고 있어 낭독과 동작이 어긋나 있다. 위아래 버튼을 더하면 8개 행의 액션이 둘씩 늘어 다른 액션과 경쟁한다 |
| D9 | `AdminButton` 의 danger 는 **테두리형** | 안전한 확인 버튼이 primary 를 가져가 패널 설명문의 권장 순서와 시선 순서가 같아진다. 같은 모양이 `ArticleForm.module.css` 의 `.remove` 에 이미 있다 |
| D10 | 치수 문서에 **아이콘 2단계**를 신설한다 | 텍스트 버튼 44/40/36 은 그대로 두고 정사각 아이콘·칩 액션에 32(icon-md)·28(icon-sm)을 더한다. 26·30·18px 만 흡수한다. `.chipRemove` 는 24px 이상으로 올린다 |
| D11 | 사진 태그 삭제를 블로그와 같은 수준으로 잠근다 | `ArticleTagManagerPanel` 이 이미 `usedCount > 0` 이면 `disabled` 다. 두 화면의 안전 수준이 뒤집혀 있는 상태를 없앤다 |
| D12 | 배열 항목 삭제 confirm 은 **하위 항목을 품은 것만** | `StackGroupRow` 의 그룹 삭제와 `TroubleshootingField` 의 카드 삭제 둘이다. 단일 텍스트 항목까지 막으면 확인창이 잦아진다 |
| D13 | 업로드는 단계 노출 + 크기 사전 검사. 취소는 넣지 않는다 | `browser-image-compression` 은 signal 을 받지만 Storage 업로드 중단은 보장되지 않아 부분 취소가 된다 |
| D14 | 숨김 파일 input 3곳을 블로그 방식(`hidden` + 버튼 `.click()`)으로 통일한다 | 포커스가 실제 버튼에 보이고, 바이트 단위로 같은 clip 블록 3벌과 `docs/admin-ui-conventions.md:20` 의 예외 항목이 함께 사라진다 |
| D15 | `ROUTES` 에 NEW 상수 7종을 두고 취소는 진입 허브로 보낸다 | 태그·사진 설정 → `/admin/photo`, 음악 설정 → `/admin/music`, 개발 설정 → `/admin/dev`, 전역 설정 → `/admin`. 셸이 `newHref` 를 prop 으로 받으므로 한곳에서 읽힌다 |
| D16 | 커버리지 include 에 **이번에 만드는 파일만** 더한다 | 셸 하나가 일곱 호출부를 대표하므로 85% 임계값이 처음으로 관리자 쓰기 경로에 신호를 준다. include→exclude 뒤집기는 06 소관이다 |
| D17 | UI-A-27 의 320px 넘침은 **실측 후 판정**한다 | CSS 계산만으로 가로 스크롤을 단정한 것이 원 보고서의 약한 지점이었다. `MockModeBadge` 가 sticky 가 아니라는 사실은 실측 없이 확정되므로 그쪽만 먼저 닫는다 |
| D18 | 작업 순서는 CSS → 폼 계층 → 데이터 손실 → 목록 셸 → 접근성 | 목록 셸은 목록·수정 라우트·허브·Row 를 건드리고 데이터 손실은 폼을 건드려 겹치지 않는다. 다만 검증·이탈 가드는 UI-A-23(수상·영상 훅 분리)이 선행돼야 두 파일을 두 번 열지 않는다 |
| D19 | **여섯 엔티티 폼의 `_lib` 계약을 하나로 맞춘다** | 지금 형태가 세 갈래다(정정 7). C4 에서 `prepare*Input` 이름으로 통일하고 — `normalizeAlbumInput` → `prepareAlbumInput` 개명, `preparePhotoInput` 신설 — 검증도 여섯 곳 전부 `_lib/validate-*.ts` 로 뺀다. C7 이 `{field, message}[]` 로 바꿀 때 여섯을 같은 방식으로 고치고 테스트도 `_lib` 에 붙는다. 표준을 정하지 않으면 C4 가 갈래를 하나 더 만든다 |

## 실행 규약

03-plan 과 같다. 커밋 하나를 단위로 진행한다.

1. 한 커밋 분량의 수정을 끝낸다.
2. 네 게이트를 돌린다.

   ```bash
   npm run check && npm run lint && npm run test:coverage && npm run deps:check
   ```

3. 실패하면 원인을 찾아 고친다. 계획의 전제가 틀린 것으로 드러나면 계획을 고치고 그 사실을 기록한다.
4. 통과하면 `[TYPE] 한글 제목` 규약으로 커밋한다.
5. 새 공용 파일을 만든 커밋은 그 파일을 `vitest.config.ts` 의 `coverage.include` 에 **같은 커밋에서** 더한다(D16).

시각 변화가 있는 커밋(C3·C11·C16·C17·C18)은 그 안에서 `npm run test:visual` 을 돌려 스냅샷을 갱신하고
갱신분을 같은 커밋에 담는다. 셸을 이관한 C13·C14 뒤에는 `npm run test:e2e:admin` 을 함께 돌린다.

### 진행 방식 ★

**C1 부터 C23 까지 중간 승인 없이 끝까지 진행한다.** 커밋마다, 단계마다 멈춰서 확인을 받지 않는다.
게이트가 통과하면 곧바로 커밋하고 다음 커밋으로 넘어간다. 진행 상황은 작업이 끝난 뒤 한 번에 보고한다.

멈추는 경우는 셋뿐이다.

- 게이트 실패의 원인이 계획의 전제가 틀린 것이고, 어느 쪽으로 고칠지가 설계 판단인 경우.
- 계획에 없는 파괴적 동작(파일 대량 삭제, 마이그레이션 실행, 되돌릴 수 없는 데이터 변경)이 필요해진 경우.
- C22 의 320px 실측처럼 계획이 **실측 후 판정**이라고 미리 적어 둔 지점.

**`git push` 는 어떤 경우에도 하지 않는다.** 원격에 올리는 것은 이 작업의 범위 밖이며, 사용자가
직접 별도로 지시할 때까지 로컬 `refactor/code-review-2` 브랜치에만 커밋을 쌓는다. PR 생성도 하지 않는다.

## 커밋 계획

### C1 · `[DOCS] 관리자 CMS 검토 항목 실행 계획 추가`

`docs/review/2026-08-26/04-plan.md` 와 `README.md` 문서 표의 행 추가.

### Phase 1 — CSS 통합 (무위험 선행)

`diff` 가 0이거나 주석 한 줄인 것부터 접는다. 이 단계가 끝나야 나머지 구조 변경의 시야가 트인다.

**C2 · `[REFACTOR] 관리자 수정 라우트와 허브의 복제 CSS 통합`** (UI-A-06 일부)

- `app/admin/**/[id]/page.module.css` **7벌**(md5 `278598491e7bd6912267e76e2529056d`, 8줄)을
  `features/admin-shell/_components/admin-doc-state.module.css` 한 벌로.
- `app/admin/{photo,music,dev}/page.module.css` **3벌**(md5 `e648f798bd5ebf738e5f96f972c48bc4`, 75줄)을
  `admin-hub.module.css` 한 벌로. `app/admin/page.module.css` 는 `.cardLink`·`.badgeReady` 로 갈라져
  있으므로 C14 에서 함께 다룬다.

**C3 · `[REFACTOR] 관리자 목록·폼·Row CSS 원자 통합`** (UI-A-07, UI-A-08, UI-A-31)

- 목록 6벌(`Admin{Photos,Albums,MusicWorks,MusicAwards,MusicMedia,DevProjects}List.module.css`,
  `diff` 결과가 1번 줄 주석뿐)을 `admin-shell/_components/admin-list.module.css` 로.
  `AdminDevArticlesList.module.css` 는 그 위에 toolbar·filters 만 남긴다.
- 폼 스캐폴딩을 `admin-form.module.css` 로. `AlbumForm`·`AwardForm`·`MediaForm` 은 md5
  `7ebdb021cbd56960ca7b90e98fc78dc9` 로 76줄 완전 일치이고, `.section`/`.legend`/`.grid2`/`.actions`/
  `.error` 는 8벌, `.checkbox` + `.checkbox input` 은 7벌이다.
- Row 공통 블록을 `admin-row.module.css` 로. **필수 4블록**(`.row`·`.actions`·`.edit`·`.delete`)은 8벌
  전부가 갖고, **선택 2블록**(`.handle` 3규칙·`.badge` 3규칙)은 여섯만 갖는다(정정 11).
  `TagRow` 는 배지가, `ArticleRow` 는 핸들이 없으므로 이 둘을 필수로 뽑으면 없던 요소가 딸려 온다.
  `ArticleRow` 의 `.badge` 는 `:hover:not(:disabled)` 와 `.badge:disabled` 를 더한 4규칙이라 공용 쪽을
  그 형태로 잡고 여섯이 함께 쓴다(C20 의 공개 배지 가드가 같은 스타일을 필요로 한다).
  도메인 컬럼(`.count`·`.date`·`.year`·`.place`·`.ytId`)과 썸네일 치수만 각 파일에 남긴다.
- `.srLabel` **4벌**을 전역 `.sr-only` 로 교체한다(정정 3). 네 벌 모두 폐기된 `clip: rect(...)` 이다.
- 32×32 `.move` 5벌(`DevTimelineRow`·`InterviewRow`·`StackGroupRow`·`LinkRow`·`TimelineRow`)도
  `admin-row.module.css` 로 모은다.
- `.delete`/`.remove` 는 40줄 20파일이다. **Row 13개는 공용으로 접고, Row 가 아닌 7개**
  (`SelectedPhotoChip`·`ArticleForm`·`WorkForm`·`ProjectForm`·`PosterUploadField`·`DevImageField`·
  `TroubleshootingField`)는 문서 예외 밖이므로 각자 무엇이 필요한지 판단해 남기거나 접는다(정정 6).

### Phase 2 — 폼 계층

**C4 · `[REFACTOR] 엔티티 폼의 폼 데이터 계약 통일`** (UI-A-23, D19)

- `admin-music-awards/_hooks/use-award-editor.ts` + `_lib/award-form-data.ts`,
  `admin-music-media/_hooks/use-media-editor.ts` + `_lib/media-form-data.ts` 신설.
  훅 형태는 `use-work-editor`·`use-project-editor` 를 따른다.
- **여섯 폼의 `_lib` 계약을 하나로 맞춘다**(D19). 지금 세 갈래다(정정 7).
  - `prepareAwardInput`·`prepareMediaInput` 신설 (`place`·`youtubeId` trim).
  - `normalizeAlbumInput`(`album-form-data.ts:22`) → `prepareAlbumInput` 개명. `coverPhotoId` 보정은 유지.
  - `preparePhotoInput` 신설. 지금 `photo-draft.ts` 에는 prepare 계열이 아예 없다.
  - `prepareWorkInput`(`:42`)·`prepareProjectInput`(`:51`)은 이미 그 형태라 그대로 둔다.
- 검증도 여섯 곳 전부 `_lib/validate-*.ts` 로 뺀다. **인라인이 다시 두 갈래라 이동 거리가 다르다.**
  - `_lib` 에 이미 있음: `validateAlbumInput`(`album-form-data.ts:29`)·`validatePhotoInput`(`photo-draft.ts:80`).
  - 훅 안(1단 이동): `use-work-editor.ts:61`·`use-project-editor.ts:122`.
  - 컴포넌트 안(2단 이동): `AwardForm.tsx:71`·`MediaForm.tsx:70`. 이 둘은 훅을 새로 만들면서 동시에
    옮기므로 C4 작업량이 나머지보다 크다.
  반환 형태는 C7 에서 `{ field, message }[]` 로 바꾸므로 여기서는 위치만 옮긴다.
- `_lib/*.test.ts` 를 붙인다. 저장소에서 테스트가 0인 두 feature 가 여기서 사라진다(정정 10).

**C5 · `[REFACTOR] ko/en 필드쌍을 공용 컴포넌트로`** (ARCH-A-19)

- `src/components/LocalizedFieldPair.tsx`(+ 짝 CSS, 테스트). props 는
  `{label, value: LocalizedText, onChange, required?, multiline?, rows?}`.
  `AdminField`·`AdminInput` 과 같은 프리미티브 등급이라 `components/` 가 맞는 위치다.
- 15파일 30개소를 치환한다. `ProjectForm` 6, `WorkForm` 5, `AdminGlobalEditor` 3, 나머지 2 이하.
  `AwardForm.tsx:118-132`·`MediaForm.tsx:97-111`·`WorkForm.tsx:55-69`·`AlbumForm.tsx:54-68`·
  `PhotoForm.tsx:81-95` 다섯은 필드명 치환만 빼면 동일하다.

**C6 · `[FEAT] 관리자 필드 프리미티브에 힌트·오류·유효성 연결`** (UI-A-11)

- `AdminField` 를 `<div class=field>` + `<label class=label htmlFor>` + children + hint/error 로 바꾼다.
  `useId()` 로 만든 id 를 context 로 내리고 `AdminInput` 이 소비해 `id`·`aria-describedby`·
  `aria-invalid` 를 받는다. 명시 prop 이 context 를 이긴다.
- 호출부 85곳은 변경 없다(D7). `ArticleMetaFields.tsx:87-92,103` 의 안내 `<span>` 을 `hint` prop 으로 옮기면
  slug 입력의 접근 이름이 "주소 (SLUG)" 로 돌아온다.
- `AdminField.test.tsx`·`AdminInput.test.tsx` 에 접근 이름과 `aria-describedby` 계약을 고정한다.

**C7 · `[FIX] 엔티티 폼 검증을 필드 단위로`** (UI-A-04, UI-A-19, UI-A-20)

- C4 가 `_lib/validate-*.ts` 로 모아 둔 여섯 검증의 반환을 `string | null` 에서 `{ field, message }[]` 로
  바꾸고 편집 훅이 그 형태를 그대로 올린다.
  `AdminField` 가 해당 필드 아래 오류를 그리고, 제출 실패 시 첫 오류 필드로 포커스를 옮긴다.
  하단 `role="alert"` 문단은 저장소 실패 전용으로 남긴다(D6). 여덟 폼의 `noValidate` 는 유지한다.
- UI-A-19: `AwardForm` 의 `year` 를 문자열 상태로 두고 제출 시 파싱한다. `project-form-data.ts:12` 가
  이미 그 형태다. 지금은 연도 칸을 비우면 `Number("")` 가 `0` 으로 저장되고 `AwardRow.tsx:57` 이
  `award.year || "—"` 로 조용히 대시를 그린다. **`NaN` 이 저장된다는 원 보고서의 주장은 채택하지 않는다**
  (`type="number"` 의 값 위생 알고리즘상 `.value` 가 빈 문자열을 돌려준다).
- UI-A-20: `WorkForm.tsx:94-100` 의 `e.target.value ? patch(...) : null` 을 고쳐 빈 값도 반영한다.
  `AdminField label="공연 날짜"` 에 `required` 를 붙여 필수임을 화면에 나타낸다.

### Phase 3 — 데이터 손실

**C8 · `[FEAT] 미저장 이탈 경고를 전 관리자 폼으로`** (UI-A-02)

- `src/hooks/use-unsaved-guard.ts` 에 `beforeunload` 를 두고 `use-article-recovery.ts:66-67` 의 구현을
  옮긴다. `admin-shell` 에 dirty 레지스트리 context 를 두어 셸과 `AdminButton` 소비처가 같은 상태를 읽는다.
  Next 문서 `link.md:1092` 「Blocking navigation」 절이 같은 설계를 예제로 준다.
- 엔티티 폼 6종의 `취소` 는 dirty 일 때 confirm 을 거친 뒤 이동한다. 선례가
  `ArticleForm.tsx:66-72` 의 `cancelEditing` 이다.
- 설정 편집기 5종의 취소(`AdminTagsEditor.tsx:88`, `AdminSiteEditor.tsx:73`,
  `AdminMusicConfigEditor.tsx:134`, `DevConfigEditor.tsx:298`, `AdminGlobalEditor.tsx:167`)는
  **`AdminButton href=` 를 그대로 두고 `onNavigate` 를 넘긴다**(D4b). 마크업 변경이 없다.
- `AdminChrome.tsx` 의 in-app 내비게이션 **세 곳 전부**를 가드한다. `:37` 워드마크 `Link`(→ `/admin`)와
  `:41` 사이트 보기 `Link` 는 `<Link onNavigate>` + `preventDefault()`
  (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:453-476`,
  Context 레시피는 `:1092` 「Blocking navigation」), `:44` 로그아웃 `button` 은 `onClick` 이다.
  **워드마크를 빠뜨리기 쉬우니 셋을 다 센다.**
- 업로드를 소유한 세 훅(`use-photo-editor:73`·`use-work-editor:54`·`use-project-editor:115`)의
  `removeUnreferencedImages` 는 confirm 을 통과한 뒤에만 부른다. **삭제 범위는 바꾸지 않는다**(정정 5).
- 덮지 못하는 경로를 훅 JSDoc 에 남긴다. 브라우저 뒤로가기(App Router 에 API 없음), 그리고
  `link.md:499-503` 이 적은 `onNavigate` 의 한계 셋 — 수식키 클릭(새 탭이라 실질 문제 없음),
  외부 URL, `download` 속성.

**C9 · `[FEAT] 폼 자동 복구본을 전 관리자 폼으로`** (UI-A-16)

- `src/lib/admin/form-recovery.ts` 신설. `dev-article-recovery.ts` 의 계약을 그대로 이식한다 —
  버전 필드, TTL 7일, 미래 타임스탬프 거부(`savedAt > now`), 쓰기 실패를 예외로 올리지 않기,
  `Pick<Storage, ...>` 로 좁힌 저장소 포트.
- `constants/storage-keys.ts` 에 `ADMIN_FORM_DRAFT_KEY_PREFIX = "ap-admin-draft:v1:"` 와
  `adminFormDraftKey(collection, id)` 를 더한다. mock CMS 저장소 10개와 접두사가 겹치지 않게 한다(D5).
- `clear-admin-workspace.ts` 가 새 접두사도 쓸어내게 확장하고 `clear-admin-workspace.test.ts` 에
  계약을 더한다. **이걸 빼면 로그아웃 뒤에도 미저장 콘텐츠가 남는다** — `1d32354` 가 블로그에서 막은 것과
  같은 문제다.
- 5초 디바운스 스냅샷과 진입 시 복구 제안 UI 를 11개 폼에 붙인다. dirty 지문은 C8 의 것을 공유한다.
- 블로그는 기존 키(`ap-admin-dev-article-draft:v1:`)를 유지하되 구현만 공용으로 옮긴다.
  `RECOVERY_VERSION = 3` 계약을 깨지 않기 위해서다.

**C10 · `[FIX] 파괴적 동작의 시각 무게`** (UI-A-09, UI-A-26)

- `AdminButton` 에 `variant="danger"`(테두리형, D9) 추가 + 테스트.
- 유지보수 패널 3곳을 `AdminButton` 으로 옮긴다. `ImageMigrationPanel.module.css:68-72` 의
  `.actions button:last-child` 를 걷어내고, `min-height: 42px`·`36px`·`cursor: wait` 도 함께 사라진다.
  `ArticleOrphanImagePanel` 은 `삭제 대상 다시 확인` 이 primary, `확인 후 삭제` 가 danger 다.
  `EmbeddingMigrationPanel` 은 자체 CSS 가 없으므로 import 를 함께 정리한다(정정 8).
- `RagStaleBanner.tsx:30,34` 의 죽은 `styles.detail`·`styles.later` 참조를 실제 클래스로 잇는다(정정 9).
  **`RagStaleBanner.module.css` 는 소비자가 둘이다** — `RevalidateFailureBanner.tsx:5` 가 같은 파일을
  import 한다(정정 8 과 같은 패턴). 지금 쓰는 클래스는 `banner`·`message`·`error`·`actions`·`sync` 뿐이라
  무관하지만, `.detail`·`.later` 를 더하며 `.actions a`·`.actions button`(`:33-34`)을 건드리면 그쪽
  버튼도 함께 움직인다. 두 화면을 같이 확인한다.
- Row 8곳의 `수정`/`삭제` 를 정지 상태에서 구분한다. `.delete` 의 danger 색을 hover 전용에서 걷어낸다.
- `docs/admin-ui-conventions.md` 의 프리미티브 예외 목록에서 유지보수 패널 관련 서술을 정리한다.

**C11 · `[FIX] 삭제 전 확인 절차`** (UI-A-05, UI-A-17)

- `StackGroupRow.tsx:91-93` 그룹 삭제와 `TroubleshootingField.tsx:76-78` 카드 삭제에 `window.confirm`
  을 붙인다. 나머지 10곳은 그대로 둔다(D12).
- `use-tags-admin` 이 사진 목록을 읽어 태그별 사용 수를 세고, `TagRow` 가 그 수를 표시하며
  사용 중이면 삭제를 `disabled` 로 잠근다. `ArticleTagManagerPanel` 과 같은 정책이다(D11).
  `TagRow.tsx:38-47` 의 "id 가 남을 수 있습니다" 경고 문구는 이 잠금으로 불필요해지므로 지운다.

### Phase 4 — 목록 셸

**C12 · `[REFACTOR] 관리자 목록 셸 추출`** (UI-A-06, UI-A-08, UI-A-31, ARCH-A-03)

```
features/admin-shell/_components/
  AdminListShell.tsx      head · hint · loading · error · empty · 신규 버튼
  AdminSortableList.tsx   DndContext · 센서 · SortableContext · 한국어 announcements
  AdminSortableRow.tsx    수정/삭제 + 선택적 드래그 핸들 · 공개 배지, 가운데 컬럼은 children
```

- `AdminSortableRow` 는 핸들과 배지를 **선택 사항**으로 받는다(정정 11). `TagRow` 는 배지가 없고
  `ArticleRow` 는 핸들이 없다. 배지에는 `disabled` 를 열어 두어 `ArticleRow` 의 `pinBusy` 와 C20 의
  공개 배지 가드가 같은 표면을 쓴다.
- 7개 목록을 이관한다. 정렬 6개는 두 층 다, `AdminDevArticlesList` 는 `AdminListShell` 만 쓴다(D2).
- `use-*-admin` 쉼 6개를 지우고 목록이 `useOrderedAdmin(getXRepository())` 를 직접 부른다(D3).
- 세 컴포넌트에 테스트를 붙인다. **여섯 호출부를 옮기기 전에 셸 테스트를 먼저 세운다** — 지금
  회귀를 잡아 줄 그물이 없다.
- 각 목록은 ~97줄에서 ~30줄로 준다.

**C13 · `[REFACTOR] 수정 라우트와 허브 셸 추출`** (UI-A-06, UI-A-28)

- `src/hooks/use-admin-doc-load.ts` 에 `useAdminDocLoad<T>(getRepository, id) => {doc, status, error}`
  (`alive` 가드 포함)와 `admin-shell/_components/AdminDocGate.tsx`(loading·missing·error 3분기).
  7개 라우트가 ~65줄에서 ~18줄로 준다. 드리프트 2건(`photos/[id]` 만 JSDoc 없음,
  `dev/articles/[id]:36-37` 만 `if/else` 대신 삼항)도 여기서 사라진다.
- `AdminHubGrid.tsx` 로 허브 3개 + 대시보드를 받는다.
- UI-A-28: `app/admin/page.tsx:12` 의 `href?: string` 을 필수로 바꾸고 `:67-73` 의 `곧 제공` 분기와
  `page.module.css` 의 비-ready `.badge` 스타일을 지운다. 다섯 항목 전부 `href` 를 갖고 있어 지금도
  렌더되지 않는 죽은 코드다.

**C14 · `[FIX] 정렬에 키보드 대체 수단과 한국어 안내`** (UI-A-01, UI-A-25)

- `AdminSortableList` 에 `KeyboardSensor` + `sortableKeyboardCoordinates` 를 더한다.
  `announcements` 와 `screenReaderInstructions` 를 한국어로 쓴다. 셸이 하나라 한 벌이면 끝난다.
- `npm run test:e2e:admin` 으로 이관 회귀를 확인한다.

### Phase 5 — 접근성과 문구

**C15 · `[FIX] 라벨 없는 입력과 탭 규약`** (UI-A-03, UI-A-12, UI-A-10)

- `TroubleshootingField.tsx:82-102`·`DevTimelineRow.tsx:56-75`·`InterviewRow.tsx:37-64` 의 `AdminInput`
  에 `aria-label` 과 `name` 을 붙인다. 형제 컴포넌트 `DevEducationRow.tsx:49,59,68` 이 이미 그 형태다.
- `PlaceField.tsx:104-119` 의 `role="tablist"` 를 `role="group"` + `aria-pressed` 로 바꾼다.
  `AdminDevArticlesList.tsx:70-81` 의 상태 필터가 같은 패턴이다. `useRovingListFocus` 는 ↑↓ 전용이라
  가로 탭에 맞지 않고, 실제 탭 패턴을 채우는 것보다 이쪽이 간단하다.
- `AlbumPhotoPicker.tsx:143-151` 의 raw `<input type="search">` 를 `AdminInput type="search" size="sm"`
  으로, `:189-195` 의 더 보기 버튼을 `AdminButton` 으로 바꾸고 `.search input` 자손 선택자를 없앤다.
  선례가 `AdminDevArticlesList.tsx:60-68` 이다. **`border-radius` 가 다르다는 원 보고서 근거는 채택하지
  않는다** — `--r-sm` 이 `0px` 이라 실제 모서리는 같다.

**C16 · `[FIX] 관리자 화면의 대비·포커스·헤딩·낭독`** (UI-A-14, UI-A-29, UI-A-22, UI-A-18)

- `var(--text-4)` 관리자 **15파일 18줄**을 전수 분류해 본문·힌트·slug 표시·드래그 핸들은 `--text-3`
  으로 올린다. 토큰 값은 C5 가 이미 올렸으므로 여기서는 용도 분류만 한다(정정 4).
- 숨김 파일 input 3곳(`PhotoUploadField.module.css:79-85`, `PosterUploadField.module.css:79-85`,
  `DevImageField.module.css:110-116` — 바이트 단위 동일, `DevImageField` 는 호출부가 둘)을
  `hidden` 속성 + 버튼 `.click()` 으로 바꾼다(D14). `ArticleCoverField.tsx:96`·
  `ArticleBodyEditor.tsx:140` 이 그 형태다. `docs/admin-ui-conventions.md:20` 의 예외 항목을 지운다.
- `app/admin/maintenance/page.tsx` 에 `<h1>데이터 관리</h1>` 를 두고 세 패널을 `h2` 로 내린다.
  지금은 `ImageMigrationPanel.tsx:54` h1 → `EmbeddingMigrationPanel.tsx:58` h2 →
  `ArticleOrphanImagePanel.tsx:136` h1 로 오르내린다.
- 설정 편집기 5곳의 `저장되었습니다.` 에 `role="status"` 를 붙인다. 이 화면들은 저장 후 이동이 없어
  그 문구가 유일한 성공 신호다. `ImageMigrationPanel.tsx:74,79` 가 이미 `aria-live="polite"` 다.

**C17 · `[FIX] 이미지 업로드 진행 상황과 크기 상한`** (UI-A-15)

- 세 업로드 훅의 반환을 **하나의 새 형태**로 맞춘다. 지금은 두 갈래다 —
  `use-image-upload:85`·`use-poster-upload:65` 가 `{process, pending, error}`,
  `use-dev-image-upload:99` 가 `{process, processBatch, pending, pendingCount, error}`.
  목표는 `{process, pending, stage, completed, total, error}` 이고, `pendingCount` 는 `completed`/`total`
  이 대신하므로 없앤다. `processBatch` 는 `use-dev-image-upload` 에만 남기는 선택 멤버다
  (갤러리 다중 업로드는 그 화면에만 있다). **어느 한쪽에 맞추는 것이 아니라 셋을 새 형태로 옮긴다.**
- `ImageMigrationPanel.module.css:39-52` 의 진행 막대를 재사용하고 세 업로드 필드에 `aria-live` 를
  붙인다. 지금은 `DevImageField.tsx:190` 한 곳뿐이다.
- 파일 선택 직후 크기 상한을 검사해 압축 전에 안내한다. `use-image-upload.ts:46-48` 주석이 4천만 화소
  사진에서 모바일 Safari 가 탭을 종료할 수 있다고 적어 둔 그 지점이다. 취소는 넣지 않는다(D13).

### Phase 6 — 정리

**C18 · `[FIX] 치수를 문서의 단계 안으로`** (UI-A-13)

- `docs/admin-ui-conventions.md` 치수 절에 아이콘 2단계(32 icon-md · 28 icon-sm)를 신설한다(D10).
- 30px 한 곳, 26px `SelectedPhotoChip` 두 버튼, 18px `ProjectForm.module.css:121-122` 의 `.chipRemove`
  를 흡수한다. `.chipRemove` 는 24px 이상으로 올린다.
- Row 의 `.edit`·`.delete` 에 `min-height` 와 좌우 패딩을 준다(현재는 폰트 줄 높이 약 17px).
- `docs/admin-ui-conventions.md:18` 의 예외 서술을 실제 범위에 맞춘다. "13곳"이라는 수는 맞고
  `*Row.module.css` 13개와 일치한다. 고칠 것은 예외가 Row 밖 7파일로 새어 나갔다는 사실이며,
  C3 에서 그 7개를 어떻게 처리했는지에 맞춰 서술을 다시 쓴다(정정 6).
- **WCAG 2.5.8 위반이라는 단정은 채택하지 않는다.** 2.5.8 에는 간격 예외가 있어 24px 원이 인접 타깃과
  겹치지 않으면 통과할 수 있다. "여유가 없는 치수"로 기록한다.

**C19 · `[FIX] 신규 경로 상수와 취소 목적지 통일`** (UI-A-24)

- `ROUTES` 에 `ADMIN_MUSIC_WORK_NEW`·`ADMIN_MUSIC_AWARD_NEW`·`ADMIN_MUSIC_MEDIA_NEW`·
  `ADMIN_DEV_PROJECT_NEW` 를 더해 문자열 조합 4곳을 없앤다.
- 취소 목적지를 진입 허브 기준으로 맞춘다(D15). `AdminTagsEditor` 가 `/admin` 에서 `/admin/photo` 로 바뀐다.

**C20 · `[FIX] 공개 배지 연타 가드와 배열 추가 라벨`** (UI-A-21, UI-A-30)

- `use-ordered-admin.ts:107-128` 의 `togglePublished` 에 진행 중 재요청 가드를 더한다. 같은 훅의
  `reorder` 는 `reorderPendingRef`(`:71`), 블로그 고정 토글은 `pendingPinIds` 를 갖는데 공개 배지만 없다.
  `ArticleRow.module.css:64-67` 에 `.badge:disabled` 스타일이 이미 있다. `use-ordered-admin.test.ts` 에
  계약을 더한다.
- `LocalizedProjectListField.tsx:42` 에 `addLabel` prop 을 열고 호출부 셋(주요 기능·담당·성과)이 각자
  문구를 넘긴다. `TroubleshootingField.tsx:64`·`AdminMusicConfigEditor.tsx:53`·`DevConfigEditor.tsx:76,250`
  도 대상을 밝힌다.

**C21 · `[REFACTOR] moveItem 승격과 monitoring 이동`** (ARCH-A-18, ARCH-A-11)

- `src/lib/collection/move-item.ts` 로 승격하고 5곳을 치환한다. 원본은
  `admin-dev-config/_lib/edit-dev-config.ts:60-67`, 복사본이 `admin-global/_hooks/use-global-admin.ts:82-88`,
  `admin-music-config/_hooks/use-music-config-admin.ts:93-99`, 변형 2곳이
  `admin-dev-articles/_components/ArticleRelatedProjectsField.tsx:31`,
  `admin-dev-projects/_components/DevImageField.tsx:75`. `edit-dev-config.test.ts` 의 해당 테스트를 옮긴다.
- `features/monitoring/_components/AdminMonitoring.tsx`(31줄, 실질 6줄)를 `features/admin-shell/` 로
  옮기고 폴더를 없앤다.

**C22 · `[FIX] MOCK 배지 고정과 좁은 화면 상단 바`** (UI-A-27)

- `MockModeBadge` 를 `.bar` 아래 sticky 스택에 넣는다. 지금은 `.bar` 만 sticky 라 긴 폼을 스크롤하면
  MOCK 안내가 사라진다. 실측 없이 확정되는 부분이다.
- 320px 실측을 먼저 한다(D17). `.bar`(`AdminChrome.module.css:19-31`, `height: 60px` 고정)와
  `.brand`(`:33-42`, `--t-h3` display 폰트) 어디에도 `min-width: 0`·`overflow`·`text-overflow` 가 없다.
  실제로 넘치면 `:90-97` 의 모바일 미디어쿼리(`@media (max-width: 640px)`, 파일 끝)에 축소 규칙을
  더하고, 넘치지 않으면 유지 판정으로 기록한다.

### Phase 7 — 문서

**C23 · `[DOCS] 관리자 CMS 검토 항목 처리 결과 문서 추가`**

앞의 커밋을 전부 마친 뒤 `04-resolution.md` 를 쓰고 **단독 커밋**한다. 형식은 `02-resolution.md` 를
따른다 — 제목 줄에 브랜치·커밋 범위·변경 규모, 항목별 처리 현황 표, "리뷰와 달랐던 것", "후속 필요",
"검증" 순.

담을 내용은 넷이다.

- 판정표 31행의 실제 처리 결과. 계획과 달라진 것이 있으면 왜 달랐는지 남긴다.
- §"보고서에서 정정한 것" 11건에 실행 중 새로 드러난 것을 합친다. 특히 정정 6 처럼 보고서의
  숫자는 맞는데 비교 대상이 틀렸던 경우를 남긴다.
- 유지·이월 판정의 근거. UI-A-13 의 2.5.8 단정, UI-A-19 의 `NaN` 주장, UI-A-10 의 `border-radius` 근거,
  UI-A-27 의 실측 결과, 브라우저 뒤로가기 미보장.
- 검증 결과 수치. 테스트 통과 수, 커버리지 실측, 삭제된 줄 수.

`humanizer` 스킬을 적용한다. `README.md` 문서 표에 `04-plan.md`·`04-resolution.md` 두 행을 더하고,
`docs/admin-ui-conventions.md:82-84` 의 후속 과제 절에서 "목록 셸 추출"을 지운다.

## 항목별 판정 (ID 31개 + 흡수 4개)

| 항목 | 판정 | 커밋 |
| --- | --- | --- |
| UI-A-01 dnd-kit 키보드 대체 수단 | 수정 | C14 |
| UI-A-02 미저장 이탈 경고 | 수정 | C8 |
| UI-A-03 라벨 없는 입력 3곳 | 수정 | C15 |
| UI-A-04 검증 오류 필드 연결 | 수정 | C6 · C7 |
| UI-A-05 배열 항목 삭제 확인 | 부분 수정 (하위 항목 2곳만, D12) | C11 |
| UI-A-06 수정 라우트·목록 복붙 | 수정 | C2 · C12 · C13 |
| UI-A-07 폼 CSS 원자 재정의 | 수정 (`.sr-only` 는 이미 존재, 예외 근거는 정정 6 으로 교체) | C3 · C18 |
| UI-A-08 목록 셸 부재 | 수정 | C3 · C12 |
| UI-A-09 파괴적 버튼의 accent | 수정 | C10 |
| UI-A-10 앨범 사진 선택기 raw 입력 | 부분 수정 (`border-radius` 근거는 기각) | C15 |
| UI-A-11 힌트가 접근 이름에 흡수 | 수정 | C6 |
| UI-A-12 `role="tablist"` 에 tab 없음 | 수정 (`role="group"` + `aria-pressed`) | C15 |
| UI-A-13 치수 3단계 이탈 | 부분 수정 (아이콘 단계 신설, 2.5.8 단정은 기각) | C18 |
| UI-A-14 `--text-4` 대비 | 수정 (토큰은 C5 완료, 용도 분류만) | C16 |
| UI-A-15 업로드 진행 표시 | 부분 수정 (취소 미채택, D13) | C17 |
| UI-A-16 자동 초안 복구 | 수정 (11폼 전부) | C9 |
| UI-A-17 사진 태그 삭제 | 수정 (사용 중이면 잠금) | C11 |
| UI-A-18 저장 성공 미낭독 | 수정 | C16 |
| UI-A-19 연도 `Number("")` → 0 | 수정 (`NaN` 주장은 기각) | C7 |
| UI-A-20 공연 날짜 지우기 불가 | 수정 | C7 |
| UI-A-21 공개 배지 연타 가드 | 수정 | C20 |
| UI-A-22 유지보수 h1 두 개 | 수정 | C16 |
| UI-A-23 수상·영상 폼 분리 | 수정 (범위 확대 — 여섯 폼의 `_lib` 계약 통일, D19) | C4 |
| UI-A-24 신규 경로·취소 목적지 | 수정 | C19 |
| UI-A-25 dnd-kit 영어 안내 | 수정 | C14 |
| UI-A-26 삭제가 수정과 같은 무게 | 수정 | C10 · C18 |
| UI-A-27 좁은 화면 상단 바 | 부분 수정 (배지는 수정, 320px 는 실측 후, D17) | C22 |
| UI-A-28 대시보드 죽은 분기 | 수정 | C13 |
| UI-A-29 숨김 파일 input 포커스 | 수정 (블로그 방식 통일) | C16 |
| UI-A-30 배열 추가 라벨 | 수정 | C20 |
| UI-A-31 복붙과 테스트 공백 | 수정 | C3 · C4 · C12 · C13 |
| ARCH-A-03 관리자 CRUD 껍데기 | 수정 (흡수) | C2 · C3 · C12 · C13 |
| ARCH-A-19 ko/en 필드쌍 30개소 | 수정 (흡수) | C5 |
| ARCH-A-18 `moveItem` 5벌 | 수정 (흡수) | C21 |
| ARCH-A-11 `AdminMonitoring` 이동 | 수정 (흡수) | C21 |

## 검증

**커밋마다**: `npm run check && npm run lint && npm run test:coverage && npm run deps:check`.

**시각 변화 커밋**(C3·C11·C16·C17·C18): 같은 커밋에서 `npm run test:visual` 실행 후 스냅샷 갱신분 포함.

**셸 이관 뒤**(C13·C14): `npm run test:e2e:admin`.

**새 테스트가 고정할 계약**

| 대상 | 고정할 것 |
| --- | --- |
| `AdminListShell` · `AdminSortableList` | loading/error/empty/list 4분기, 빈 상태 CTA, `onReorder` 호출 인자 |
| `AdminSortableRow` | 핸들 접근 이름, 공개 배지 토글, 삭제 confirm 취소 시 미호출, **핸들 없이(ArticleRow)·배지 없이(TagRow) 렌더** |
| `prepare*Input` 6종 | 여섯이 같은 이름·같은 반환 계약. trim 대상과 보정 규칙 |
| `validate-*` 6종 | `{ field, message }[]` 반환, 필드 키가 실제 입력과 1:1 |
| `use-admin-doc-load` | `alive` 가드로 언마운트 후 setState 없음, missing/error 분기 |
| `use-unsaved-guard` | dirty 일 때만 `beforeunload` 등록, 언마운트 시 해제 |
| `form-recovery` | 버전 불일치·TTL 만료·미래 타임스탬프·쓰기 실패 각각의 반환 |
| `clearAdminWorkspace` | 새 draft 접두사는 지우고 mock CMS 키 10개는 남긴다 |
| `LocalizedFieldPair` | ko/en 두 입력의 접근 이름과 `required` 전달 |
| `AdminField` · `AdminInput` | `hint`·`error` 가 접근 이름이 아니라 `aria-describedby` 로 붙는다 |
| `AdminButton` danger | 클래스와 `disabled` 처리 |
| `use-ordered-admin` | `togglePublished` 진행 중 재요청 무시 |

**수동 확인**

- 320px 뷰포트에서 `/admin/dev/projects/{id}` 를 열어 상단 바 가로 넘침 여부 실측(C22 전제).
- mock 모드에서 긴 폼을 스크롤해 MOCK 배지가 화면에 남는지.
- 이탈 가드: 새로고침 / 취소 버튼 / 셸의 **워드마크·사이트 보기·로그아웃 셋 다**.
- 복구본: 입력 후 5초 대기 → 탭 강제 종료 → 재진입 시 복구 제안 → 로그아웃 후 재로그인 시 소멸.
