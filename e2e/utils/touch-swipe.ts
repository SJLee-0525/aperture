import type { Page } from "@playwright/test";

type SwipeOptions = {
  /** 터치 시작 x 좌표. */
  from: number;
  /** 터치 종료 x 좌표. */
  to: number;
  y: number;
  steps?: number;
  /** 각 이동 사이의 간격. 속도 판정에 쓰이므로 테스트가 정한다. */
  intervalMs?: number;
};

/**
 * 가로 터치 드래그를 보낸다.
 * Playwright 의 touchscreen 은 탭만 지원해 CDP 로 직접 터치 포인트를 흘린다.
 *
 * @param page Chromium 컨텍스트여야 한다.
 * @param onMove 각 이동 직후 실행할 검사. 드래그 도중 화면 상태를 볼 때 쓴다.
 */
const swipeHorizontally = async (
  page: Page,
  { from, to, y, steps = 10, intervalMs = 16 }: SwipeOptions,
  onMove?: (step: number) => Promise<void>,
): Promise<void> => {
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from, y }],
  });

  for (let step = 1; step <= steps; step += 1) {
    const x = from + ((to - from) * step) / steps;
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await onMove?.(step);
    await page.waitForTimeout(intervalMs);
  }

  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
};

export { swipeHorizontally };
