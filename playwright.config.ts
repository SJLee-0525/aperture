import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Next dev의 동시 on-demand compile이 client navigation을 재로드할 수 있어 직렬 실행한다.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  use: {
    baseURL,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      stylePath: path.resolve("e2e/visual/screenshot.css"),
    },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          "node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3100",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          NEXT_DIST_DIR: ".next-playwright-v7",
          NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve("e2e/fixtures/google-font-responses.cjs"),
          NEXT_PUBLIC_USE_MOCK: "1",
        },
      },
});
