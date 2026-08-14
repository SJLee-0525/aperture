import type { Page } from "@playwright/test";

/**
 * 이미지 로드가 끝나고 페이지 높이가 안정될 때까지 기다린다.
 *
 * 본문 이미지에는 크기 정보가 없어 로드 전 높이가 0이다. 뷰포트 밖 이미지가 늦게
 * 로드되거나 대체 이미지로 바뀌면 페이지 높이와 제목 위치도 달라진다.
 *
 * 모든 이미지를 eager로 전환한 뒤 높이가 두 번 연속 같아질 때까지 확인한다.
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
