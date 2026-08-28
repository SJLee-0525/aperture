# 관리자 CMS

이 섹션의 사용자는 한 명이다. 이성준 본인이고, 마우스와 시각을 쓴다. 회원가입이 없고 콘솔에서 만든 계정 하나만 존재하는 구조라, 공개 페이지에서 높음으로 잡히는 결함 상당수가 여기서는 무게가 달라진다. 스크린리더 전용 결함에는 지금 피해자가 없다. 라벨이 빠진 입력 옆에 시각 라벨 `<span>`이 붙어 있으면, 화면을 보는 사람에게는 아무 일도 일어나지 않는다.

바뀌지 않는 것은 데이터 손실이다. 관리자가 한 명이라는 말은 잃은 입력을 대신 복구해 줄 사람도 없다는 뜻이다. 그래서 심각도를 두 축으로 다시 매겼다. 보조기술 전용 결함은 낮음으로 내리고, 저장하지 않은 내용이나 Storage 파일이 사라지는 경로는 그대로 뒀다. 원 보고서가 높음으로 올린 UI-A-01(키보드 정렬 부재)과 UI-A-02(미저장 이탈 경고 부재)는 중간이다. 전자는 사용자가 마우스를 쓰기 때문이고, 후자는 사용자가 한 명이어도 336줄짜리 폼을 다시 채우는 비용은 그대로이기 때문이다.

잘 만들어진 부분은 분명하다. 블로그 편집기는 이 저장소의 참조 구현에 가깝다. 미저장 이탈 경고, 5초 디바운스 로컬 복구본, 발행 조건 미충족 시 저장 차단, 취소 시 확인까지 폼 UX가 갖춰야 할 것이 거의 다 있다. 문제는 그 수준이 나머지 여섯 개 엔티티 폼과 다섯 개 설정 편집기로 옮겨 오지 않았다는 점이다. 그리고 옮기기 어려운 이유가 코드 안에 있다. 목록 6종, 수정 라우트 7종, 허브 3종이 각각 바이트 단위 복붙본이라 한 겹을 얹으려면 같은 편집을 여섯 번에서 일곱 번 반복해야 한다. 아래 발견의 절반은 이 한 가지 사실에서 갈라져 나온다.

## 잘 되어 있는 것

1. **블로그 편집기의 폼 UX.** `use-article-recovery.ts:60-68`의 `beforeunload`, `:48-58`의 5초 디바운스 localStorage 스냅샷, `ArticleForm.tsx:83-104`의 복구 제안 UI, 발행 조건 미충족 시 저장 차단과 사유 목록(`ArticleIssueList`), `ArticleForm.module.css:263-272`의 sticky 액션 바, `ArticleForm.tsx:67`의 취소 확인이 전부 있다.

2. **정렬 저장 실패 롤백.** `use-ordered-admin.ts:88-102`가 낙관적 반영 후 실패하면 `reload()`로 authoritative 목록을 다시 읽고, 재조회마저 실패하면 이전 스냅샷으로 되돌린다. `reorderPendingRef`(`:71`)가 연속 드래그의 stale 경쟁도 막는다.

3. **MOCK 모드 안내가 실질적이다.** `MockModeBadge`가 셸 최상단에 `role="status"`로 상시 노출되고, 저장값이 이 브라우저에만 남는다는 것과 업로드 이미지가 새로고침하면 끊어진다는 것까지 구체적으로 적는다. 유지보수 패널 세 곳은 mock에서 버튼 자체를 잠그고 `NEXT_PUBLIC_USE_MOCK=0` 해법까지 안내한다.

4. **목록 삭제 확인 절차가 일관되다.** 8개 Row 전부 `window.confirm`에 대상 이름을 넣고, 결과 문구를 화면마다 다르게 적었다. 사진은 되돌릴 수 없다고, 앨범은 사진은 지워지지 않는다고 알린다. 미사용 블로그 이미지 삭제는 `confirmationToken`으로 삭제 직전에 같은 기준으로 한 번 더 검사한다.

5. **프리미티브 채택률과 focus 소유권 분리.** 범위 전체에서 raw `<input type="text">`는 `AlbumPhotoPicker.tsx:143` 한 곳뿐이다. `AdminButton.tsx:55,71`이 `data-admin-control`을 붙이고 `AdminChrome.module.css:8-17`이 `:not([data-admin-control])`으로 셸 규칙의 매칭 범위를 좁힌다. 특이성 경쟁이 아니라 매칭 범위로 나눈다는 문서 서술과 코드가 일치한다.

6. **낙관적 갱신의 경계 처리.** `use-dev-articles-admin.ts:92-118`은 저장 성공 후 재조회가 실패해도 되돌리지 않고 안내만 남기며, 응답 반영도 행 전체가 아니라 발행이 건드린 필드만 골라 덮어 진행 중인 pin 낙관값을 보존한다.

