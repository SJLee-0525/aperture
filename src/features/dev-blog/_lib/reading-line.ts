/**
 * 읽고 있다고 보는 가로선의 화면 상단 offset(px).
 *
 * 고정 헤더(데스크톱 76 · 모바일 58)보다 아래에 두어 헤더에 가린 제목이 현재 위치로 잡히지
 * 않게 한다. 본문 heading 의 `scroll-margin-top`(64px)보다도 커야 목차로 이동한 직후 그 제목이
 * 곧바로 현재 항목이 된다.
 */
const READING_LINE_PX = 96;

/**
 * 현재 위치 판정에 쓰는 관찰 밴드.
 *
 * 위는 읽기 기준선까지 잘라 내고 아래는 화면의 20%만 남긴다. 밴드를 화면 전체로 두면 스크롤
 * 한 번에 여러 heading 이 함께 걸려 어느 것이 현재인지 흔들린다.
 */
const READING_BAND_ROOT_MARGIN = `-${READING_LINE_PX}px 0px -80% 0px`;

export { READING_BAND_ROOT_MARGIN };
