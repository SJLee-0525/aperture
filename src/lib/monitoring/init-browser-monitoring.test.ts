import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => {
  const replay = {
    stop: vi.fn(() => Promise.resolve()),
  };
  return {
    close: vi.fn(() => Promise.resolve(true)),
    getClient: vi.fn((): object | null => ({})),
    getReplay: vi.fn(() => replay),
    init: vi.fn(),
    replay,
    replayIntegration: vi.fn(() => ({ name: "Replay" })),
    setTags: vi.fn(),
  };
});

vi.mock("@sentry/nextjs", () => sentry);
vi.mock("@/lib/monitoring/monitoring-dsn", () => ({ SENTRY_DSN: "https://public@sentry.test/1" }));
vi.mock("@/instrumentation-client", () => ({ setLoadedSentry: vi.fn() }));

import {
  closeBrowserMonitoring,
  initBrowserMonitoring,
} from "@/lib/monitoring/init-browser-monitoring";

describe("browser monitoring lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("클라이언트를 닫기 전에 Replay를 명시적으로 중지한다", async () => {
    await closeBrowserMonitoring();

    expect(sentry.replay.stop).toHaveBeenCalledOnce();
    expect(sentry.replay.stop.mock.invocationCallOrder[0]).toBeLessThan(
      sentry.close.mock.invocationCallOrder[0],
    );
  });

  it("관리자 모드로 바꿀 때 기존 공개 Replay를 먼저 중지한다", async () => {
    await initBrowserMonitoring("admin");

    expect(sentry.replay.stop).toHaveBeenCalledOnce();
    expect(sentry.replay.stop.mock.invocationCallOrder[0]).toBeLessThan(
      sentry.close.mock.invocationCallOrder[0],
    );
    expect(sentry.setTags).toHaveBeenCalledWith({ app_runtime: "browser", area: "admin" });
  });

  it("생략 시 수집 허용으로 돌아가는 모든 dataCollection 항목을 잠근다", async () => {
    sentry.getClient.mockReturnValueOnce(null);
    await initBrowserMonitoring("public");

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: { request: false, response: false },
          httpBodies: [],
          urlQueryParams: false,
          graphQL: { document: false, variables: false },
          genAI: { inputs: false, outputs: false },
          databaseQueryData: false,
          stackFrameVariables: false,
          frameContextLines: 0,
        },
      }),
    );
    expect(sentry.setTags).toHaveBeenCalledWith({ app_runtime: "browser", area: "public" });
  });
});
