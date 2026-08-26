# 공개 화면

방문자가 보는 화면은 기초가 탄탄한 편이다. 모달 3종이 포커스 트랩과 포커스 복귀를 공유하고, 스크롤 잠금은 스크롤바 폭까지 보정하며, `prefers-reduced-motion` 은 CSS 12개 파일과 JS 5곳에서 각각 존중된다. `.module.css` 156개에 hex 직박이 0건이고, 공개 트리의 내부 링크는 예외 없이 `LocalizedLink` 나 `localizePath()` 를 지난다. 아래에 적는 것은 그 규율이 없어서 생긴 문제가 아니라, 규율에 뚫린 구멍이다.

구멍은 세 갈래다. 첫째는 정의되지 않은 CSS 토큰이다. `--text-1` 과 `--s-0` 은 globals 에 없는데 5줄에서 참조되고, 그중 한 곳은 사진 상세 공유 버튼의 포커스 링을 실제로 없앤다. 둘째는 키보드다. 팝업 세 종류(`Select`, `LangMenu`, mega-menu)가 하나같이 Escape 후 트리거로 포커스를 돌려주지 않고, YouTube 파사드는 재생 순간 포커스를 body 로 떨어뜨린다. 셋째는 문서와 코드의 어긋남이다. 결과 수 문구가 영어로 굳어 있고, CLAUDE.md 의 섹션 액센트 색 3개는 전부 실제 값과 다르다.

`e2e/accessibility.e2e.ts` 가 13개 공개 라우트를 라이트·다크 두 테마로 axe 스캔하고 위반 0건을 단언한다. 그런데도 아래 항목들이 남아 있는 이유는 셋이다. 스캔이 `desktop` 프로젝트에서만 돌아서 모바일 하단 탭바처럼 `display:none` 인 요소는 대비 검사 대상에서 빠진다. 라우트 목록에 `/ko/photo/map` 이 없어서 그 페이지에만 없는 `<main>`·`<h1>` 을 아무도 보지 않는다. 그리고 포커스 링이 실제로 보이는지, Tab 순서가 눈으로 읽는 순서와 같은지, hover 없이도 정보에 닿는지, 한국어 페이지에 영어가 노출되는지는 axe 의 룰 셋에 애초에 없다. 자동 검사가 통과했다는 사실은 여기서 아무것도 보증하지 않는다.

## 잘 되어 있는 것

- 모달의 포커스 계약이 한 훅에 모여 있다. `src/hooks/use-focus-trap.ts:25,27,53` 이 열 때 직전 포커스를 저장하고 `focus({preventScroll:true})` 로 컨테이너에 옮긴 뒤, cleanup 에서 원래 요소로 되돌린다. Modal·PhotoModal·ImageLightbox 가 같은 구현을 쓴다.

- 스크롤 잠금이 스크롤바 폭을 보정한다. `src/hooks/use-scroll-lock.ts:105` 가 `body.paddingRight` 를 넣어 모달 열 때 가로 흔들림을 없애고, 중첩 잠금은 Map 으로 관리해 위 오버레이가 닫혀도 아래 잠금이 유지된다.

- 스켈레톤이 실측 높이를 예약한다. `src/features/photo-detail/_components/ExifPanelSkeleton.module.css:1-2` 주석이 구간별 측정값(title 40, exifHead 64, row 35×N, minimap 148)을 적어 두고 그대로 자리를 잡는다.

- 서드파티 비용이 기본값으로 차단된다. `src/components/YouTubeFacade.tsx:50-70` 은 클릭 전까지 iframe 을 만들지 않고 썸네일만 그리며, 지도와 온디맨드 모달은 `next/dynamic(ssr:false)` 로 진입 시에만 로드한다.

- 모달 딥링크가 히스토리를 오염시키지 않는다. `src/hooks/use-query-modal.ts:22,48-55` 가 이 세션에서 연 모달만 `router.back()` 으로 닫고, 딥링크 진입은 쿼리만 지운다.

- 랜드마크와 nav 라벨이 겹치지 않는다. `SiteHeader.tsx:33` 의 `<header>`, `SiteFooter.tsx:48` 의 `<footer>`, 그리고 세 개의 `<nav>` 가 각각 다른 라벨을 갖는다(`DesktopMegaMenu.tsx:131`, `MobileTabBar.tsx:37`, `SiteFooter.tsx:72`).

- 오버레이 Escape 우선순위가 전역으로 일관된다. `use-overlay-layer.ts` 의 심볼 스택으로 최상위 오버레이만 Escape 를 소비하고, `ChatPanel.tsx:122-128` 이 `isTopLayer` 를 확인한 뒤 `stopImmediatePropagation()` 한다.

- 스크롤 리스너가 전부 `passive` 이고 rAF 로 병합된다. `MobileNavigationVisibility.tsx:83,94` 는 React state 대신 루트 속성 하나만 토글해 하위 리렌더가 0이다.

## 접근성

### 모바일 탭바 라벨 대비가 두 테마 모두 기준에 못 미친다 (UI-S-06, UI-A-14)

`globals.css:98` 의 라이트 `--text-4: #a1a1aa` 는 흰 배경에서 2.56:1, `:128` 의 다크 `#5a5a62` 는 검정 배경에서 3.07:1 이다. AA 본문 기준 4.5:1 을 양쪽 다 못 넘고, 라이트는 비텍스트 기준 3:1 에도 못 미친다. 참고로 `--text-3` 은 라이트 5.52:1, 다크 6.14:1 로 둘 다 통과한다.

문제가 되는 자리는 `MobileTabBar.module.css:44` 다. 비활성 탭 라벨이 `font-size:10px; font-weight:600` 이라 large text 예외에 해당하지 않는다. 모바일 주 내비게이션 라벨 4개 중 3개가 항상 이 색이다. 1.4.3 이 인정하는 예외는 disabled 컨트롤인데 이 탭들은 활성 링크다. 저시력 사용자가 밝은 실외에서 지금 어느 섹션에 있는지 읽지 못한다.

같은 토큰이 관리자 CMS 의 안내 문구와 드래그 핸들에도 쓰이지만(자세한 사용처는 04 문서), 사용자가 본인 1인이라 심각도는 낮다. 수정은 한 번으로 양쪽에 닿는다.

탭바 비활성 라벨을 `--text-3` 으로 올리는 것이 최소 조치다. 디자인 톤을 유지해야 한다면 `--text-4` 토큰 자체를 라이트 `#8a8a93`, 다크 `#6f6f78` 수준으로 조정한 뒤 텍스트에 쓰는 자리를 전수 점검한다. 난이도는 작다.

### `/photo/map` 에만 `<main>` 과 `<h1>` 이 없다 (UI-P-02)

`MapView.tsx:64` 의 최상위가 `<div className={styles.view}>` 이고 자식은 `LocationList`(`:65`)와 `.stage`(`:66`) 뿐이다. `page.tsx:39-47` 도 감싸지 않는다. 나머지 14개 공개 뷰는 전부 `<main>` 과 `<h1>` 을 갖는다.

스크린리더 사용자가 이 페이지에서만 랜드마크로 본문에 점프할 수 없고, 화면 안 제목이 없어 어디에 있는지 음성으로 확인할 수단이 `<title>` 뿐이다. `generateMetadata`(`photo/map/page.tsx:17-28`)가 문서 제목을 채우고 `LocationList` 가 실제 링크 목록을 제공하므로 완전히 막히지는 않는다. CONTEXT.md 의 E2E 계약("각 페이지의 고유 heading 이 보인다")도 이 페이지만 충족하지 못한다.

`MapView` 의 최상위를 `<main>` 으로 바꾸고 위치 목록 헤더(`LocationList.tsx:74`)를 `<h1>` 으로 승격한다. `loading.tsx` 셸도 같이 맞춘다. 난이도는 작다.

### 사진 그리드의 Tab 순서가 눈으로 읽는 순서와 다르다 (UI-P-04)

`PhotoGrid.tsx:55-57` 이 `distributed[index % columnCount].push(...)` 로 사진을 열에 나눠 담고 `:95-101` 에서 열마다 `div` 를 렌더한다. CSS 는 `PhotoGrid.module.css:1-5` 에서 `grid-template-columns: repeat(4, …)` 다. 화면 첫 행은 0, 1, 2, 3 인데 DOM 순서는 0, 4, 8 다음 1, 5, 9 다.

