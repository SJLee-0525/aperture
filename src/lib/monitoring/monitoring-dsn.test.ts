import { describe, expect, it } from "vitest";

import { isSentryDsnInRegion } from "./monitoring-dsn";

describe("isSentryDsnInRegion", () => {
  it.each([
    ["https://key@o1.ingest.us.sentry.io/1", "US"],
    ["https://key@o1.ingest.sentry.io/1", "US"],
    ["https://key@o1.ingest.de.sentry.io/1", "DE"],
  ] as const)("accepts a %s DSN for %s", (dsn, region) => {
    expect(isSentryDsnInRegion(dsn, region)).toBe(true);
  });

  it.each([
    ["https://key@o1.ingest.de.sentry.io/1", "US"],
    ["https://key@o1.ingest.us.sentry.io/1", "DE"],
    ["https://example.com/1", "US"],
    ["not-a-url", "DE"],
  ] as const)("rejects %s for %s", (dsn, region) => {
    expect(isSentryDsnInRegion(dsn, region)).toBe(false);
  });
});
