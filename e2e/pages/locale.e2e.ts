import { expect, test } from "@playwright/test";

/** 경로 기반 i18n — 무-로케일 리다이렉트·hreflang·언어 토글 내비게이션 검증. */
test.describe("경로 기반 i18n", () => {
  test("루트는 브라우저 언어를 따르고 v1 URL은 /ko로 체인 없이 직행한다", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ko$/);

    await page.goto("/dev/projects");
    await expect(page).toHaveURL(/\/ko\/dev\/projects$/);

    // v1 사진 URL — /albums → /ko/photo/albums 직행 (중간 /photo/albums 경유 없음)
    await page.goto("/albums");
    await expect(page).toHaveURL(/\/ko\/photo\/albums$/);
  });

  test("루트 요청의 언어·쿠키 우선순위와 캐시 계약", async ({ request }) => {
    const korean = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" },
    });
    expect(korean.status()).toBe(307);
    expect(korean.headers().location).toMatch(/\/ko$/);
    expect(korean.headers()["cache-control"]).toBe("private, no-store");
    expect(korean.headers()["set-cookie"]).toBeUndefined();

    const english = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8" },
    });
    expect(english.status()).toBe(307);
    expect(english.headers().location).toMatch(/\/en$/);

    const cookieWins = await request.get("/?a=1&a=2", {
      maxRedirects: 0,
      headers: {
        "Accept-Language": "ko-KR",
        Cookie: "ap-lang-pref-v1=en",
      },
    });
    expect(cookieWins.headers().location).toMatch(/\/en\?a=1&a=2$/);
  });

  test("지원하지 않는 언어 세그먼트는 404", async ({ page }) => {
    const response = await page.goto("/fr/dev");
    expect(response?.status()).toBe(404);
  });

  test("html lang과 hreflang 상호 참조를 언어별로 출력한다", async ({ page }) => {
    await page.goto("/ko/dev");
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute(
      "href",
      /\/ko\/dev$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/en\/dev$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/ko\/dev$/,
    );

    await page.goto("/en/dev");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/dev$/);
  });

  test("정책 문서가 언어별 canonical과 상호 참조를 제공한다", async ({ page }) => {
    for (const [path, koTitle, enTitle] of [
      ["privacy", "개인정보 처리방침", "Privacy Policy"],
      ["terms", "사이트 이용 및 콘텐츠 안내", "Site Use & Content Notice"],
      ["accessibility", "접근성 안내", "Accessibility Statement"],
    ] as const) {
      await page.goto(`/ko/${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(koTitle);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`/ko/${path}$`),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        "href",
        new RegExp(`/en/${path}$`),
      );

      await page.goto(`/en/${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(enTitle);
    }
  });

  test("좁은 화면에서는 정책 표 안에서만 가로 스크롤한다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ko/privacy");

    const tableRegion = page.getByRole("region", { name: "처리 정보와 보유 기간 표" });
    await expect(tableRegion).toBeVisible();
    expect(await tableRegion.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    expect(
      await tableRegion
        .locator("xpath=ancestor::section")
        .evaluate((section) => section.scrollWidth === section.clientWidth),
    ).toBe(true);
    await tableRegion.focus();
    await expect(tableRegion).toBeFocused();
  });

  test("정책 문서의 페이지·표 스크롤바는 파란 legal 액센트를 사용한다", async ({ page }) => {
    for (const route of ["/ko/privacy", "/ko/terms", "/ko/accessibility"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-section", "legal");

      const colors = await page.evaluate(() => {
        const pageTrack = document.querySelector<HTMLElement>("[data-custom-scrollbar-ui]");
        if (!pageTrack) return null;
        return {
          page: getComputedStyle(pageTrack).getPropertyValue("--scrollbar-accent").trim(),
          blue: getComputedStyle(document.documentElement)
            .getPropertyValue("--accent-photo")
            .trim(),
        };
      });

      expect(colors?.page).toBe(colors?.blue);
    }

    await page.goto("/ko/privacy");
    const tableColors = await page
      .locator(".legal-document-table-scroll")
      .first()
      .evaluate((tableScroll) => ({
        table: getComputedStyle(tableScroll).getPropertyValue("--legal-scrollbar-accent").trim(),
        blue: getComputedStyle(document.documentElement).getPropertyValue("--accent-photo").trim(),
      }));
    expect(tableColors.table).toBe(tableColors.blue);
  });

  test("언어 토글이 같은 페이지의 다른 언어 경로로 이동한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "토글 UI는 데스크톱에서 대표 검증");

    await page.goto("/ko/dev/projects");
    await page.getByRole("button", { name: "언어" }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/dev\/projects$/);

    // 양방향 — en에서 다시 ko로 (버튼 라벨은 현재 언어 사전을 따른다)
    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitemradio", { name: "한국어" }).click();
    await expect(page).toHaveURL(/\/ko\/dev\/projects$/);
  });
});