키보드 사용자가 Tab 을 누르면 포커스가 왼쪽 열을 세로로 끝까지 내려간 뒤 다시 맨 위로 올라온다. 스크린리더 낭독 순서도 같다. 무한 스크롤이 24장씩 붙이므로 열이 길어질수록 괴리가 커진다. `/photo` 와 앨범 상세 두 화면에 해당한다.

분배 알고리즘을 바꾸거나 단일 grid 인 `square` 뷰를 기본값으로 두는 두 갈래가 있고, 어느 쪽이든 레이아웃 결정이 함께 걸려 난이도는 크다.

### 사진 타일의 제목과 노출값이 hover 에서만 보인다 (UI-P-08)

`PhotoTile.module.css:23` 이 `.ov{opacity:0}` 이고 `:26-28` 의 `.tile:hover .ov` 에서만 1이 된다. 같은 파일에 `:focus-visible` 도 `:focus-within` 도 `@media (hover:none)` 도 없다.

터치 기기 사용자 전원이 목록에서 제목과 `f/2.8 · 1/250 · ISO100 · 35mm` 를 볼 수 없다. 모바일이 2열 그리드 주 환경이므로 이 정보는 사실상 데스크톱 전용이다. 키보드 사용자도 같다. `PhotoTile.tsx:44` 의 `aria-label={title}` 덕에 스크린리더는 제목만 듣는다.

`.tile:focus-visible .ov` 를 추가하고 `@media (hover: none)` 에서는 오버레이를 상시 노출하거나 타일 아래 캡션으로 바꾼다. 난이도는 작다.

### 카메라 필터 드롭다운이 listbox 규약을 따르지 않는다 (UI-P-09)

`Select.tsx:65-75` 의 트리거는 `aria-haspopup="listbox"` 와 `aria-expanded` 를 갖지만 `aria-controls` 가 없다. `:78-102` 의 구조는 `ul[role=listbox] > li > button[role=option]` 이라 중간의 role 없는 `li` 가 listbox 소유 규칙을 깬다. `:47-61` 의 effect 에 화살표 키 처리가 없고, `:52-54` 의 Escape 는 `setOpen(false)` 만 한다. 트리거 ref 자체가 없다.

`/photo` 카메라 필터를 키보드로 열면 옵션을 화살표로 옮길 수 없어 Tab 으로 하나씩 지나야 하고, Escape 로 닫으면 포커스가 body 로 날아가 다음 Tab 이 헤더부터 다시 시작한다. 같은 화면의 `FilterBar.tsx:54-63` 은 이미 `triggerRef.current?.focus()` 를 하고 있어 한 지면 안에서 동작이 갈린다.

덧붙여 `:79` 의 `id="filter-select-scroll-container"` 는 하드코딩 상수다. `CustomScrollbar.tsx:155` 가 이 id 를 `aria-controls` 에 넣으므로, 한 화면에 Select 가 둘 이상 열리면 ARIA 트리만이 아니라 스크롤바의 IDREF 도 함께 깨진다.

`li` 를 걷어내고 Escape 시 트리거로 포커스를 돌려주며 `useId()` 로 id 를 만드는 것이 최소 조치다. 난이도는 중간이다.

### 팝업 두 곳이 같은 이유로 포커스를 잃는다 (UI-S-07, UI-S-08)

`LangMenu.tsx` 는 `:46-47` 의 `aria-haspopup="menu"`·`aria-expanded`, `:73` 의 `role="menu"`, `:78-79` 의 `role="menuitemradio"`·`aria-checked` 를 정확히 선언한다. 그런데 컴포넌트에 `useEffect` 자체가 없다. Escape 핸들러도, 방향키 로빙도, 바깥 keydown 처리도 없다. `pick()`(`:30-38`)이 `setOpen(false)` 로 포커스를 가진 옵션 버튼을 언마운트하므로 언어를 고르는 순간 포커스가 body 로 간다. ADR-0002 가 지정한 유일한 언어 전환 UI 라 영향이 크다.

mega-menu 는 다른 경로로 같은 결과에 닿는다. `DesktopMegaMenu.tsx:110-111` 의 Escape 리스너가 `if (!pinned) return;` 뒤에 등록되는데, 패널은 `:49` 의 `onFocus` 로도 열린다. 키보드로 Tab 진입해 연 패널은 `pinned` 이 null 이라 Escape 가 아무 일도 하지 않는다. 클릭으로 핀한 뒤 패널 링크로 Tab 해서 Escape 를 누르면 `closeMenu`(`:96-99`)가 포커스 복귀 없이 닫고, `SiteHeader.module.css:112` 의 `visibility:hidden` 이 걸리면서 포커스가 사라진다. 그룹 버튼에 `aria-haspopup`·`aria-controls` 가 없고 패널에 id 도 role 도 없는 것은 별개 문제다.

`Select` 를 포함한 세 팝업이 Escape 복귀, 방향키 로빙, `aria-controls` 셋을 똑같이 빠뜨렸다. 공유 훅 하나로 묶는 편이 세 번 고치는 것보다 낫다. 난이도는 중간이다.

### YouTube 재생 순간 포커스가 사라진다 (UI-P-13)

`YouTubeFacade.tsx:50-76` 은 `playing && playable` 이면 포커스를 가진 `<button className={styles.trigger}>`(`:59`)를 `<iframe>`(`:51-57`)으로 통째 교체한다. 포커스 이관 코드가 없다.

`/music/media` 에서 키보드로 영상을 켤 때마다 포커스가 body 로 떨어져 다음 Tab 이 헤더부터 다시 시작한다. 카드가 여러 개라 영상을 볼 때마다 반복된다.

`playing` 이 참이 될 때 iframe 이나 `tabIndex={-1}` 을 준 `.frame` 으로 포커스를 옮긴다. `useEffect` 한 번이면 되고 난이도는 작다.

### 본문으로 건너뛰는 링크가 없다 (UI-P-23, UI-S-03)

`skip`, `sr-only`, `visually-hidden` 어느 이름으로도 UI 요소가 0건이다. 타깃은 이미 있다. `(public)/layout.tsx:57` 의 `#page-content` 를 `CustomScrollbar.tsx:270` 이 `aria-controls` 로 참조하고 있다. 없는 것은 링크와 사전 키뿐이다.

데스크톱 탭 경로를 실측하면 워드마크, mega-menu 세 그룹(각 그룹은 `DesktopMegaMenu.tsx:49` 의 `onFocus` 로 자동으로 펼쳐져 하위 링크가 탭 순서에 들어온다), 연락, 언어, 테마, 검색 순이다. 여기에 커스텀 스크롤바 탭 스톱이 하나 더 앞선다. 키보드 전용 사용자는 모든 페이지에서 본문에 닿기 전 20회 가까이 Tab 을 누른다. 스크린리더 사용자는 랜드마크로 우회할 수 있지만 `/photo/map` 에서는 그마저 없다.

작업 전에 걸리는 것이 하나 있다. `globals.css:346-357` 의 프리미티브는 `.u-label` 과 `.u-mono` 둘뿐이고 저장소에 `.sr-only` 유틸이 없다. 저장소 전체에서 유일한 sr-only 구현은 `ChatPanel.module.css:538` 의 로컬 클래스다. 스킵 링크를 넣으려면 전역 유틸을 먼저 만들어야 한다. 그 전제만 채우면 링크 자체는 난이도가 작다.

### 커스텀 스크롤바가 모든 페이지의 첫 탭 스톱을 가져간다 (UI-S-10)

`CustomScrollbar.tsx:153` 이 `track.tabIndex = visible ? 0 : -1` 을 세팅하고, 컴포넌트는 `app/layout.tsx:120` 에서 `{children}` 앞에 렌더된다. 스크롤 가능한 모든 페이지에서 헤더보다 먼저 오는 포커스 가능 요소가 된다.

