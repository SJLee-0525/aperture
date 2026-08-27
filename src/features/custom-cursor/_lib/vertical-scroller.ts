const SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);

/**
 * 이벤트 대상에서 위로 올라가며 실제로 세로 스크롤이 가능한 조상을 찾는다.
 *
 * 조상 중에 없으면 문서 스크롤러를 쓰되, 루트나 body 가 스크롤을 막고 있으면 null 이다.
 * 모달이 열려 있는 동안이 그 상태이며, 그때 자동 스크롤을 걸면 뒤 지면이 움직인다.
 *
 * 휠마다 불리므로 캐시를 두자는 제안이 있었다. 글 상세(요소 479개) 본문 깊숙한 지점에서
 * 재보니 호출당 getComputedStyle 10회에 7µs 였다. 프레임 예산의 0.04% 라 캐시가 버는 것보다
 * 낡은 값을 돌려줄 위험이 크다. 조건이 달라지면 이 수치부터 다시 잰다.
 */
const findVerticalScroller = (eventTarget: EventTarget | null): HTMLElement | null => {
  let element = eventTarget instanceof HTMLElement ? eventTarget : null;

  while (element && element !== document.body && element !== document.documentElement) {
    const overflowY = getComputedStyle(element).overflowY;
    if (SCROLLABLE_OVERFLOW.has(overflowY) && element.scrollHeight > element.clientHeight + 1) {
      return element;
    }
    element = element.parentElement;
  }

  const scroller = document.scrollingElement ?? document.documentElement;
  const rootOverflowY = getComputedStyle(document.documentElement).overflowY;
  const bodyOverflowY = getComputedStyle(document.body).overflowY;
  if (
    !(scroller instanceof HTMLElement) ||
    rootOverflowY === "hidden" ||
    rootOverflowY === "clip" ||
    bodyOverflowY === "hidden" ||
    bodyOverflowY === "clip" ||
    scroller.scrollHeight <= scroller.clientHeight + 1
  ) {
    return null;
  }

  return scroller;
};

export { findVerticalScroller };
