import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * 관리자 E2E 는 프로덕션 모드에서 돌 수 없다.
 *
 * `/admin/*` 은 `AuthGuard` 를 지나야 하고, 그 통과 조건은 `isAdmin || testSession` 이다.
 * `testSession` 을 여는 `NEXT_PUBLIC_ADMIN_TEST_SESSION` 은 번들에 박히는 빌드 시점 값인데
 * `lib/auth/test-admin-session.ts` 가 프로덕션 빌드에서 그 값이 켜져 있으면 즉시 throw 한다 —
 * 인증 우회가 배포에 섞이지 않게 하려고 일부러 둔 가드다. 실 Supabase 계정도 쓰지 않으므로
 * `isAdmin` 도 참이 될 수 없다.
 *
 * 그래서 프로덕션 실행에서는 이 디렉터리를 아예 수집하지 않고, CI 의 `Admin E2E` 잡이 dev
 * 서버로 따로 돌린다. 스펙마다 `test.skip` 을 흩어 두는 대신 한 곳에서 끊는다.
 */
const PRODUCTION_MODE_IGNORE = process.env.E2E_PRODUCTION === "1" ? ["**/e2e/admin/**"] : [];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  testIgnore: PRODUCTION_MODE_IGNORE,
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
    // 일반 E2E는 비차단 상태로 시작한다. 동의 전용 스펙만 init script에서 이 값을 제거한다.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [
            {
              name: "ap-consent:v3",
              value: JSON.stringify({
                analytics: "denied",
                monitoring: "denied",
                expiresAt: Date.now() + 86_400_000,
              }),
            },
          ],
        },
      ],
    },
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
          NEXT_PUBLIC_GA_ID: "G-E2ETEST",
          NEXT_PUBLIC_FORCE_ANALYTICS_CONSENT_BANNER: "0",
          // 이 경로는 항상 next dev 다. 프로덕션 모드 실행은 e2e/run.cjs 가 맡고 거기서는 켜지 않는다.
          NEXT_PUBLIC_ADMIN_TEST_SESSION: "1",
        },
      },
});