키보드 사용자가 페이지를 열고 처음 누르는 Tab 이 워드마크가 아니라 스크롤 위젯에 닿는다. 네이티브 스크롤은 이미 포커스 없이 방향키로 동작하므로 이 탭 스톱이 더해 주는 것이 크지 않다. 다만 "탭 스톱 유지"가 의도된 설계일 가능성이 있어 제거 여부는 판단이 필요하다.

`:155` 의 `aria-controls` 는 대부분 정상이다. `LocationList.tsx:66`, `Select.tsx:79`, `Modal.tsx:81`, `PhotoModal.tsx:539`, `OnDemandPhotoModal.tsx:141`, `ChatPanel.tsx:250` 모두 id 를 갖는다. id 가 없어 빈 IDREF 가 되는 것은 `ArticleTocList` 하나다. 난이도는 작다.

### 셸 내비에 `aria-current` 가 없고 활성 표시가 색뿐이다 (UI-S-05)

`MobileTabBar.tsx:39-46` 의 `LocalizedLink` 에 `aria-current` 가 없고, `MobileTabBar.module.css:44` 의 `.tab{color:var(--text-4)}` 와 `:51` 의 `.active{color:var(--accent)}` 는 색만 다르다. 데스크톱도 `SiteHeader.module.css:97` 의 `.current .megaBtn{color:var(--accent)}` 로 같다. 푸터 사이트맵(`SiteFooter.tsx:75,81`)에는 활성 표시가 아예 없다.

스크린리더 사용자는 현재 위치를 듣지 못하고, 색각 이상 사용자는 비활성이 `--text-4` 라 대비 자체도 약한 상태에서 색 하나로 구분해야 한다. 같은 저장소의 `ArticleTocList.tsx:15` 는 주석에 "색만으로 구분하면"이라고 적고 `aria-current="location"` 과 굵기를 함께 쓴다. 규칙이 있고 셸에만 적용되지 않았다.

탭바 활성 탭에 `aria-current="page"` 를 붙이고 색 외에 인디케이터나 굵기 차이를 준다. 난이도는 작다.

### 모바일 시트 위에 보이는 컨트롤을 키보드로 만질 수 없다 (UI-S-13)

`MobileMenu.tsx:44` 의 `useFocusTrap(open)` 은 `.panel`(`:138-143`)에만 걸리고 `useDialogIsolation` 은 쓰지 않는다. 동시에 `SiteHeader.module.css:153-159` 가 시트가 열리면 헤더 배경을 투명하게 만들어 워드마크와 언어·테마 토글을 시트 위에 그대로 남긴다. 이건 `MobileMenu.tsx:45-47` 주석이 적은 의도된 배치다.

결과는 보이는 것과 조작 가능한 것의 불일치다. 시트를 연 키보드 사용자에게 언어·테마 토글이 화면에 그대로 보이는데 트랩 밖이라 닿을 수 없다. 스크림 닫기 버튼(`:209-214`)도 `panelRef` 밖 형제라 마찬가지다. `use-focus-trap.ts:41-47` 이 컨테이너 첫과 끝에서만 `preventDefault` 하므로 패널 안에서 순환만 돌고 스크림에 도달할 경로가 없다. 배경이 `inert` 가 아니라 `aria-modal` 을 무시하는 보조기술에서는 뒤 콘텐츠가 그대로 노출된다.

시트가 열린 동안 언어·테마 토글을 시트 안으로 옮기면 dialog 시맨틱과도 맞고 트랩 범위 문제도 함께 사라진다. 난이도는 중간이다.

### 전면 스크림을 `<button>` 으로 만든 곳이 탭 순서에 낀다 (UI-P-11)

`PhotoModal.tsx:389-394` 의 스크림 버튼은 `trapRef` 가 붙은 루트(`:369`) 안에 있고, `ImageLightbox.tsx:287-293` 의 스크림도 `containerRef` 가 붙은 `.overlay`(`:274`) 안에 있다. 두 모달 모두 첫 Tab 이 화면 전체를 덮은 투명 버튼에 걸린다. 세 모달 모두 스크림과 헤더 닫기 버튼이 같은 `aria-label` 을 써서 스크린리더의 버튼 목록에 "닫기"가 두 개 나온다.

`Modal` 은 이 문제가 없다. `Modal.tsx:86` 의 `panelRef` 는 `.panel` 에 붙고 스크림(`:84`)은 그 형제라 `use-focus-trap.ts:31` 의 수집 범위 밖이다.

올바른 형태가 이미 저장소에 있다. `OnDemandPhotoModal.tsx:114` 는 스크림을 `<div aria-hidden="true">` 로 만든다. `LangMenu.tsx:65-71` 의 backdrop 버튼, `MobileMenu.tsx:209-214` 의 스크림 버튼까지 네 곳이 같은 안티패턴이므로 한 번에 통일하는 것이 맞다. 난이도는 작다.

### 공개 페이지에 focus 소유권 규칙이 없다 (UI-P-07, UI-P-30, UI-S-25)

먼저 정정할 것이 있다. 공개 화면에서 포커스 링을 지우는 `outline: none` 선언은 저장소 전체를 통틀어 7곳뿐이고, 그중 공개 대상은 `ContactView.module.css:112`, `SearchBox.module.css:27`, `MobileMenu.module.css:162`, `ImageLightbox.module.css:7` 이다. `PhotoTile`·`Chip`·`ViewToggle`·`FilterBar`·`PhotoModal .nav`·`LocationList`·`SearchResults .hit` 같은 요소는 UA 기본 `:focus-visible` 링을 그대로 받는다. 포커스가 보이지 않는 것이 아니다.

남는 사실은 이것이다. `globals.css` 에 전역 `:focus-visible` 폴백이 없어서 어두운 사진 위 글래스 크롬(`PhotoModal .nav`, `ImageLightbox .close/.nav`)에서 UA 기본 링의 대비가 보장되지 않는다. 그리고 `ContactView.module.css:110-115` 와 `SearchBox.module.css:14` 는 `:focus-visible` 이 아닌 `:focus` 에 `outline:none` 을 걸고 1px 테두리 색만 바꾼다. 이 패턴은 `docs/admin-ui-conventions.md:88` 이 "공개 페이지에는 적용하지 않는다"고 명시한 관리자 규칙이다. 문서와 코드가 어긋나 있다.