7. **잘못된 링크를 조용히 버리지 않는다.** `preparePublicLinks`(`lib/security/public-url.ts:105-117`)는 유효하지 않은 링크를 무시하는 대신 몇 번째 링크가 문제인지 짚어 예외를 던지고, `AdminGlobalEditor`와 `ProjectForm`이 이를 오류 문구로 보여 준다. 관리자 화면에 `robots: noindex`(`app/admin/layout.tsx:8-15`)가 걸린 것도 확인했다.

## 데이터를 잃을 수 있는 것

### UI-A-09 파괴적인 버튼에 accent가 칠해져 있다 (중간)

`ImageMigrationPanel.module.css:59-65`가 `.actions button`으로 유지보수 패널의 모든 버튼을 스타일링하고, `:67-71`이 다음 규칙으로 primary를 정한다.

```css
.actions button:last-child {
  color: var(--text-inverse);
  background: var(--accent);
  border-color: var(--accent);
}
```

DOM 순서만으로 강조 버튼을 결정한다. `ArticleOrphanImagePanel.tsx`가 같은 `base.actions`를 재사용하는데, 그 안에서 마지막 자식은 파괴적인 `확인 후 삭제`(`:148-154`)이고 앞선 형제가 안전한 `삭제 대상 다시 확인`(`:146-148`)이다. 결과적으로 파일을 실제로 지우는 버튼이 accent로 강조되고, 목록만 새로 읽는 버튼이 secondary 회색이다. 코드와 CSS를 직접 대조해 재현을 확인했다.

이 배치는 미사용 이미지 정리 화면에서 특히 나쁘다. 패널 설명문이 "먼저 삭제 대상을 확인할 수 있으며"라고 안내하는데, 화면이 시선을 끄는 쪽은 그 확인 단계를 건너뛴 버튼이다. 습관적으로 강조 버튼을 누르는 사용자는 안내와 반대로 움직이게 된다.

부수적으로 이 패널들은 `AdminButton`을 전혀 쓰지 않는다. `docs/admin-ui-conventions.md`의 프리미티브 미사용 예외 목록에 유지보수 패널은 없다. 높이도 `min-height: 42px`(`ImageMigrationPanel.module.css:60`)와 `36px`(`ArticleOrphanImagePanel.module.css:82`, `RagStaleBanner.module.css:35`)로 갈려 문서의 44/40/36 어디에도 맞지 않고, `.actions button:disabled { cursor: wait }`처럼 프리미티브와 다른 상태 표현도 섞여 있다.

고칠 것은 두 가지다. `:last-child` 선택자를 걷어내고 버튼 자신이 역할을 선언하게 바꾼다. 그리고 파괴적 동작에는 accent를 주지 않는다. `AdminButton`에 danger 변형을 추가하는 편이 세 패널을 한꺼번에 정리한다.

### UI-A-02 미저장 이탈 경고가 블로그 밖에 없다 (중간)

`beforeunload` 리스너는 저장소 전체에서 `use-article-recovery.ts:66-67` 한 곳뿐이다. 엔티티 폼 여섯 종과 설정 편집기 다섯 종은 dirty 상태 자체를 추적하지 않는다. 엔티티 폼의 `취소`는 확인 없이 즉시 `router.replace`하고, 설정 편집기의 `취소`는 `AdminButton href=...` 링크라 클릭하는 순간 이동한다(`AdminTagsEditor.tsx:89`, `AdminSiteEditor.tsx:74`, `AdminMusicConfigEditor.tsx:135`, `DevConfigEditor.tsx:299`, `AdminGlobalEditor.tsx:168`).

여기에 개발 프로젝트 폼만 한 겹이 더 있다. `use-project-editor.ts:114-117`의 취소는 라우터 이동 전에 이렇게 한다.

```ts
const cancel = async () => {
  await removeUnreferencedImages(uploadedPaths.current, []).catch(() => undefined);
  router.replace(ROUTES.ADMIN_DEV_PROJECTS);
};
```

두 번째 인자가 빈 배열이므로 이 세션에서 업로드한 커버와 갤러리 이미지가 전부 참조 없음으로 판정돼 Storage에서 삭제된다. `ProjectForm`은 336줄 화면이고, 이미지를 여러 장 올린 뒤 취소를 잘못 누르면 입력한 텍스트와 방금 압축해 올린 파일이 함께 사라진다. 되돌릴 경로가 없다.

새로고침, 탭 닫기, 셸 헤더의 `사이트 보기`나 `로그아웃` 클릭도 마찬가지로 아무 경고 없이 전부 버린다. `useArticleRecovery`의 `beforeunload` 부분을 `hooks/use-unsaved-guard.ts`로 승격해 전 폼이 공유하고, 취소는 dirty일 때만 확인을 거치게 한다. 설정 편집기의 링크형 취소는 `onClick` 가드가 가능한 버튼형으로 바꿔야 한다.

### UI-A-17 사진 태그 삭제가 사용 여부를 묻지 않는다 (낮음)

