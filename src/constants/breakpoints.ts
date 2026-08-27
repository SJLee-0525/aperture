/**
 * 모바일 내비게이션(앱바 + 버거 시트 + 하단 탭바)이 데스크톱 mega-menu 를 대신하는 최대 폭.
 *
 * 900px 인 이유는 헤더가 그보다 좁으면 들어가지 않아서다. 한국어 라벨은 810px 미만에서 세 줄로
 * 접히고, 영어 라벨은 830px 미만에서 헤더 안쪽이 가로로 넘친다. 여유를 두고 저장소가 이미
 * 쓰는 경계(커스텀 스크롤바 900/901)에 맞췄다.
 *
 * CSS 는 이 값을 읽을 수 없다. 미디어 쿼리를 쓰는 파일들이 같은 숫자를 각자 적고 있으므로,
 * 이 값을 바꾸면 `(max-width: 899px)` 와 `(min-width: 900px)` 를 함께 찾아 고쳐야 한다.
 * 대상은 헤더·모바일 메뉴·탭바·검색창·언어/테마 토글·공개 레이아웃 높이·지도 높이·챗 런처·
 * 푸터 탭바 여백이다.
 */
const MOBILE_NAVIGATION_MAX_WIDTH = 899;

/** 위 폭의 미디어 쿼리 형태. `matchMedia` 소비자가 같은 문자열을 쓰게 한다. */
const MOBILE_NAVIGATION_QUERY = `(max-width: ${MOBILE_NAVIGATION_MAX_WIDTH}px)`;

/**
 * 사진 그리드의 열 수 경계. 좁은 쪽부터 적는다.
 *
 * `PhotoGrid.module.css` 의 `@media` 와 같은 값이어야 한다. 그리드는 열마다 div 를 만들고
 * CSS 가 열 수를 정하므로, 둘이 어긋나면 사진이 빈 칸에 그려지거나 한 열이 비어 보인다.
 * CSS 는 이 상수를 읽을 수 없어 숫자가 두 곳에 남는다.
 *
 * `next/image` 의 `sizes` 도 같은 경계를 쓴다. 열 수가 곧 뷰포트 대비 타일 폭이다.
 */
const PHOTO_GRID_BREAKPOINTS = [
  { maxWidth: 760, columns: 2 },
  { maxWidth: 1100, columns: 3 },
] as const;

/** 위 경계를 모두 넘겼을 때의 열 수. */
const PHOTO_GRID_DESKTOP_COLUMNS = 4;

/** 열 수를 뷰포트 대비 타일 폭으로 옮긴 `next/image` sizes 문자열. */
const PHOTO_GRID_IMAGE_SIZES = [
  ...PHOTO_GRID_BREAKPOINTS.map(
    ({ maxWidth, columns }) => `(max-width: ${maxWidth}px) ${Math.round(100 / columns)}vw`,
  ),
  `${Math.round(100 / PHOTO_GRID_DESKTOP_COLUMNS)}vw`,
].join(", ");

export {
  MOBILE_NAVIGATION_MAX_WIDTH,
  MOBILE_NAVIGATION_QUERY,
  PHOTO_GRID_BREAKPOINTS,
  PHOTO_GRID_DESKTOP_COLUMNS,
  PHOTO_GRID_IMAGE_SIZES,
};
