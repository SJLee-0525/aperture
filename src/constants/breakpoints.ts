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

export { MOBILE_NAVIGATION_MAX_WIDTH, MOBILE_NAVIGATION_QUERY };