`TagRow.tsx:38-47`의 확인 문구는 "이미 이 태그를 쓰는 사진의 tags 배열엔 이 id 가 남을 수 있습니다"라고 경고한 다음 그대로 지운다. 관리자는 몇 장이 영향받는지 모른 채 결정해야 하고, 삭제 후 저장하면 사진들의 `tags` 배열에 사전에 없는 id가 남아 공개 필터 칩과 사진 데이터가 어긋난다.

같은 개념을 다루는 블로그 태그 패널(`ArticleTagManagerPanel`)은 정반대다. 태그마다 사용 건수를 표시하고 `usedCount > 0`이면 삭제 버튼을 `disabled`로 잠근다. 안전 수준이 두 화면에서 뒤집혀 있다. `use-tags-admin`에서도 사진 목록을 읽어 태그별 사용 수를 세는 것이 최소선이고, 정책을 맞추려면 블로그와 동일하게 잠근다.

### UI-A-05 폼 안 배열 항목 삭제에 확인이 없다 (낮음)

목록 Row의 삭제는 전부 `window.confirm`을 거치는데 폼 내부 배열 항목의 삭제는 12곳 모두 즉시 실행되고 되돌리기도 없다. 무게가 큰 두 곳은 `StackGroupRow.tsx:91-93`의 그룹 삭제(카테고리와 그 안의 기술 칩 전체)와 `TroubleshootingField.tsx:76-78`의 카드 삭제(제목·문제·해결·결과의 ko/en 8칸)다. 그룹 삭제 버튼은 위아래 이동 버튼 바로 옆에 붙어 있어 오조작하기도 쉽다.

완화 요인이 있다. 설정 편집기는 저장 전 상태이므로 새로고침하면 되돌아온다. 다만 화면이 그 사실을 알려 주지 않아 사용자 입장에서는 복구 가능성이 보이지 않는다. 하위 항목을 품은 삭제에는 확인을 붙이고, 단일 텍스트 항목은 되돌리기 링크가 있는 인라인 안내가 낫다.

## 폼과 입력

### UI-A-04 검증 오류가 필드와 연결되지 않는다 (중간)

`aria-invalid`와 `aria-describedby`는 관리자 범위 전체에서 0건이다. 모든 엔티티 폼이 검증 결과를 문자열 하나로 받아 저장 버튼 바로 위에 `<p role="alert">`로 그린다(`ProjectForm.tsx:319`, `PhotoForm.tsx:166`, `AlbumForm.tsx:115`, `WorkForm.tsx:235`, `AwardForm.tsx:169`, `MediaForm.tsx:157`). 여덟 개 폼 전부 `noValidate`라 브라우저 기본 안내도 없다.

이건 보조기술 전용 결함이 아니다. `ProjectForm`에서 "제목(한국어)을 입력하세요."가 뜨는 위치는 화면 최하단이고 문제의 입력은 최상단이다. 제출 실패 시 포커스를 옮기지도 않으므로 마우스 사용자도 스크롤을 되짚어 어느 칸이 비었는지 직접 찾아야 한다. `AdminField required`가 붙은 필드와 실제 검증 대상이 1:1로 대응하는데도 연결이 없다.

검증 결과를 `{ field, message }` 형태로 바꾸고 `AdminInput`에 `invalid` prop을 추가해 테두리 색까지 프리미티브가 소유하게 하면, 화면마다 다시 만들 필요가 없다.

### UI-A-11 힌트 문구가 입력의 접근 이름에 흡수된다 (낮음)

`AdminField.tsx:16`은 `<label>` 요소 하나로 라벨 span과 children을 함께 감싼다. `ArticleMetaFields.tsx:87-92`와 `:103`이 그 children 안에 안내 `<span className={styles.note}>`를 넣는다. 암묵 라벨의 접근 이름은 label 요소의 전체 텍스트이므로, slug 입력의 이름이 "주소 (SLUG) 발행한 글의 주소는 바꿀 수 없습니다. 공유된 링크가 끊어집니다."가 된다.

`AdminField`에 `hint?: ReactNode` prop을 추가해 힌트를 `<label>` 밖에 렌더하고 `useId()`로 만든 id를 `aria-describedby`에 연결한다. 같은 API가 UI-A-04의 오류 연결에도 그대로 쓰인다.

### UI-A-15 이미지 업로드가 얼마나 걸릴지 알려 주지 않는다 (낮음)

`use-image-upload.ts:40-70`은 EXIF 추출, webp 3단 압축, Storage 3회 업로드를 하나로 묶어 놓고 밖으로 내보내는 상태는 `pending: boolean` 하나다. 화면은 스피너와 "처리 중…"만 보여 준다. 취소 경로가 없고 `AbortController`도 없다. 실패하면 오류 문구만 남고 재시도 수단은 파일을 다시 고르는 것뿐이다. `accept="image/*"` 외에 크기 상한 검사나 안내도 없다.

무게를 아는 것은 코드 자신이다. `use-image-upload.ts:46-48` 주석이 4천만 화소 사진에서 모바일 Safari가 탭을 종료할 수 있다고 적어 뒀다. 그만큼 무거운 작업인데 진행 상황을 보여 주지 않고 멈출 수도 없다. 배치 진행 표시는 `DevImageField`의 남은 파일 수 하나뿐이고, `aria-live`도 `DevImageField.tsx:190`에만 있다.