WCAG 위반은 아니다. `--accent`(#0066cc)와 `--surface-2`(#f3f3f5)의 대비는 5.02:1 로 1.4.11 의 3:1 을 넘고, 2.4.13 Focus Appearance 는 AAA 라 AA 판정 대상이 아니다. 1px 색 변화가 저시력 사용자에게 얇다는 품질 문제로 다루면 된다.

할 일은 공개 페이지의 focus 소유권 규칙을 정하는 것 하나다. `:where()` 로 특이도 0인 폴백을 globals 에 한 번 정의하면 기존 개별 규칙을 깨지 않고, 사진 위 크롬만 반전 색으로 덮으면 된다. 난이도는 중간이다.

### 구획 제목이 전부 `div` 라 헤딩 목록이 한 줄뿐이다 (UI-P-16)

`DevProjectDetail.tsx:81,86,97,108,145,154,163` 의 `.secL`, `MusicCareerView.tsx:53` 의 `.awLabel`, `DevCareerView.tsx:69` 의 `.sectionLabel` 이 모두 `div` 나 `span` 이다. 실제 헤딩은 `DevStackSection.tsx:33` 과 `DevProjectDetail.tsx:52` 둘뿐이다.

스크린리더 사용자가 `/music/career`, `/dev/career`, `/dev/projects`, 프로젝트 상세 모달처럼 긴 지면에서 구획 사이를 건너뛸 수 없다. 페이지당 헤딩이 `<h1>` 하나라 rotor 가 쓸모없다. 1.3.1 위반이라기보다 탐색 효율 문제다.

구획 라벨을 `<h2>`·`<h3>` 로 바꾸고 시각 스타일은 클래스로 유지한다. `<section>` 에는 `aria-labelledby` 로 그 헤딩을 건다. 파일 수가 많아 난이도는 중간이다.

### 로딩 스피너의 `aria-label` 이 전달되지 않는다 (UI-P-22)

`OnDemandPhotoModal.tsx:136` 이 `<span className={styles.spinner} aria-label={dict.photoLoadingLabel} />` 를 렌더한다. role 없는 generic 요소의 `aria-label` 은 ARIA in HTML 상 prohibited 라 대부분의 스크린리더가 무시한다. 상위 `role="dialog" aria-label`(`:109-113`)이 같은 문구를 갖고 있어 완전히 침묵하지는 않는다.

스피너를 `aria-hidden="true"` 로 두면 된다. `PhotoModal.tsx:470` 과 `ImageLightbox.tsx:98` 이 이미 그렇게 한다. 난이도는 작다.

### 터치 타깃이 24px 에 못 미치는 두 곳 (UI-P-14, UI-S-20)

`MapCanvas.module.css:98-101` 이 MapLibre 저작권 펼침 버튼을 `width/height: 16px` 로 줄인다. 모바일 미디어쿼리에서도 그대로다. 같은 파일의 줌 컨트롤은 38px 과 36px 로 충분하니 이 버튼만 예외다. 손가락으로 지도 출처를 펼치기 어렵고, 핵심 기능이 아니라 심각도는 낮다.

`SiteFooter.module.css:121-133` 과 `:143-153` 의 `.copyright`·`.legalLink` 는 `padding: 4px 8px; line-height: 1; font: inherit` 이고 부모 `font-size` 가 11px 이라 높이가 약 19px 이다. `:141` 의 `gap: 2px 12px` 때문에 세로로 줄바꿈되면 간격 예외도 충족하지 못한다. 모바일에서 Privacy·Terms·Accessibility 를 자주 헛누른다. 모바일 규칙(`:180-191`)이 사이트맵 링크 padding 도 4px 로 유지한다.

`min-height: 24px` 와 `display:inline-flex; align-items:center` 를 주고 세로 gap 을 8px 이상으로 올린다. 두 건 다 난이도가 작다.

### 이미지 보호가 사진 제목과 EXIF 텍스트까지 복사 불가로 만든다 (UI-S-23)

`use-image-protection.ts:24` 가 `document` 캡처 단계에서 `[data-protected-image]` 하위의 `contextmenu`·`dragstart`·`selectstart` 를 모두 `preventDefault()` 하고, `globals.css:280` 이 같은 범위에 `user-select: none` 을 건다.

문제는 래퍼 범위다. `PhotoTile.tsx:47` 은 `data-protected-image` 를 `<Link>` 전체에 붙이고 그 안에 제목(`.ov > .t`)과 EXIF(`.m`)가 들어 있다(`:76-79`). `DetailHero.tsx:56` 은 커버가 있으면 `h1` 과 메타를 포함한 hero 전체를 감싸고, `MusicWorksView.tsx:64` 는 카테고리 태그를 포함한다. 결과적으로 사진 제목, 촬영 정보, 앨범 제목을 방문자가 복사할 수 없다. 이미지 보호가 의도라면 텍스트까지 막는 것은 의도가 아닐 가능성이 크다.

이벤트 필터를 `[data-protected-image] img` 로 좁히거나 `selectstart` 만이라도 대상이 이미지일 때로 한정한다. 난이도는 작다.

### 포커스 트랩이 fixed 요소를 놓친다 (UI-S-21)

`use-focus-trap.ts:33` 의 후보 필터가 `el.offsetParent !== null` 인데 `position: fixed` 요소는 `offsetParent` 가 null 이라 트랩에서 빠진다. `:50` 의 리스너가 `container` 에 붙어 있어 포커스가 밖으로 나가면 되돌릴 수단도 없다.

현재 셸에서는 실제 피해가 확인되지 않는다. 모바일 시트와 챗 패널 안의 포커스 가능 요소가 전부 static 이나 absolute 다. 앞으로 오버레이 안에 fixed 요소를 두면 조용히 트랩에서 빠진다는 잠복 결함이다.

판정을 `el.getClientRects().length > 0` 으로 바꾸면 fixed 가 포함되면서 `display:none` 과 `visibility:hidden` 은 계속 걸러진다. 난이도는 작다.

## CSS 토큰

### `--text-1` 이 사진 상세 공유 버튼의 포커스 링을 실제로 없앤다 (UI-P-01)

`ExifPanel.module.css:40` 과 `:45` 가 각각 `color: var(--text-1)` 과 `outline: 2px solid var(--text-1)` 을 쓴다. `globals.css` 에 정의된 텍스트 토큰은 `--text`, `--text-2`, `--text-3`, `--text-4` 뿐이고 `--text-1` 은 없다. 저장소에서 이 토큰을 참조하는 곳은 이 두 줄이 전부다.

정의되지 않은 `var()` 가 들어간 선언은 invalid at computed-value time 이 되어 프로퍼티가 초기값으로 돌아간다. `outline` 은 단축 속성이라 통째로 무효화되어 `outline-style: none` 이 되고, UA 의 `:focus-visible` 링은 이미 캐스케이드에서 졌으므로 되살아나지 않는다. globals 에 전역 폴백도 없다. 사진 상세 모달에서 공유 버튼에 포커스가 갔을 때 아무 표시도 나타나지 않는다. hover 색도 함께 죽는다.

버튼 하나 범위이고 조작 자체는 가능하지만, 이 문서에서 유일하게 "코드에 적힌 의도가 화면에서 실행되지 않는" 사례다. 두 줄을 `var(--accent)` 로 바꾸면 `Modal.module.css:87` 이나 `AlbumCard.module.css:44` 와도 일관된다. 난이도는 작다.

### `--s-0` 이 세 파일에서 참조된다 (UI-P-19)

`globals.css:36` 의 spacing 스케일은 `--s-1`(4px)부터 시작한다. `--s-0` 은 없는데 세 곳이 참조한다. `SearchResults.module.css:40` 의 `margin-top`, `SiteFooter.module.css:34` 의 `.tagline{margin-top}`, `AnalyticsConsentBanner.module.css:12` 의 `.banner{gap}` 이다.

앞의 두 곳은 무효화된 `margin-top` 이 초기값 0으로 떨어져 의도와 우연히 일치한다. 화면상 증상이 없다. 세 번째는 다르다. flex 컨테이너의 `gap` 이 무효화되면 초기값 `normal` 이 되고, flex 에서 `normal` 은 0으로 계산된다. 동의 배너의 버튼 사이에 의도한 간격이 실제로 사라져 있을 수 있다. 배너를 열어 확인할 값이다.

세 곳 모두 명시값으로 바꾸고, 배너는 의도한 간격을 정해 넣는다. 난이도는 작다.

### 모달 스크림 네 종류가 각자 다른 rgba 를 직접 적는다 (UI-P-18)

`globals.css:105` 와 `:134` 에 `--scrim` 이 라이트 `rgba(0,0,0,0.55)`, 다크 `rgba(0,0,0,0.7)` 로 정의돼 있고 `ChatPanel.module.css:591` 과 `ArticleTocDrawer.module.css:14` 가 실제로 쓴다. 그런데 공개 섹션의 모달 4종은 전부 값을 직접 적는다. `Modal.module.css:25` 가 0.5, `PhotoModal.module.css:11` 과 `OnDemandPhotoModal.module.css:11` 이 0.66, `ImageLightbox.module.css:18` 이 0.82 다.

다크모드에서 스크림 농도가 조절되지 않고, 모달 위에 라이트박스가 겹칠 때 밝기 위계도 일관되지 않는다. 사진 위 글래스 크롬의 `rgba(0,0,0,.35)` 와 `rgba(255,255,255,.2)` 조합도 네 파일에 중복돼 있어 같이 토큰화할 대상이다. 난이도는 작다.

### 개발 섹션 컴포넌트가 음악 액센트를 참조한다 (UI-P-20)

`DevProjectsView.module.css:197-200` 의 `.tsProblemLabel` 이 `--accent-music` 을 배경과 글자색에 쓰고 `:201-203` 에서 다크 보정까지 한다. CLAUDE.md 아키텍처 원칙 9 의 "컴포넌트는 항상 `--accent` 변수만 참조"와 충돌한다. 음악 섹션 색을 조정하면 개발 섹션의 무관한 라벨 색이 함께 바뀐다.

`--danger` 가 `globals.css:63` 과 `:144` 에 라이트·다크 짝으로 준비돼 있어 바로 대체할 수 있다. 난이도는 작다.

### 기술 스택 칩 색이 관리자 입력값 그대로다 (UI-P-27)

`DevStackSection.tsx:45` 가 `style={{background:item.bg, color:item.fg, borderColor:item.bg}}` 로 `site/dev` config 값을 인라인 스타일에 그대로 넣는다. 대비 검증이 없고 다크모드 짝 색도 없다. 라이트 기준으로 고른 색이 다크에서 더 나빠질 수 있다. 칩은 통합검색으로 가는 링크라 비텍스트 대비 기준도 함께 걸린다.

구조적으로 보장 장치가 없다는 것은 확정이다. 실제 데이터가 기준을 넘는지는 `site/dev` config 를 열어 봐야 하는 보류 항목이다. 관리자 폼에 대비 계산과 경고를 넣거나, 렌더 시점에 대비가 부족하면 토큰 폴백으로 떨어뜨린다. 난이도는 중간이다.

### 참조되지 않는 키프레임과 남은 `will-change` (UI-P-28)

`LandingView.module.css:83-90` 의 `@keyframes glowDrift` 는 정의만 있고 저장소 어디에서도 `animation` 으로 참조되지 않는다. `.glow`(`:67-81`)에는 `transition` 과 `will-change: transform` 만 있다. `:285` 의 `.glow{animation:none}` 도 존재하지 않는 애니메이션을 끈다. 주석이 설명하는 "넘실거림"이 실제로 일어나지 않으므로 코드를 읽는 사람이 오해한다. `will-change: transform` 만 남아 합성 레이어를 유지한다.

의도한 연출이면 `animation` 을 붙이고, 아니면 키프레임과 주석과 `will-change` 를 함께 지운다. 난이도는 작다.

### 죽은 셀렉터 하나와 중복 선언 하나 (UI-S-22)

`SiteHeader.module.css:179` 의 `:global(html[data-mobile-navigation-hidden]) .header [data-mobile-menu-layer]` 는 매칭될 수 없다. `MobileMenu.tsx:134` 가 `createPortal(…, document.body)` 로 붙이므로 그 요소는 `.header` 하위가 아니다. "포털 요소가 헤더 안에 있다"는 잘못된 전제를 코드에 남긴다.

같은 항목의 `.controls > :not([data-mobile-menu-trigger]):not([data-mobile-menu-layer])` 는 죽은 규칙이 아니다. `:not()` 은 제외 조건이라 매칭 대상이 없어도 규칙이 정상 동작한다. 잉여 조건일 뿐이다.

`SiteFooter.module.css:125` 와 `:131` 의 `.copyright` 에 `padding: 4px 8px` 이 두 번 선언돼 있다. 하나로 합친다. 난이도는 작다.

### CLAUDE.md 의 섹션 액센트 색이 실제와 전부 다르다

문서 상단 표는 사진 `#0a84ff`, 음악 `#e5484d`, 개발 `#16a34a` 라고 적는다. `globals.css:68-70` 의 실제 값은 `#0066cc`, `#b4232d`, `#087a32` 다. 다크 보정(`:146-149`)은 `#4da3ff`, `#ff5b60`, `#2ecc71` 이다. 세 색이 전부 다르고, `#e5484d` 는 지금 다크 `--accent-press`(`:186`) 로만 남아 있다.

코드가 아니라 문서가 낡았다. 다만 `/design-check` 가 구현을 대조하는 기준 문서이므로, 이 표를 그대로 믿고 색을 "고치면" 실제 팔레트가 망가진다. CLAUDE.md 표의 세 값을 실제 토큰 값으로 바꾼다. 난이도는 작다.

## 반응형과 레이아웃

### 폭 900px 이하 마우스 환경에서 스크롤바가 둘 다 사라진다 (UI-S-02)

`globals.css:227` 의 미디어 조건 `(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)` 안에서 `:241-250` 이 `html:has([data-custom-scrollbar-ui])` 로 네이티브 스크롤바를 없앤다. 커스텀 트랙은 `CustomScrollbar.module.css:109` 의 `@media (max-width:900px), …` 에서 `display:none` 이 된다. `[data-custom-scrollbar-ui]` 요소는 `CustomScrollbar.tsx` 가 무조건 렌더하므로 숨겨져도 `:has()` 는 계속 매칭한다. 두 규칙의 조건이 다르다는 것이 원인이다.

데스크톱에서 창을 반쪽으로 줄이면(1440px 을 720px 로) 정확히 이 밴드에 들어간다. 흔한 사용 형태다. 그 구간에서 스크롤 위치와 문서 길이를 알려 주는 시각 단서가 하나도 없다. 스크롤 자체는 동작한다.

내부 스크롤 영역도 같다. `globals.css:292` 는 JS 가 붙이는 `html[data-custom-scrollbar]`(`CustomScrollbar.tsx:151`)에 걸려 있고 `ENABLE_QUERY`(`:11-12`)에는 폭 조건이 없다. 챗 메시지 목록, 블로그 목차, 지도 위치 목록이 같은 밴드에서 스크롤바를 잃는다.

네이티브를 끄는 조건과 커스텀을 켜는 조건이 문자 그대로 같은 미디어 쿼리여야 한다. 난이도는 작다.

### 모바일 첫 페인트에서 메이슨리가 4열로 그려졌다가 재배치된다 (UI-P-05)

`PhotoGrid.tsx:41` 의 `useState(4)` 가 초기 열 수를 고정하고, 실제 폭 계산은 `:43-48` 의 `useEffect` 안에서 일어난다. `columnCountFor`(`:23`)는 760px 이하에서 2를 돌려준다. SSR HTML 에는 열 div 가 4개 들어 있고 CSS(`:25-32`)는 2열이라, 모바일 하드 로드 첫 프레임에서 열 4개가 2×2로 접혀 사진이 잘못 배치된 화면이 보인 뒤 hydration 후 전체가 다시 깔린다. `priority={index<4}` 로 지정한 LCP 후보가 그 안에 있다.

`useSyncExternalStore` 로 `matchMedia` 를 구독하면 hydration 시점에 올바른 열 수를 얻는다. 같은 패턴이 `PhotoModal.tsx:68-74,121` 에 이미 있다. 난이도는 중간이다.

### 761px 부터 767px 사이에서 지도가 탭바 뒤로 잘린다 (UI-P-03)

`MapView.module.css:6` 은 `height: calc(100dvh - 76px)` 로 데스크톱 헤더를 가정하고, `:21` 의 모바일 분기는 `max-width: 760px` 에서 시작한다. 그런데 헤더 높이 전환점은 768px(`SiteHeader.module.css:18` 이 58px, `:23-25` 가 76px)이고 하단 탭바는 767px 이하에서 노출된다(`MobileTabBar.module.css:28-32`). 761px 부터 767px 사이에서는 헤더가 58px 이고 탭바 62px 이 실재하는데 지도가 데스크톱 분기를 타 상자가 44px 커진다. 지도 하단이 고정 탭바에 가리고 원치 않는 세로 스크롤이 생긴다. `photo/map/loading.module.css:5,37,41` 도 같다.

7px 폭 구간이라 마주칠 확률이 낮다. 하드코딩한 58px·76px 대신 레이아웃이 이미 노출한 `--public-content-height` 를 참조하는 편이 단일 출처 원칙에 맞다. 난이도는 작다.

### 모바일 시트와 라이트박스만 `dvh` 가 아닌 `vh` 를 쓴다 (UI-P-21)

`PhotoModal.module.css:186`(30vh)과 `:191`(82vh), `OnDemandPhotoModal.module.css:116`(30vh), `ImageLightbox.module.css:58`(88vh)이 `vh` 다. 저장소의 나머지는 `dvh` 나 `svh` 로 일관된다(`globals.css:207`, `layout.module.css:2`, `MapView.module.css:6`).

모바일 브라우저에서 `vh` 는 URL 바가 보일 때도 large viewport 기준이라 실제 보이는 높이보다 크다. 펼친 EXIF 패널 하단이 툴바에 가리고 라이트박스 이미지가 화면 밖으로 조금 넘어간다. 잘리는 정도는 기기별 툴바 높이에 따라 다르다. `ImageLightbox.tsx:72` 의 인라인 계산도 같이 바꾼다. 난이도는 작다.

### 앨범 스켈레톤이 실제 카드와 규격이 다르다 (UI-P-10)

`AlbumsSkeleton.module.css:20` 의 grid gap 이 `12px` 인데 실제는 `AlbumsView.module.css:22` 의 `clamp(16px, 2.4vw, 24px)` 다. `:26` 의 `.info{padding:12px 2px 0}` 도 `AlbumCard.module.css:36` 의 `var(--s-4)` 와 다르고, 스켈레톤 셀에는 카드가 가진 `1px solid var(--line)` 테두리가 없다. 다른 스켈레톤들은 실측 정합이 잘 돼 있어 앨범만 어긋난다.

데이터가 도착하는 순간 카드 간격이 벌어지고 테두리와 padding 두께만큼 세로로 밀린다. 이 이동이 CLS 점수에 계상되는지는 스켈레톤과 콘텐츠 교체가 라우트 전환 문맥이라 코드만으로 판정할 수 없다. Lighthouse 실측이 필요한 보류 항목이다. 규격을 맞추는 것 자체는 난이도가 작다.

### 커버 없는 프로젝트 카드가 폴백 이미지를 두 장 받는다 (UI-P-29)

`DevProjectCard.tsx:55-72` 가 커버가 없으면 라이트용과 다크용 `<Image unoptimized>` 를 동시에 렌더하고 CSS 로 한쪽만 보인다. `display:none` 인 `<img src>` 도 브라우저가 요청한다. 커버 없는 프로젝트가 여러 개면 요청이 배로 늘고 Supabase egress 와 Vercel 대역폭에 함께 계상된다.

`<picture>` 와 `<source media="(prefers-color-scheme: dark)">` 로 한 장만 받게 하거나, 테마 무관한 단일 폴백을 쓴다. 후자가 `[data-theme]` 수동 토글과도 맞는다. 난이도는 작다.

## 이중언어

### 결과 수 문구가 영어로 굳어 있다 (UI-P-06)

`GalleryView.tsx:68` 이 `` `${filter.visible.length} photos` ``, `AlbumCard.tsx:56` 이 `{subtitle} · {count} photos`, `AlbumDetailView.tsx:58` 이 같은 형태, `LocationList.tsx:75` 가 `{locations.length} spots` 를 렌더한다. `constants/dictionary.ts` 에 대응 키가 없다.

`/ko/photo`, `/ko/photo/albums`, `/ko/photo/map` 한국어 화면에 "12 photos"와 "7 spots"가 그대로 나온다. 단수 처리도 없어 "1 photos"가 된다. CLAUDE.md 의 "UI 표시 문자열은 ko/en 사전 경유" 규칙 위반이다.

`PageToolbar.tsx:18-19` 주석이 "두 언어에서 같은 표기를 쓴다"고 의도를 적어 두긴 했다. 그런데 그 결정이 사전에도 `design/README.md` 의 의도적 이탈 목록에도 없고, `AlbumCard` 와 `LocationList` 는 그 주석의 관할 밖이다. 규칙과 코드가 어긋난 채로 남아 있는 상태다.

사전에 카운트 포맷 함수를 추가해 네 곳을 교체하거나, 영어 표기를 유지하기로 확정했다면 그 결정을 `design/README.md` 에 명시한다. 난이도는 작다.

### 포스터 없는 연주에 "POSTER"가 노출된다 (UI-P-17)

`MusicWorksView.tsx:76` 과 `:116` 이 포스터 이미지가 없으면 리터럴 `"POSTER"` 를 렌더한다. 목록 카드와 상세 모달 두 곳이다. 사전을 거치지 않은 문자열이고 한국어 화면에도 영어로 나온다. 관리자가 포스터를 아직 올리지 않은 연주가 있으면 방문자가 그대로 본다.

사전 키를 추가하거나 중립적인 무늬로 대체한다. `DevProjectCard` 가 이미 폴백 이미지를 쓰고 있어 그 방식과 통일할 수 있다. 난이도는 작다.

### 초점거리 슬라이더의 접근 이름이 "min mm" 이다 (UI-P-26)

`RangeSlider.tsx:106` 과 `:116` 이 `aria-label={\`min ${unit}\`}` 과 `max` 를 쓴다. 호출부인 `FilterBar.tsx:110-119` 가 `unit="mm"` 를 넘기므로 한국어 화면에서 "min mm"으로 읽힌다. 무엇의 최소·최대인지도 이름에 없고 `aria-valuetext` 가 없어 값이 "24"처럼 단위 없이 읽힌다.

`minLabel`·`maxLabel` props 를 받아 `FilterBar` 가 사전 문구와 조합해 넘기고, 각 input 에 `aria-valuetext` 를 붙인다. 난이도는 작다.

두 thumb 이 겹쳐 포인터로 한쪽을 잡을 수 없다는 주장이 원 보고서에 있었으나, 브라우저별 range input z-order 에 의존해 코드만으로는 판정할 수 없다. 실제 조작 확인이 필요한 보류 항목이다.

### 404 화면이 URL 로케일 대신 저장된 언어를 쓴다 (UI-S-14)

`app/error.tsx` 와 `app/not-found.tsx` 는 `[lang]` 세그먼트 밖에 있어 `useLang()` 이 스토어 모드 LangProvider 를 읽는다. `app/[lang]/not-found.tsx` 는 존재하지 않는다.

언어를 한 번도 토글하지 않은 영어권 방문자가 `/en/bogus` 에 도달하면 한국어 404 문구를 보고, `not-found.tsx:31` 의 `LocalizedLink href={ROUTES.LANDING}` 이 `/ko` 로 보낸다. ADR-0002 의 "언어 URL 을 방문 중인 사용자를 다른 언어로 강제 전환하지 않는다"와 어긋난다. `[lang]/layout.tsx:40` 의 `notFound()` 도 같은 경로를 탄다.

공용 마크업을 컴포넌트로 빼고 `app/[lang]/not-found.tsx` 를 추가한다. 루트 파일은 로케일이 아예 없는 URL 의 폴백으로 남긴다. 난이도는 중간이다.

## 상태 표시와 모달

### 사진 상세 이전·다음 버튼의 비활성 상태가 무표시다 (UI-P-12)

`PhotoModal.tsx:509` 와 `:524` 가 `disabled={!canNavigatePrev}` 와 `!canNavigateNext` 를 걸지만 `PhotoModal.module.css` 전체에 `disabled` 문자열이 0건이다. 이미지 로딩 중, 그리고 모바일에서 EXIF 패널을 펼친 동안(`navigationLocked`) 버튼이 정상처럼 보이면서 반응하지 않는다. 후자는 지속 상태라 사용자가 고장으로 인식한다.

같은 저장소의 `ImageLightbox.module.css:131-134` 는 `.nav:disabled{opacity:.3;cursor:default}` 를 갖고 있다. 한 줄 추가로 끝나고 난이도는 작다.

### 없는 id 로 들어온 모달 딥링크가 아무 반응이 없다 (UI-P-25)

`use-query-modal.ts:29-30` 이 매칭되는 항목을 못 찾으면 `active` 가 null 이 되어 모달이 열리지 않고 쿼리는 URL 에 남는다. 비공개로 바뀐 연주나 프로젝트의 공유 링크를 받은 방문자는 목록만 보고 왜 상세가 안 열리는지 알 수 없으며, 남은 쿼리 때문에 뒤로가기 동작도 헷갈린다.

`?photo=` 는 이 경우를 처리한다. `OnDemandPhotoModal.tsx:126-137` 이 오류 문구를 보인다. `?work=`, `?award=`, `?project=` 세 종류만 처리가 없다. 최소한 쿼리를 정리해 URL 을 정상화한다. 난이도는 작다.

### 필터 결과 수 변화가 보조기술에 전달되지 않는다 (UI-P-15)

`PageToolbar.tsx:32` 의 count `<span>` 과 `PhotoGrid.tsx:107-116` 의 빈 상태 `<m.p>` 어디에도 `role="status"` 나 `aria-live` 가 없다. `/photo` 의 필터는 전부 클라이언트 갱신이라 페이지 이동 알림도 없다. 화면을 보지 않는 사용자가 태그 칩을 눌렀을 때 결과가 몇 건이 됐는지, 0건이 됐는지 알 방법이 없다. 무한 스크롤로 24장이 추가돼도 마찬가지다.

`OnDemandDevProjectDetail.tsx:25` 가 이미 `role={label ? "status" : undefined}` 패턴을 쓴다. 난이도는 작다.

### 동의 배너가 나타날 때 알림도 포커스 이동도 없다 (UI-S-15)

`AnalyticsConsentBanner.tsx:52-56` 이 `<section aria-label>` 로 렌더되고 `aria-live` 도 `role="dialog"` 도 없다. `position: fixed` 로 화면에 떠 있지만 DOM 상으로는 `{children}` 뒤다. 첫 방문 시 hydration 후 조용히 나타나므로 스크린리더 사용자는 페이지를 다 읽고 나서야 만난다. 푸터의 쿠키 설정 버튼으로 다시 열었을 때도 포커스가 버튼에 남아 무슨 일이 일어났는지 알 수 없다.

재오픈 경로에서는 배너로 포커스를 옮기고 닫을 때 트리거로 되돌린다. 최초 노출은 포커스를 훔치지 않는 편이 나으므로 sr-only `aria-live="polite"` 한 줄로 존재를 알린다. 난이도는 작다.

### 테마 토글이 현재 상태를 알리지 않는다 (UI-S-09)

`ThemeToggleButton.tsx:20` 의 라벨이 "테마 전환"으로 고정이고 `aria-pressed` 가 없다. 해와 달 SVG 는 `:30` 과 `:44` 에서 `aria-hidden` 이라 비시각 사용자에게 남는 피드백이 없다. 상태의 단일 출처를 React state 가 아니라 `html[data-theme]` 속성에 둔 설계 자체는 hydration mismatch 를 구조적으로 막는 좋은 선택이고, 없는 것은 알림 수단이다.

액션 버튼으로 구현돼 있어 4.1.2 가 요구하는 "상태"가 없으므로 WCAG 위반은 아니다. `toggleTheme` 안에서 `aria-pressed` 를 DOM 으로 직접 갱신하거나 별도 sr-only live 영역에 결과를 쓴다. 첫 페인트 정확성을 깨지 않는 DOM 직접 갱신이 안전하다. 난이도는 작다.

### 랜딩 진입 링크가 JS 실행 전까지 보이지 않는다 (UI-P-24)

`LandingView.module.css:213` 의 `.row{opacity:0}` 과 `RevealWords.module.css:12` 의 `.word{opacity:0}` 이 초기 상태다. `started` 는 `useIntroReady()` 가 스플래시 `animationend` 를 받은 뒤에야 true 가 되고 그때 visible 클래스가 붙는다. `prefers-reduced-motion` 은 `:262-269` 와 `:31-37` 이 커버하지만 JS 가 실행되지 않은 상태는 커버하지 않는다.

hydration 실패나 JS 차단 환경에서 랜딩의 유일한 내비게이션인 세 섹션 진입 행과 리드 문장이 화면에 나타나지 않는다. 요소는 DOM 에 있고 포커스도 되지만 눈에는 아무것도 보이지 않는다. `/` 는 사이트의 첫 화면이다.

초기 `opacity:0` 을 hydration 이후에만 적용하도록 클래스로 게이트하거나 `@media (scripting: none)` 폴백을 준다. 난이도는 중간이다.

### 검색 자동완성의 비동기 가드와 combobox 배선 (UI-S-19)

`use-search-suggestions.ts:36-40` 의 `void loadSearchIndex().then(setDocuments).catch(()=>{})` 에 언마운트 가드가 없다. 인덱스 fetch 중에 라우트가 바뀌면 사라진 컴포넌트에 setState 가 간다. React 18 이후 경고가 없어 눈에 띄지 않지만 불필요한 갱신이다. `use-ordered-admin.ts:50-66` 이 이미 `alive` 플래그 패턴을 쓴다.

`SearchBox.tsx:83` 의 `aria-controls={listboxId}` 는 항상 붙어 있는데 리스트박스는 `showList` 일 때만 렌더된다(`:106`). 닫힌 동안 존재하지 않는 id 를 가리킨다. ARIA 1.2 combobox 패턴은 팝업이 없을 때 생략을 허용한다. 방향키 처리와 `aria-activedescendant` 는 이미 있다. 난이도는 작다.

### 오버레이 드래그가 reduced-motion 을 일부만 존중한다 (UI-S-26)

`use-overlay-drag.ts:120-126` 의 `resetSwipeSurface` 는 `:124` 에서 `prefersReducedMotion()` 을 확인하는데, 같은 훅의 `resetSurface`(`:102-118`)와 dismiss 경로(`:305`, `:311`)는 확인하지 않는다. 모션 최소화를 켠 사용자에게도 240ms 복귀와 180ms 닫기 애니메이션이 재생된다. 한 훅 안에서 규칙이 갈린다.

두 경로에도 같은 조건을 붙이고, 닫기에서 애니메이션을 생략하면 `DISMISS_DELAY` 타이머도 함께 줄인다. 난이도는 작다.

## 셸 성능

### no-flash 섹션 스크립트가 로케일 URL 을 매칭하지 못한다 (UI-S-01)

`theme-script.ts:12` 가 `location.pathname` 을 `SECTION_BY_PREFIX`(`sections.ts:10-18`)와 직접 비교한다. 그 목록에 로케일이 없다. 실제 공개 URL 은 전부 `/ko/*` 나 `/en/*` 이므로 `/ko/music` 은 `"/music"` 과 같지도 않고 `"/music/"` 으로 시작하지도 않는다. 루프가 끝까지 돌아 섹션이 항상 기본값 `home` 이 되고, `globals.css:156-162` 가 `home` 을 photo 팔레트에 묶으므로 첫 페인트가 언제나 파랑이다. 런타임 교정은 `SectionAccent.tsx:19-23` 의 effect, 즉 hydration 이후다. 이 스크립트가 존재하는 유일한 이유가 그 flash 를 막는 것이다.

그런데 실제로는 대부분의 사용자가 flash 를 보지 않는다. `IntroSplash` 가 `(public)/layout.tsx:53` 에서 불투명 배경으로 첫 0.77초를 가리기 때문이다. 문제는 `IntroSplash.module.css:25-29` 가 `prefers-reduced-motion: reduce` 에서 스플래시를 `display:none` 으로 만든다는 점이다. 모션 최소화를 켠 사용자에게만 음악·개발·연락 페이지가 파랑으로 그려졌다가 제 색으로 튄다.

테스트가 회귀를 못 잡는다. `theme-script.test.ts:48,59` 가 `next.config` 의 308 대상인 무-로케일 경로만 검증한다. 스크립트 안에서 첫 세그먼트가 `ko` 나 `en` 이면 잘라낸 뒤 매칭하고, 테스트 경로를 `/ko/music` 계열로 바꿔 계약을 고정한다. 난이도는 작다.

### IntroSplash 가 매 하드 로드마다 재생되고 건너뛸 수 없다 (UI-P-31, UI-S-11)

`IntroSplash.module.css:1-11` 의 `position:fixed; inset:0; z-index:1000; background:var(--bg)` 오버레이가 `introDismiss 1.4s forwards` 로 재생된다. 키프레임(`:12-23`)은 0퍼센트부터 55퍼센트까지 완전 불투명이라 콘텐츠가 드러나기 시작하는 시점이 0.77초다. 새로고침, 직접 URL 진입, 외부 링크 유입마다 재생되고 클릭이나 키 입력으로 건너뛸 경로가 없다. 랜딩 진입 애니메이션이 여기에 종속돼 있다(`use-intro-ready.ts:23` 이 `animationend` 를 기다린다).

원 보고서의 두 주장은 정정이 필요하다. 첫째, "1.4초 동안 입력이 막힌다"는 틀렸다. `pointer-events: none` 이 100퍼센트 키프레임에만 있어 암묵 0퍼센트 키프레임과 discrete 보간이 적용되고, 진행률 0.5 즉 0.7초에 `none` 으로 전환된다. 콘텐츠가 드러나기 시작하는 시점과 거의 겹친다. 둘째, "모든 하드 내비게이션에 LCP 하한 1초가 생긴다"도 근거가 없다. Chrome 의 LCP 는 가림 판정을 하지 않으므로 불투명 레이어 뒤 요소도 페인트로 계상된다.

남는 것은 매번 0.77초를 기다리는 체감과 건너뛸 수 없다는 점이다. `z-index:1000` 이 `CustomCursor.module.css:15` 와 같은 값이라 스택 순서가 DOM 순서에 의존하는 것도 정리 대상이다.

이 항목은 앞의 UI-S-01, 그리고 랜딩의 UI-P-24 와 한 덩어리다. 스플래시가 섹션 flash 를 가려 주고, 랜딩 진입 애니메이션이 스플래시 종료에 종속돼 있다. 재생 시간을 줄이면 세 항목이 함께 움직이므로 따로 손대면 안 된다. 난이도는 중간이다.

### CustomScrollbar 가 body 전체 서브트리를 관찰한다 (UI-S-04)

`CustomScrollbar.tsx:229` 의 `new MutationObserver(scheduleUpdate)` 가 `:232` 에서 `document.body` 를 `{childList:true, subtree:true}` 로 관찰한다. `scheduleUpdate` 는 rAF 로 `update()`(`:112`)를 예약하고, `update()` 는 매번 `resolveScroller()`(`:49`)를 호출한다. 이 함수는 문서 전체에 `querySelectorAll` 을 두 번 돌리고(`:50`, `:54`) 후보마다 `getClientRects()` 와 `scrollHeight`·`clientHeight` 를 읽는다(`:60-63`).

페이지의 어떤 DOM 추가나 제거도 이 파이프라인을 깨운다. 이 셸에서 그런 변경은 상시 일어난다. 챗 스트리밍, `use-typing` 의 45에서 85밀리초 문자 순환, `AnimatePresence` 마운트와 언마운트, 갤러리 필터 재배치가 전부 해당한다. 스크롤 중에는 `:239` 의 capture 단계 scroll 리스너가 겹친다. `attributes: true` 를 켜지 않아 자기 쓰기로 인한 재귀가 없는 것은 올바른 설계다.

코드 경로는 명확하지만 실제 프레임 비용은 프로파일링이 필요한 보류 항목이다. `resolveScroller()` 결과를 캐시하고 실제 스크롤 컨테이너가 추가·제거될 때만 무효화하거나, DOM 조회 대신 명시적 레지스트리로 바꾼다. 난이도는 중간이다.

### 휠 이벤트마다 조상 체인에 `getComputedStyle` 을 돌린다 (UI-S-12)

`CustomCursor.tsx:50-76` 의 `findVerticalScroller` 가 target 에서 body 까지 올라가며 노드마다 `getComputedStyle(element).overflowY` 를 읽고 `scrollHeight` 와 `clientHeight` 를 비교한다. 실패하면 `documentElement` 와 `body` 를 두 번 더 읽는다. 호출부는 `:512`(mousedown)와 `:572`(onWheel)다. `wheel` 은 `:624` 에서 `passive:true` 로 등록되므로 스크롤을 막지는 않는다.

휠 이벤트는 스크롤당 수십 회 발생하고 `getComputedStyle` 은 강제 스타일 재계산을, `scrollHeight` 는 강제 레이아웃을 유발한다. 사진 상세 모달이나 블로그 본문처럼 깊은 트리에서 조상이 10단계를 넘으면 프레임당 그만큼의 동기 읽기가 쌓인다. 커스텀 커서는 `hover:hover` 와 `pointer:fine` 에서만 활성이라 데스크톱 마우스 환경 전용이다.

여기도 실제 프레임 비용은 프로파일링 대상이다. 휠 경로에서는 판정 결과를 짧게 캐시하거나, 스크롤 플래그를 세우는 용도라면 `wheel` 발생 자체를 신호로 쓴다. `onMouseDown` 은 저빈도라 현행으로 충분하다. 난이도는 중간이다.

### 이미지 줌이 제스처 프레임마다 레이아웃을 읽는다 (UI-S-18)

`use-image-zoom.ts:123-124` 가 `node.offsetWidth` 와 `offsetHeight` 를 읽고 `:129` 에서 곧바로 `node.style.transform` 을 쓴다. `:154` 의 `toLocalPoint` 은 `parent.getBoundingClientRect()` 를 읽는다. 두 함수 모두 터치 이동, 마우스 이동, 휠 핸들러에서 프레임마다 호출된다. 직전 프레임의 스타일 쓰기가 레이아웃을 무효화한 상태에서 다음 프레임이 `offsetWidth` 를 읽으므로 강제 동기 레이아웃이 프레임당 한두 번 발생한다. 핀치 도중 저사양 기기에서 체감될 수 있으나 실측이 필요하다.

제스처 시작 시점에 치수를 한 번 재서 ref 에 캐시하고 이동 중에는 캐시만 쓴다. `resize` 와 `resetKey` 변경 시 무효화한다. 난이도는 중간이다.

### `use-typing` 이 정지 조건 없는 타이머 루프다 (UI-S-16)

`use-typing.ts:34-56` 이 `setTimeout` 으로 자신을 무한 재예약하며 매 tick 마다 `setText` 와 `setIndex` 로 리렌더를 일으킨다. 정지 조건은 언마운트뿐이다. 요소가 뷰포트 밖으로 스크롤돼도 계속 돈다. 초당 12에서 22회의 리렌더가 상시 발생하고 위의 MutationObserver 와 겹친다. `:26` 의 `prefers-reduced-motion` 처리는 올바르다.

백그라운드 탭은 브라우저가 타이머를 1초 이상으로 스로틀하므로 실제 비용은 "화면 밖이지만 포그라운드"인 구간에 한정된다. `IntersectionObserver` 로 화면 밖일 때 멈춘다. 훅이 대상 ref 를 받도록 시그니처를 넓히면 된다. 난이도는 중간이다.

### 커서의 `will-change` 가 아무 효과가 없다 (UI-S-17)

`CustomCursor.module.css:36-41` 이 `width` 와 `height` 를 트랜지션하고 `:43` 이 `will-change: width, height` 를 건다. 컴포지터 승격은 `transform` 과 `opacity` 에만 적용되므로 레이아웃 속성을 적은 이 힌트는 아무 이득 없이 메모리 힌트만 남긴다. `:42` 의 `contain: layout style` 과 요소 크기가 작아 실질 비용은 낮지만, 커서는 포인터가 움직이는 내내 이 트랜지션을 탄다. `.cursor` 쪽의 `will-change: transform`(`:21`)은 적절하다.

`will-change: width, height` 제거는 즉시 할 수 있다. 고정 크기 컨테이너에 `transform: scale()` 로 바꾸는 근본 조치는 스냅 모드의 비균등 스케일과 자식 역보정이 필요해 작업량이 크다.

### 동의 스냅샷이 렌더마다 localStorage 를 읽는다 (UI-S-24)

`analytics-consent.ts:140-162` 의 `getAnalyticsConsentSnapshot()` 은 `volatileConsent` 캐시가 비어 있으면 `window.localStorage.getItem` 을 호출한다(`:151`). 그 캐시는 사용자가 동의를 선택한 뒤에만 채워지므로(`:193`), 아직 선택하지 않은 방문자에게는 매 getSnapshot 호출이 실제 저장소 읽기다. `cachedRaw` 비교는 읽기 이후라 읽기를 줄이지 못한다.

`useSyncExternalStore` 는 렌더마다, 렌더당 여러 번 getSnapshot 을 부른다. Provider 가 공개 트리 최상단에 있어 라우트 전환마다 재평가된다. 반환 참조는 안정화돼 있어 무한 렌더 위험은 없다.

첫 읽기 결과를 캐시하고 무효화는 `subscribeAnalyticsConsent` 의 이벤트에만 맡긴다. 그 함수는 이미 `:175` 에서 `cachedRaw` 를 비운다. 난이도는 작다.
