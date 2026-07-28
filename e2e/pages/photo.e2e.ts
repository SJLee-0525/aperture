import { test } from "@playwright/test";

import { photoAssertions } from "../utils/assertions/photo.assertions";

test.describe("Photo", () => {
  test("사진을 검색하고 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/photo");
    await photoAssertions.filterPhotos(page);
    await page.goto("/photo");
    await photoAssertions.openPhoto(page);
  });

  test("앨범 카드를 클릭해 상세로 이동한다", async ({ page }) => {
    await page.goto("/photo/albums");
    await photoAssertions.openAlbum(page);
  });

  test("지도 위치를 클릭해 사진 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/photo/map");
    await photoAssertions.openMapPhoto(page);
  });
});
