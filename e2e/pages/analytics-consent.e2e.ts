import { expect, test } from "@playwright/test";

const CONSENT_KEY = "ap-analytics-consent:v1";

test.describe("분석 동의", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => localStorage.removeItem(key), CONSENT_KEY);
    await page.route("https://www.googletagmanager.com/gtag/js**", async (route) => {
      await route.fulfill({ contentType: "application/javascript", body: "/* mocked gtag */" });
    });
  });

  test("미동의 상태에서는 Google tag를 요청하지 않고 거부를 저장한다", async ({ page }) => {
    const tagRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("googletagmanager.com/gtag/js")) tagRequests.push(request.url());
    });

    await page.goto("/ko");
    await expect(page.getByRole("region", { name: "분석 쿠키 선택" })).toBeVisible();
    expect(tagRequests).toEqual([]);

    await page.getByRole("button", { name: "거부" }).click();
    await expect(page.getByRole("region", { name: "분석 쿠키 선택" })).toBeHidden();
    expect(tagRequests).toEqual([]);

    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      CONSENT_KEY,
    );
    expect(stored.value).toBe("denied");
    expect(stored.expiresAt).toBeGreaterThan(Date.now());
  });

  test("허용한 뒤에만 Google tag를 요청하고 Footer에서 선택을 다시 연다", async ({ page }) => {
    await page.goto("/en");
    const tagRequest = page.waitForRequest(/googletagmanager\.com\/gtag\/js/);
    await page.getByRole("button", { name: "Allow analytics" }).click();
    await tagRequest;

    await page.getByRole("button", { name: "Privacy & cookie settings" }).click();
    await expect(page.getByRole("region", { name: "Analytics cookie choice" })).toBeVisible();
    await page.getByRole("button", { name: "Decline" }).click();
    await expect(page.getByRole("region", { name: "Analytics cookie choice" })).toBeHidden();

    await page.getByRole("button", { name: "Privacy & cookie settings" }).click();
    await page.getByRole("button", { name: "Allow analytics" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const consentCommands = (window.dataLayer ?? [])
            .map((entry) => Array.from(entry as ArrayLike<unknown>))
            .filter(([command, action]) => command === "consent" && action === "update");
          const state = consentCommands.at(-1)?.[2] as { analytics_storage?: string } | undefined;
          return state?.analytics_storage;
        }),
      )
      .toBe("granted");
  });

  test("배너가 열린 동안에도 챗봇 런처를 사용할 수 있다", async ({ page }) => {
    await page.goto("/ko");

    await expect(page.getByRole("region", { name: "분석 쿠키 선택" })).toBeVisible();
    await page.getByRole("button", { name: "챗봇 열기" }).click();
    await expect(page.getByRole("dialog", { name: "Ask Sungjoon." })).toBeVisible();
  });

  test("언어 선택은 분석 동의를 만들지 않는다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "언어 메뉴는 데스크톱에서 대표 검증");
    await page.goto("/ko");
    await page.getByRole("button", { name: "거부" }).click();
    await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY);

    await page.getByRole("button", { name: "언어" }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBeNull();
    expect(await page.context().cookies()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "ap-lang-pref-v1", value: "en", sameSite: "Lax" }),
      ]),
    );
  });

  test("Primary 버튼은 챗봇 런처와 같은 섹션 색을 사용한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "섹션 색은 데스크톱에서 대표 검증");

    for (const path of ["/ko", "/ko/photo", "/ko/music", "/ko/dev", "/ko/contact", "/ko/privacy"]) {
      await page.goto(path);

      const primary = page.getByRole("button", { name: "분석 허용" });
      const chatLauncher = page.getByRole("button", { name: "챗봇 열기" });
      await expect(primary).toBeVisible();

      await expect
        .poll(
          async () =>
            Promise.all([
              primary.evaluate((element) => getComputedStyle(element).backgroundColor),
              chatLauncher.evaluate((element) => getComputedStyle(element).backgroundColor),
            ]).then(([primaryColor, launcherColor]) => primaryColor === launcherColor),
          { message: `${path}의 Primary 버튼과 챗봇 런처 색` },
        )
        .toBe(true);
    }
  });
});
