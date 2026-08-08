type AutoScrollDirection = "idle" | "up" | "down";

const AUTO_SCROLL_DEAD_ZONE = 18;
const AUTO_SCROLL_MAX_SPEED = 1800;
const AUTO_SCROLL_GAIN = 8;

/**
 * 앵커로부터의 Y 거리(px)를 초당 스크롤 속도로 변환한다.
 *
 * @param {number} deltaY
 * @returns {number}
 */
const autoScrollVelocity = (deltaY: number): number => {
  const distance = Math.abs(deltaY);
  if (distance <= AUTO_SCROLL_DEAD_ZONE) return 0;

  const speed = Math.min(
    (distance - AUTO_SCROLL_DEAD_ZONE) * AUTO_SCROLL_GAIN,
    AUTO_SCROLL_MAX_SPEED,
  );
  return Math.sign(deltaY) * speed;
};

const autoScrollDirection = (velocity: number): AutoScrollDirection => {
  if (velocity < 0) return "up";
  if (velocity > 0) return "down";
  return "idle";
};

export { autoScrollDirection, autoScrollVelocity };
