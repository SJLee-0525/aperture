/**
 * 읽기 기준선 판정을 다시 해야 하는 순간마다 `measure` 를 부른다.
 *
 * 판정을 `IntersectionObserver` 에 맡기면 한 프레임에 요소가 관찰 영역을 통째로 지나갈 때
 * 교차 상태가 바뀌지 않아 콜백이 오지 않는다. 빠르게 스크롤하면 그 요소를 건너뛴 채 직전
 * 판정에 멈춘다. 프레임마다 위치를 직접 재면 이동 속도와 무관하게 값이 맞는다.
 *
 * @param {() => void} measure 위치를 재고 상태를 갱신하는 함수. 구독 즉시 한 번,
 *   이후에는 한 프레임에 최대 한 번 호출한다.
 * @returns {() => void} 구독 해제 함수.
 */
const observeReadingLine = (measure: () => void): (() => void) => {
  let frame = 0;

  const schedule = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      measure();
    });
  };

  measure();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  // 이미지가 늦게 실리면 스크롤 없이도 제목 위치가 밀린다.
  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(document.body);

  return () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    resizeObserver.disconnect();
  };
};

export { observeReadingLine };