파이프라인 단계를 `stage`와 `completed`/`total`로 노출하면 `ImageMigrationPanel.module.css:39-52`의 진행 막대를 그대로 재사용할 수 있다. 업로드 도중 이탈은 UI-A-02와 겹쳐 폼 전체를 잃는 경로이기도 하다.

### UI-A-16 자동 초안 복구가 블로그 전용이다 (낮음)

5초 디바운스 localStorage 스냅샷, 진입 시 복구 제안, 버리기까지 완성된 메커니즘이 `admin-dev-articles/_hooks/`에만 있다. 나머지 여섯 폼과 다섯 설정 편집기에는 없다. 이름이 비슷한 `admin-photos/_lib/photo-draft.ts`는 폼 초기값 생성 유틸이지 복구본이 아니다.

입력량이 가장 많은 화면이 보호를 못 받는다는 점이 아깝다. `ProjectForm`은 배열 네 종에 이미지 다중 업로드가 붙고, `DevConfigEditor`는 학력·인터뷰·수상·스택·경력 다섯 개 배열을 한 화면에서 다룬다. `dev-article-recovery.ts`를 `lib/admin/form-recovery.ts`로 일반화하고 키를 `collection:id`로 잡으면 UI-A-02의 dirty 추적과 같은 기반을 쓴다.

### 세 개의 작은 폼 동작

`UI-A-19`(낮음). `AwardForm.tsx:100-104`가 `patch({ year: Number(e.target.value) })`로 연도를 갱신한다. 연도 칸을 비우면 `Number("")`가 `0`이 되어 그대로 저장되고, 목록은 `award.year || "—"`(`AwardRow.tsx:57`)로 조용히 대시를 그린다. 검증은 `form.name.ko`만 본다. 다만 `-`나 `e`를 입력해 `NaN`이 저장된다는 원 보고서의 주장은 성립하지 않는다. `type="number"`의 값 위생 알고리즘상 유효한 부동소수가 아니면 `.value`가 빈 문자열을 돌려주므로 `NaN`은 만들어지지 않는다. 실제 문제는 `0`이다. 개발 프로젝트의 `year`가 이미 문자열인 것(`project-form-data.ts:12`)처럼 문자열 상태로 두고 제출 시 파싱하는 편이 낫다.

`UI-A-20`(낮음). `WorkForm.tsx:94-100`이 `e.target.value ? patch(...) : null`이라 공연 날짜를 비워도 상태를 갱신하지 않는다. 제어 컴포넌트라 값이 화면에 되돌아오고, 사용자는 지워지지 않는 이유를 알 수 없다. `AdminField label="공연 날짜"`에 `required`도 없어 필수인지조차 화면에 나타나지 않는다.

`UI-A-21`(낮음). `use-ordered-admin.ts:107-128`의 `togglePublished`에는 진행 중 재요청 가드가 없다. 같은 훅의 `reorder`는 `reorderPendingRef`(`:71`)를, 블로그 고정 토글은 `pendingPinIds`를 갖는데 공개 배지만 빠졌다. 롤백 조건이 `item.published === next`(`:117-119`)라 연타로 순서가 엇갈리면 화면과 DB가 어긋난다. `ArticleRow.module.css:64-67`에 `.badge:disabled` 스타일이 이미 있어 시각 표현은 준비돼 있다.

## 키보드와 보조기술

### UI-A-01 dnd-kit 정렬에 키보드 대체 수단이 없다 (중간)

여덟 개 호출부가 모두 `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))`로만 센서를 구성한다(`AdminPhotosList.tsx:29`, `AdminAlbumsList.tsx:31`, `AlbumPhotoPicker.tsx:64`, `AdminTagsEditor.tsx:31`, `AdminMusicWorksList.tsx:29`, `AdminMusicAwardsList.tsx:29`, `AdminMusicMediaList.tsx:29`, `AdminDevProjectsList.tsx:29`). `KeyboardSensor`는 저장소 전체에 한 번도 등장하지 않는다.

`useSensors`에 센서를 명시하면 dnd-kit 기본 목록을 덮어쓴다. 그런데 핸들 버튼은 `{...attributes}`로 `role="button"`과 `tabIndex=0`, `aria-roledescription="sortable"`을 그대로 받는다. 탭으로 도달하고 정렬 가능하다고 읽히지만 Space나 Enter를 눌러도 아무 일이 없다. 목록 화면에 위아래 버튼이 없으므로 표시 순서를 바꾸는 수단은 드래그뿐이다.

심각도를 중간으로 내린 이유는 사용자가 마우스를 쓰기 때문이다. 그래도 남는 문제는 저장소 내부 비일관이다. 같은 관리자 UI의 설정 편집기 Row들(`TimelineRow`, `DevTimelineRow`, `LinkRow`, `StackGroupRow`)은 위아래 버튼을 제공한다. 목록 셸을 추출하면 여덟 곳을 한 번에 고칠 수 있다.

