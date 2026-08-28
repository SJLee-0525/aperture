import { expect, type Page } from "@playwright/test";

import { commonAssertions } from "./common.assertions";

const photoAssertions = {
  async openPhoto(page: Page) {
    await page.getByRole("link", { name: "새벽의 항구" }).first().click();
    await expect(page).toHaveURL(/[?&]photo=p01/);
    await commonAssertions.dialogOpened(page, "새벽의 항구");
    await commonAssertions.closeDialog(page);
    await expect(page).not.toHaveURL(/[?&]photo=/);
  },

  async filterPhotos(page: Page) {
    await page.goto("/ko/photo?q=설원");
    await expect(page.getByRole("link", { name: "설원" })).toBeVisible();
    const square = page.getByRole("button", { name: "정사각" });
    await square.click();
    await expect(square).toHaveAttribute("aria-pressed", "true");
  },

  async openAlbum(page: Page) {
    const album = page.getByRole("link", { name: /도시의 밤/ });
    await expect(album).toHaveAttribute("href", "/ko/photo/albums/city-night");
    await album.click();
    await page.waitForURL(/\/ko\/photo\/albums\/city-night$/);
    await expect(page.getByRole("heading", { name: "도시의 밤" })).toBeVisible();
  },

  /**
   * 앨범 상세가 그 앨범의 사진만, 앨범이 정한 순서로 그리는지 본다.
   * 순서 규칙 자체는 `to-album-gallery-photos.test.ts` 가 뒤섞인 입력으로 고정한다.
   * 여기서 보는 것은 상세 페이지가 그 함수를 실제로 거치는지다 — 전체 사진 목록을
   * 그대로 그리거나 다른 정렬을 얹으면 개수와 id 가 어긋난다.
   */
  async albumShowsOnlyItsPhotosInOrder(page: Page) {
    await page.goto("/ko/photo/albums/city-night");
    const links = page.locator("main a[href*='photo=']");
    await expect(links.first()).toBeVisible();

    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((node) => new URL((node as HTMLAnchorElement).href).searchParams.get("photo")),
    );

    // mocks/albums.ts 의 city-night 가 나열한 넷. 전체 사진은 열두 장이다.
    expect(hrefs).toEqual(["p01", "p05", "p08", "p10"]);
  },

  async openMapPhoto(page: Page) {
    await page.locator("aside").getByRole("link").first().click();
    await expect(page).toHaveURL(/[?&]photo=/);
    await expect(page.getByRole("dialog").last()).toBeVisible();
    await commonAssertions.closeDialog(page);
  },
};

export { photoAssertions };
