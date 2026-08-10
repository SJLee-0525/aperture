import { describe, expect, it } from "vitest";

import { resolveMonitoringEnvironment } from "@/lib/monitoring/monitoring-environment";

describe("resolveMonitoringEnvironment", () => {
  it("Vercel 환경이 있으면 production과 preview를 구분한다", () => {
    expect(resolveMonitoringEnvironment("preview", "production")).toBe("preview");
    expect(resolveMonitoringEnvironment("production", "production")).toBe("production");
  });

  it("Vercel 시스템 변수가 없으면 NODE_ENV로 폴백한다", () => {
    expect(resolveMonitoringEnvironment(undefined, "production")).toBe("production");
    expect(resolveMonitoringEnvironment(undefined, "development")).toBe("development");
    expect(resolveMonitoringEnvironment(undefined, "test")).toBe("test");
  });
});