### UI-A-25 dnd-kit 안내가 영어 기본값이다 (낮음)

여덟 개 `DndContext` 어디에도 `announcements`나 `screenReaderInstructions` 커스터마이즈가 없다. 관리자 UI가 전부 한국어인데 정렬 안내만 "To pick up a sortable item, press the space bar…"로 낭독된다. 지금은 키보드 정렬이 동작하지 않아 이 문구를 들을 일이 드물지만, UI-A-01을 고치는 순간 그대로 노출된다. 두 항목은 같은 작업에서 함께 처리해야 한다.

### UI-A-03 라벨 없는 입력이 세 컴포넌트에 남아 있다 (낮음)

`TroubleshootingField.tsx:82-102`, `DevTimelineRow.tsx:56-75`, `InterviewRow.tsx:37-64`의 `AdminInput`에 `aria-label`도 `id`/`htmlFor`도 없고 감싸는 `<label>`도 없다. 접근 이름은 placeholder 폴백뿐이라 트러블슈팅 카드 하나에서 낭독되는 것은 "한국어 편집" 네 번과 "English 편집" 네 번이다.

원 보고서는 높음으로 봤지만 낮음이다. `TroubleshootingField.tsx:82`의 `<span className={styles.label}>`이 시각 라벨로 존재하므로 화면을 보는 사용자에게는 어느 칸인지 구분된다. 결함이 보조기술에만 나타난다.

고치기는 쉽다. 형제 컴포넌트가 이미 답을 갖고 있다. `DevEducationRow.tsx:49,59,68`은 `aria-label`과 `name`을 모두 붙였다. 같은 패턴을 세 곳에 옮기면 끝난다.

### UI-A-12 role="tablist"에 tab이 없다 (낮음)

`PlaceField.tsx:98`의 `<div role="tablist">` 안에 평범한 `<button>` 두 개가 있다(`:99-113`). `role="tab"`도 `aria-selected`도 `aria-controls`도 없고 아래 패널에 `role="tabpanel"`도 없다. 선택 상태는 `styles.tabActive`의 색으로만 전달된다.

`AdminDevArticlesList.tsx:70-81`의 상태 필터가 이미 `role="group"` + `aria-pressed` 패턴을 쓰고 있다. `tablist`를 실제 탭 패턴으로 채우는 것보다 그쪽으로 맞추는 편이 간단하다.

### UI-A-18 저장 성공이 낭독되지 않는다 (낮음)

다섯 개 설정 편집기 모두 저장 성공 문구를 `role="status"`나 `aria-live` 없이 그린다(`AdminSiteEditor.tsx:67`, `AdminTagsEditor.tsx:82`, `AdminMusicConfigEditor.tsx:128`, `DevConfigEditor.tsx:292`, `AdminGlobalEditor.tsx:161`). 오류 문구는 범위 안 전부 `role="alert"`를 갖고 있어 대비가 뚜렷하다. 이 화면들은 저장 후 페이지 이동이 없으므로 그 문구가 유일한 성공 신호다. `ImageMigrationPanel.tsx:74,79`가 이미 `aria-live="polite"`를 쓰므로 패턴은 저장소 안에 있다.

### UI-A-22 유지보수 페이지에 h1이 두 개다 (낮음)

`ImageMigrationPanel.tsx:54`가 `h1`, `EmbeddingMigrationPanel.tsx:58`이 `h2`, `ArticleOrphanImagePanel.tsx:136`이 다시 `h1`이다. `app/admin/maintenance/page.tsx:9-11`이 이 순서대로 렌더하므로 제목 레벨이 h1, h2, h1로 오르내리고 페이지 제목 역할의 `h1`은 따로 없다. 다른 관리자 화면은 전부 h1(페이지) 다음 h2(섹션) 규칙을 지킨다. 페이지에 `<h1>데이터 관리</h1>`를 두고 세 패널을 h2로 내리면 된다.

### UI-A-29 숨김 파일 input의 포커스가 보이지 않는다 (낮음)

`PhotoUploadField.module.css:79-85`, `PosterUploadField.module.css:79-85`, `DevImageField.module.css:110-116`이 clip 패턴으로 파일 input을 1px로 숨긴다. input은 포커스 가능한 상태로 남고 라벨 `.button`이 접근 이름을 주는데, `.button`에 `:focus-within`이 없어 탭으로 도달해도 화면에 아무 표시가 없다. 포커스 링은 클리핑된 1px 영역에 그려진다. `.button:hover`(`:76-78`)는 있다.

문서가 clip 패턴을 예외로 적어 뒀지만 그 예외는 프리미티브 미사용에 관한 것이지 포커스 가시성 포기까지 허용하지 않는다. `ArticleCoverField.tsx:96`과 `ArticleBodyEditor.tsx:140`은 `hidden` 속성에 실제 버튼의 `.click()`을 붙여 이 문제가 없으므로, 세 곳을 그 방식으로 통일하는 것도 방법이다.

