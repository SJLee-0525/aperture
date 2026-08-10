import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  setTags: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => sentry);
vi.mock("@/lib/monitoring/monitoring-dsn", () => ({
  SENTRY_DSN: "https://key@o1.ingest.sentry.io/1",
}));

describe("Sentry server runtime configs", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Node 이벤트를 preview의 server 영역으로 분류하고 최소 수집 정책을 유지한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");

    await import("../../../sentry.server.config");

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://key@o1.ingest.sentry.io/1",
        enabled: true,
        environment: "preview",
        tracesSampleRate: 0,
        dataCollection: expect.objectContaining({
          userInfo: false,
          cookies: false,
          httpBodies: [],
          urlQueryParams: false,
          stackFrameVariables: false,
        }),
        beforeSend: expect.any(Function),
      }),
    );
    expect(sentry.setTags).toHaveBeenCalledWith({ app_runtime: "node", area: "server" });
    expect(sentry.init.mock.invocationCallOrder[0]).toBeLessThan(
      sentry.setTags.mock.invocationCallOrder[0],
    );
  });

  it("Edge 이벤트를 production의 proxy 영역으로 분류한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");

    await import("../../../sentry.edge.config");

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        environment: "production",
        tracesSampleRate: 0,
        beforeSend: expect.any(Function),
      }),
    );
    expect(sentry.setTags).toHaveBeenCalledWith({ app_runtime: "edge", area: "proxy" });
    expect(sentry.init.mock.invocationCallOrder[0]).toBeLessThan(
      sentry.setTags.mock.invocationCallOrder[0],
    );
  });

  it("Vercel 환경값이 없는 비프로덕션 Node 실행은 전송을 비활성화한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");

    await import("../../../sentry.server.config");

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, environment: "development" }),
    );
    expect(sentry.setTags).toHaveBeenCalledWith({ app_runtime: "node", area: "server" });
  });
});
