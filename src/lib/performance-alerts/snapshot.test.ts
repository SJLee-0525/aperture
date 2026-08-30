import { describe, expect, it } from "vitest";

import {
  alertKey,
  parsePerformanceSnapshot,
  retainSentAlerts,
  SNAPSHOT_ARTIFACT_NAME,
} from "@/lib/performance-alerts/snapshot";

const validSnapshot = () => ({
  schemaVersion: 1,
  measuredAt: "2026-08-31T00:00:00.000Z",
  siteOrigin: "https://sungjoon.works",
  release: null,
  cruxCollectionPeriod: "2026-08-28",
  targets: [
    {
      id: "home",
      url: "https://sungjoon.works/ko",
      measurements: [
        {
          scope: "url",
          formFactor: "phone",
          collectionPeriod: "2026-08-28",
          metrics: [{ name: "LCP", value: 2_500, status: "good" }],
        },
      ],
    },
  ],
  sentAlerts: [{ key: "home:url:phone:LCP:poor:2026-08-28", sentAt: "2026-08-31T00:00:00Z" }],
});

describe("parsePerformanceSnapshot", () => {
  it("schemaVersion 1의 모든 중첩 값을 검증해 반환한다", () => {
    expect(parsePerformanceSnapshot(validSnapshot())).toMatchObject({
      schemaVersion: 1,
      targets: [{ id: "home", measurements: [{ metrics: [{ name: "LCP" }] }] }],
    });
  });

  it("데이터 부족 사유와 연속 횟수를 보존한다", () => {
    const snapshot = validSnapshot();
    snapshot.targets[0]!.measurements[0]!.metrics = [
      {
        name: "record",
        value: null,
        status: "insufficient_data",
        insufficientReason: "record_missing",
        consecutiveCount: 4,
      },
    ] as never;
    expect(parsePerformanceSnapshot(snapshot).targets[0]?.measurements[0]?.metrics[0]).toEqual({
      name: "record",
      value: null,
      status: "insufficient_data",
      insufficientReason: "record_missing",
      consecutiveCount: 4,
    });
  });

  it.each([
    [
      "schema version",
      (snapshot: ReturnType<typeof validSnapshot>) => void (snapshot.schemaVersion = 2),
    ],
    [
      "measuredAt",
      (snapshot: ReturnType<typeof validSnapshot>) => void (snapshot.measuredAt = "today"),
    ],
    [
      "collection period",
      (snapshot: ReturnType<typeof validSnapshot>) =>
        void (snapshot.cruxCollectionPeriod = "2026-02-30"),
    ],
    [
      "metric value",
      (snapshot: ReturnType<typeof validSnapshot>) =>
        void (snapshot.targets[0]!.measurements[0]!.metrics[0]!.value = -1),
    ],
  ])("잘못된 %s를 거부한다", (_label, mutate) => {
    const snapshot = validSnapshot();
    mutate(snapshot);
    expect(() => parsePerformanceSnapshot(snapshot)).toThrow();
  });
});

describe("alertKey", () => {
  it("중복 판정에 필요한 여섯 식별자를 모두 포함한다", () => {
    expect(
      alertKey({
        target: "home",
        scope: "url",
        formFactor: "phone",
        metric: "LCP",
        status: "poor",
        collectionPeriod: "2026-08-28",
      }),
    ).toBe("home:url:phone:LCP:poor:2026-08-28");
    expect(SNAPSHOT_ARTIFACT_NAME).toBe("core-web-vitals-snapshot");
  });
});

describe("retainSentAlerts", () => {
  it("90일보다 오래된 항목을 버리고 같은 key는 최신 한 건만 남긴다", () => {
    const result = retainSentAlerts(
      [
        { key: "expired", sentAt: "2026-05-01T00:00:00Z" },
        { key: "same", sentAt: "2026-08-01T00:00:00Z" },
        { key: "same", sentAt: "2026-08-30T00:00:00Z" },
      ],
      new Date("2026-08-31T00:00:00Z"),
    );
    expect(result).toEqual([{ key: "same", sentAt: "2026-08-30T00:00:00Z" }]);
  });
});