### UI-A-14 --text-4로 그린 안내 문구가 대비에 미달한다 (낮음)

토큰은 `globals.css:98`의 라이트 `#a1a1aa`와 `:128`의 다크 `#5a5a62`다. sRGB 상대휘도로 직접 계산한 값은 라이트 흰 배경에서 **2.56:1**, 다크 검정 배경에서 **3.07:1**이다. 원 보고서의 다크 3.3:1은 과대 추정이었다. AA 본문 기준 4.5:1에 못 미치고 대부분 `--t-micro`(약 11.5px)라 large text 예외에도 걸리지 않는다.

문제는 이 색이 장식이 아니라 의미 있는 안내에 쓰인다는 점이다. `ArticleForm.module.css:47`의 slug·발행일 안내, `AlbumPhotoPicker.module.css:57,129`, `PlaceField.module.css:115,130`, `ArticleRow.module.css:32`의 slug 표시, 업로드 필드 세 곳의 `.placeholder`, 그리고 여덟 개 Row의 드래그 핸들이다. 핸들은 그래픽이라 1.4.11의 3:1 기준을 받는데 라이트 2.56:1로 그것도 미달이다.

`--text-3`은 라이트 5.52:1, 다크 6.14:1로 통과한다. 안내·힌트 텍스트를 `--text-3`으로 올리고 `--text-4`는 비활성 상태와 순수 장식으로 한정하면 해결된다. 이 토큰은 공개 페이지의 모바일 탭바 라벨도 쓰므로(그쪽은 중간) 한 번의 수정으로 양쪽이 함께 움직인다.

## 같은 코드가 여러 벌

### UI-A-06 · UI-A-08 · UI-A-31 뿌리가 하나다 (낮음)

세 발견은 위치가 다를 뿐 같은 사실을 가리킨다. 추출된 공용 셸이 없다. 해시로 확인한 결과는 이렇다.

| 계열            | 대상                                                                                                                                                          | 증거                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 목록 셸 6쌍     | `Admin{Photos,Albums,MusicWorks,MusicAwards,MusicMedia,DevProjects}List.module.css`                                                                           | `diff` 결과가 **첫 줄 주석 1행**뿐. 나머지 66줄 동일 |
| 수정 라우트 7쌍 | `photos/[id]` · `albums/[id]` · `music/works/[id]` · `music/awards/[id]` · `music/media/[id]` · `dev/projects/[id]` · `dev/articles/[id]`의 `page.module.css` | md5 `278598491e7bd6912267e76e2529056d` 완전 일치     |
| 허브 3쌍        | `admin/photo` · `admin/music` · `admin/dev`의 `page.module.css`                                                                                               | md5 `e648f798bd5ebf738e5f96f972c48bc4` 완전 일치     |

`.tsx` 쪽도 마찬가지다. 목록 여섯 개는 센서 구성, `onDragEnd`, loading/error/empty/list 4분기, 신규 생성 버튼 구조가 문자열만 바꾼 복사본이고 줄 수도 97~100줄로 붙어 있다. 수정 라우트 일곱 개는 `Status` 타입 선언부터 `use(params)`, `useEffect` 안의 repository `.get(id)`, 4분기 렌더까지 동일하다.

이게 왜 중요한지는 앞의 두 발견이 말해 준다. **UI-A-01의 `KeyboardSensor` 하나를 넣으려면 여섯 곳을 똑같이 고쳐야 하고, UI-A-25의 한국어 `announcements`도 여섯 벌이 필요하다.** 한 곳을 빠뜨리면 그 목록만 조용히 다르게 동작한다. 정렬 힌트 문구 변경, `role="alert"` 보강, 로딩 상태의 `aria-busy` 추가도 전부 여섯 배에서 일곱 배가 된다. 이 리포트에서 제안한 개선의 절반은 셸 추출이 먼저 되지 않으면 착수 비용이 그대로 곱해진다.

드리프트도 이미 시작됐다. `dev/articles/[id]/page.tsx:37`만 `setArticle(loaded); setStatus(loaded ? "found" : "missing")`로 쓰여 있고 나머지 여섯은 `if/else`다. `app/admin/page.tsx`만 허브 카드에 `.cardLink` hover 트랜지션을 따로 갖는다. `docs/admin-ui-conventions.md`의 후속 과제에 "목록 셸 추출, 7개 목록이 같은 구조를 반복"이 이미 적혀 있는데 그대로다.

여기에 테스트 공백이 겹친다. `src/features/admin-*` 아래에서 소스 파일이 있으면서 인접 테스트가 하나도 없는 디렉토리는 **24개, 파일은 61개**다(원 보고서의 45개는 과소 집계였다). 블로그 CMS만 `_lib` 전반에 테스트가 깔려 있고 나머지 열세 개 feature의 `_components`와 `_hooks`는 비어 있다. 복붙본을 공용 셸로 접을 때 회귀를 잡아 줄 그물이 지금은 없다는 뜻이다. 추출 작업의 순서를 정한다면 셸 하나에 테스트를 붙이고 여섯 호출부를 옮기는 쪽이, 여섯 벌을 각각 손보는 쪽보다 안전하다.

