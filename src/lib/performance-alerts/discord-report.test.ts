import { describe, expect, it } from "vitest";

import {
  createPerformanceDiscordCard,
  DISCORD_EMBED_LIMIT,
  DISCORD_FIELD_LIMIT,
  embedLength,
  fitEmbed,
} from "@/lib/performance-alerts/discord-report";

const base = {
  targetUrl: "https://sungjoon.works/ko",
  formFactor: "phone",
  measuredAt: "2026-08-31T00:00:00Z",
  collectionPeriod: "2026-08-28",
  actionsRunUrl: "https://github.com/example/repo/actions/runs/1",
  artifactName: "core-web-vitals-snapshot",
};

describe("createPerformanceDiscordCard", () => {
  it.each([
    ["field", "field"],
    ["lab", "lab"],
    ["combined", "field 및 lab"],
    ["insufficient_data", "데이터 부족"],
  ] as const)("%s 카드를 만든다", (kind, title) => {
    const card = createPerformanceDiscordCard({
      ...base,
      kind,
      fieldSummary: kind === "lab" ? undefined : "LCP 4,100ms, 이전 3,400ms, +20.6%",
      labSummary: kind === "field" || kind === "insufficient_data" ? undefined : "LCP 3,200ms",
    });
    expect(card?.title).toContain(title);
    expect(card?.fields?.at(-1)?.value).toContain("Actions run");
    expect(card?.footer?.text).toBe("AI 분석 없음");
  });

  it("정상 상태에서는 카드를 만들지 않는다", () => {
    expect(createPerformanceDiscordCard(null)).toBeNull();
  });

  it("baseline은 명시적으로 요청할 때만 만든다", () => {
    const report = { ...base, kind: "baseline" as const };
    expect(createPerformanceDiscordCard(report)).toBeNull();
    expect(createPerformanceDiscordCard(report, true)?.title).toContain("기준선");
  });

  it("field와 embed 전체 길이를 Discord 제한 안으로 줄인다", () => {
    const card = fitEmbed({
      title: "t".repeat(500),
      description: "d".repeat(5_000),
      color: 0,
      fields: Array.from({ length: 10 }, (_, index) => ({
        name: `field ${index}`,
        value: "v".repeat(2_000),
      })),
      footer: { text: "f".repeat(3_000) },
    });
    expect(card.fields?.every((field) => field.value.length <= DISCORD_FIELD_LIMIT)).toBe(true);
    expect(embedLength(card)).toBeLessThanOrEqual(DISCORD_EMBED_LIMIT);
  });
});
