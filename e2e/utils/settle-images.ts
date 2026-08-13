import type { Page } from "@playwright/test";

/**
 * 모든 이미지가 결판날 때까지 기다린 뒤 페이지 높이가 멎는 것을 확인한다.
 *
 * 본문 이미지는 마크다운이 크기를 담지 않아 width/height 없는 `<img>` 로 그려진다
 * (`ArticleBody.tsx`). 로드 전에는 높이가 0이라, 뷰포트 밖 lazy 이미지가 늦게 로드되거나
 * 실패해 대체 이미지가 렌더되면 그 순간 페이지가 자란다. 시각 회귀에서는 fullPage 캡처
 * 높이가 흔들렸고(3736px ↔ 4639px), 목차 이동 테스트에서는 스크롤이 끝난 뒤 제목 위
 * 콘텐츠가 자라 제목이 기대 위치 아래로 밀렸다.
 *
 * lazy 를 eager 로 바꿔 전부 지금 요청시키고, 실패한 이미지는 대체 이미지를 새로 렌더하므로
 * 높이가 두 번 연속 같을 때까지 반복한다.
 *
 * @param {Page} page
 * @returns {Promise<void>}
 */
const settleImages = async (page: Page): Promise<void> => {
  let previousHeight = -1;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.locator("img").evaluateAll((images) =>
      Promise.all(
        images.map((element) => {
          const image = element as HTMLImageElement;
          image.loading = "eager";
          if (image.complete) return Promise.resolve(undefined);
          return new Promise((resolve) => {
            image.addEventListener("load", () => resolve(undefined), { once: true });
            image.addEventListener("error", () => resolve(undefined), { once: true });
          });
        }),
      ),
    );

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height === previousHeight) return;
    previousHeight = height;
  }
};

export { settleImages };