### UI-A-07 폼 CSS 원자가 파일마다 재정의돼 있다

같은 선언 블록이 반복된다. `.checkbox`와 `.checkbox input`(18px, `accent-color`)이 일곱 벌이고, `.section`/`.legend`/`.grid2`/`.actions`/`.error` 스캐폴딩이 여덟 벌이다. 32×32 정사각 `.move` 버튼이 다섯 벌, `.srLabel`이 네 벌이다. `AlbumForm.module.css`, `AwardForm.module.css`, `MediaForm.module.css`는 md5 `7ebdb021cbd56960ca7b90e98fc78dc9`로 완전히 같은 76줄 파일이 세 벌 존재한다.

`.delete`와 `.remove` 정의는 직접 세어 보니 **40건**이다. `docs/admin-ui-conventions.md`는 "Row 소형 텍스트 액션, 13곳 동일한 로컬 패턴 유지"를 의도적 예외로 적어 뒀는데, 실제 개수가 세 배를 넘으므로 그 예외 서술의 전제가 이미 깨졌다. 문서를 현실에 맞추든 코드를 문서에 맞추든 한쪽은 움직여야 한다.

한 가지는 원 보고서의 제안을 그대로 쓰면 안 된다. `.srLabel`을 `globals.css`의 전역 `.sr-only`로 대체하자는 제안인데, **`globals.css`에 `.sr-only`는 없다.** `:346-357`의 프리미티브는 `.u-label`과 `.u-mono` 둘뿐이고, 저장소에서 유사한 것은 `ChatPanel.module.css:538`의 로컬 `.srOnly` 하나다. 유틸을 새로 만들어야 하며, 공개 페이지 스킵 링크 작업도 같은 유틸을 필요로 하므로 한 번에 세우는 편이 낫다.

### UI-A-23 수상·영상 폼만 훅과 유틸 분리를 따르지 않는다 (낮음)

`AwardForm.tsx`는 `emptyInput`(`:30`), `fromAward`(`:40`), `onSubmit`과 라우터 이동(`:66-88`)을 컴포넌트 파일 안에 갖고 있다. `MediaForm`도 같다. 두 feature의 `_hooks/` 디렉토리는 존재하지만 목록 훅만 들어 있다. 형제 폼 네 종은 전부 `use-*-editor`와 `*-form-data`로 분리돼 있다.

CLAUDE.md의 타입별 하위폴더 규약과 파일당 단일 책임에 어긋나는 것 자체보다, 실질 비용이 문제다. UI-A-02의 dirty 가드, UI-A-04의 필드 단위 검증, UI-A-16의 복구본을 훅 계층에 넣을 때 이 두 곳만 따로 손대야 한다.

### UI-A-24 신규 경로와 취소 목적지가 화면마다 다르다 (낮음)

`AdminPhotosList.tsx:48,69`는 `ROUTES.ADMIN_PHOTO_NEW` 상수를 쓰는데 `AdminMusicWorksList.tsx:48,69`와 `AdminDevProjectsList.tsx:48,69`는 `` `${ROUTES.X}/new` `` 문자열 조합이다. 취소 목적지도 갈린다. 태그 사전은 `/admin/photo` 허브에서 진입하는데 취소하면 대시보드로 나가고(`AdminTagsEditor.tsx:89`), 같은 사진 설정인 `AdminSiteEditor.tsx:74`는 `/admin/photo`로 돌아간다. `ROUTES`를 단일 출처로 삼는 취지가 절반만 지켜지고 있다.

## 규약과 치수

### UI-A-13 치수가 문서의 3단계를 벗어난다

문서는 입력과 버튼 높이를 44(md), 40(sm), 36(xs) 세 단계로 단정한다. 실제로는 32px이 열한 곳(`ArticleBodyEditor.module.css:28,63`, `AdminDevArticlesList.module.css:51`, `ArticleTagManagerPanel.module.css:69`, `ProjectForm.module.css:108`, 다섯 개 `.move`, `StackGroupRow.module.css:115`), 30px이 한 곳, 28px이 여러 Row의 `.badge`와 두 개 `.move`, 26px이 `SelectedPhotoChip`의 두 버튼, 18px이 `ProjectForm.module.css:121-122`의 `.chipRemove`다. `.edit`과 `.delete`처럼 높이를 아예 지정하지 않고 폰트 줄 높이(약 17px)에 맡긴 텍스트 버튼도 광범위하다. `AdminInput.module.css:21,25`가 md 44px과 sm 40px을 정의하므로 프리미티브 자체는 문서를 지킨다.

WCAG 2.5.8 위반이라는 원 보고서의 단정은 조정이 필요하다. 24×24 미달 자체는 사실이지만 2.5.8에는 간격 예외가 있고, 24px 원이 인접 타깃과 겹치지 않으면 통과할 수 있다. 칩 배치상 그럴 여지가 있으므로 위반으로 확정하기보다 여유가 없는 치수로 보는 편이 정확하다. `.chipRemove`를 24px 이상으로 키우고 Row의 `.edit`/`.delete`에 `min-height`와 좌우 패딩을 주는 것은 그와 무관하게 타당하다.

### UI-A-10 앨범 사진 선택기가 프리미티브 밖에서 입력을 다시 만든다

`AlbumPhotoPicker.tsx:143-151`의 검색 입력이 raw `<input type="search">`이고 스타일은 `.search input { min-height: 36px; ... }` 자손 선택자다(`AlbumPhotoPicker.module.css:60-67`). 더 보기 버튼(`:189-195`)도 `min-height: 40px`짜리 raw button이다. 같은 저장소의 유사 검색 입력인 `AdminDevArticlesList.tsx:60-68`은 `AdminInput type="search" size="sm" aria-label="검색"`을 제대로 쓴다. 두 화면의 검색창이 다른 경로로 만들어진다.

원 보고서가 근거로 든 "`border-radius` 선언이 없어 프리미티브와 모서리가 다르다"는 성립하지 않는다. `globals.css:30`에서 `--r-sm: 0px`이고 raw input의 계산값도 0이라 실제 모서리는 같다. 남는 문제는 프리미티브 우회와 자손 선택자의 범위다. `.search input`은 라벨 안에 다른 input이 생기면 함께 잡힌다.

### UI-A-30 배열 추가 버튼 라벨이 대상을 밝히지 않는 곳이 있다 (낮음)

문서는 `+ {대상} 추가`로 대상을 명시하고 범용 필드만 `+ 항목 추가`를 쓰라고 규정한다. 대상이 분명한데도 범용 문구를 쓰는 곳이 다섯이다. `LocalizedProjectListField.tsx:42`(주요 기능, 담당·주요 작업, 성과·수상 세 섹션이 재사용), `TroubleshootingField.tsx:64`, `AdminMusicConfigEditor.tsx:53`, `DevConfigEditor.tsx:76,250`이다. 같은 `DevConfigEditor` 안에서도 `+ 문답 추가`, `+ 수상 추가`, `+ 그룹 추가`는 대상을 밝힌다. `LocalizedProjectListField`에 `addLabel` prop을 열면 호출부가 각자 문구를 넘길 수 있다.

### UI-A-26 삭제가 수정 옆에서 같은 무게를 갖는다 (낮음)

여덟 개 Row에서 `수정`(Link, `--text-2`)과 `삭제`(button, `--text-3`)가 `gap: var(--s-3)`만 두고 나란히 있다(`PhotoRow.tsx:85-92`, `PhotoRow.module.css:85-90,94-104`). 폰트 크기와 굵기가 같고 삭제의 danger 색은 hover에서만 나타난다(`:102-104`). 정지 상태에서 파괴적 동작과 안전한 동작이 구분되지 않는다. `window.confirm`이 실제 손실을 막고 있어 낮음이지만, 확인창을 반복해 보다 보면 습관적으로 확인을 누르게 된다. UI-A-13의 `min-height` 보강과 함께 처리할 만하다.

### UI-A-28 대시보드의 "곧 제공" 분기가 죽은 코드다 (낮음)

`app/admin/page.tsx:12`에서 `href?: string`이 optional인데 `SECTIONS` 다섯 항목이 전부 `href`를 갖는다. 따라서 `:67-73`의 else 분기와 `page.module.css`의 비-ready `.badge` 스타일은 절대 렌더되지 않는다. 읽는 사람에게 아직 미구현 섹션이 있다는 잘못된 신호를 주고, `href`가 optional인 탓에 새 섹션을 추가할 때 링크 없는 카드를 실수로 만들 수 있다.

### UI-A-27 좁은 화면의 상단 바 (보류)

`AdminChrome.module.css:19-31`이 `.bar`에 `height: 60px` 고정과 좌우 패딩을 주고, `:33-42`의 `.brand`가 `--t-h3` display 폰트를 쓴다. `:89-96`의 모바일 미디어쿼리는 패딩만 줄인다. `.bar`와 `.brand` 어디에도 `min-width: 0`이나 `overflow`, `text-overflow`가 없다는 것은 코드로 확인했다. 다만 **320px에서 실제로 넘치는지는 뷰포트 실측 없이 확정할 수 없어 보류**한다. CSS 계산만으로 가로 스크롤을 단정한 것이 원 보고서의 약한 지점이었다.

같은 항목에서 함께 지적된 사실 하나는 실측 없이도 확정된다. `MockModeBadge`는 sticky가 아니고 `.bar`만 sticky이므로, 긴 폼을 스크롤하면 MOCK 안내가 화면에서 사라진다. mock 모드로 한참 작업하다 실데이터로 착각할 여지가 남는다. 배지를 `.bar` 아래 sticky 스택에 넣거나 저장 버튼 근처에 재확인 문구를 두는 것으로 닫힌다.
