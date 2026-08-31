import { describe, expect, it } from "vitest";

import {
  attachPerformanceTriage,
  buildPerformanceTriageCards,
  createPerformanceDiscordCard,
  DISCORD_EMBED_LIMIT,
  DISCORD_FIELD_LIMIT,
  embedLength,
  fitEmbed,
} from "@/lib/performance-alerts/discord-report";

import type { PerformanceTriageProviderResult } from "@/lib/performance-alerts/triage-provider";
import type { PerformanceTriageTarget } from "@/lib/performance-alerts/triage-schema";

const base = {
  targetUrl: "https://sungjoon.works/ko",
  formFactor: "phone",
  measuredAt: "2026-08-31T00:00:00Z",
  collectionPeriod: "2026-08-28",
  actionsRunUrl: "https://github.com/example/repo/actions/runs/1",
  artifactName: "core-web-vitals-snapshot",
};

const target = (
  targetIndex: number,
  overrides: Partial<PerformanceTriageTarget> = {},
): PerformanceTriageTarget => ({
  targetIndex,
  summary: `대상 ${targetIndex} 요약`,
  userImpact: "첫 화면이 늦게 표시됩니다.",
  likelyCauses: [`대상 ${targetIndex} 원인`],
  inspectFirst: ["LCP breakdown 진단"],
  recommendedChecks: ["npm run test:lighthouse:production"],
  confidence: "medium",
  ...overrides,
});

const analysisOf = (
  targets: PerformanceTriageTarget[],
  overrides: Partial<PerformanceTriageProviderResult> = {},
): PerformanceTriageProviderResult => ({
  result: { commonSummary: "공통 요약", commonCauses: ["공통 원인"], targets },
  provider: "openai",
  model: "model-id",
  ...overrides,
});

const alertCard = (host: string) =>
  createPerformanceDiscordCard({
    ...base,
    targetUrl: `https://${host}`,
    kind: "field",
    fieldSummary: "LCP: 4500ms, 이전 3000ms, +50.0%",
  })!;

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

describe("attachPerformanceTriage", () => {
  it("기본 수치 field를 유지하고 AI 설명과 provider를 추가한다", () => {
    const result = attachPerformanceTriage(alertCard("a.example"), target(0), "openai/model-id");
    expect(result.fields?.find((field) => field.name === "Field")?.value).toBe(
      "LCP: 4500ms, 이전 3000ms, +50.0%",
    );
    expect(result.fields?.find((field) => field.name === "AI 요약")?.value).toBe("대상 0 요약");
    expect(result.footer?.text).toBe("openai/model-id");
  });

  it("긴 AI 설명도 Discord 전체 제한 안으로 줄인다", () => {
    const result = attachPerformanceTriage(
      { title: "경고", color: 0, fields: [{ name: "Field", value: "f".repeat(1_024) }] },
      target(0, {
        summary: "s".repeat(300),
        userImpact: "u".repeat(300),
        likelyCauses: Array(4).fill("c".repeat(200)),
        inspectFirst: Array(4).fill("i".repeat(200)),
        recommendedChecks: Array(4).fill("r".repeat(200)),
      }),
      "gemini/model-id",
    );
    expect(embedLength(result)).toBeLessThanOrEqual(DISCORD_EMBED_LIMIT);
    expect(result.fields?.[0]?.name).toBe("Field");
  });
});

describe("buildPerformanceTriageCards", () => {
  it("대상이 하나면 상세 카드 한 장을 만든다", () => {
    const [card, ...rest] = buildPerformanceTriageCards(
      [{ card: alertCard("a.example"), label: "a.example" }],
      analysisOf([target(0)]),
    );
    expect(rest).toHaveLength(0);
    expect(card?.fields?.find((field) => field.name === "확인 순서")?.value).toContain(
      "1. LCP breakdown 진단",
    );
    expect(card?.footer?.text).toBe("openai/model-id · confidence medium");
  });

  it("여러 대상은 공통 분석과 대상별 요약을 담은 카드 한 장으로 만든다", () => {
    const [card, ...rest] = buildPerformanceTriageCards(
      [
        { card: alertCard("a.example"), label: "a.example" },
        { card: alertCard("b.example"), label: "b.example" },
      ],
      analysisOf([target(0), target(1)]),
    );
    expect(rest).toHaveLength(0);
    expect(card?.title).toBe("Core Web Vitals 통합 AI 분석");
    expect(card?.description).toContain("공통 요약");
    expect(card?.fields?.[0]).toMatchObject({ name: "공통 원인" });
    expect(card?.fields?.[1]?.name).toBe("a.example");
    expect(card?.fields?.[1]?.value).toContain("대상 0 요약");
    expect(card?.fields?.[2]?.name).toBe("b.example");
    expect(card?.fields?.[2]?.value).toContain("대상 1 요약");
    expect(card?.footer?.text).toBe("openai/model-id · 2개 대상 통합 분석");
  });

  it("대상 수와 분석 수가 어긋나면 분석을 붙이지 않는다", () => {
    const cards = [
      { card: alertCard("a.example"), label: "a.example" },
      { card: alertCard("b.example"), label: "b.example" },
    ];
    expect(buildPerformanceTriageCards(cards, analysisOf([target(0)]))).toEqual(
      cards.map((entry) => entry.card),
    );
  });

  it("상한을 넘는 대상은 버리지 않고 남은 대상 목록으로 알린다", () => {
    const entries = Array.from({ length: 12 }, (_, index) => ({
      card: alertCard(`host-${index}.example`),
      label: `host-${index}.example`,
    }));
    const [card] = buildPerformanceTriageCards(
      entries,
      analysisOf(Array.from({ length: 12 }, (_, index) => target(index))),
    );
    const overflow = card?.fields?.find((field) => field.name.startsWith("그 외"));
    expect(overflow?.name).toBe("그 외 4개 대상");
    expect(overflow?.value).toContain("host-11.example");
    expect(embedLength(card!)).toBeLessThanOrEqual(DISCORD_EMBED_LIMIT);
    expect(card?.fields?.at(-1)).toBe(overflow);
  });

  it("가장 긴 분석에서도 대상이 잘려 나가지 않는다", () => {
    const entries = Array.from({ length: 8 }, (_, index) => ({
      card: alertCard(`host-${index}.example`),
      label: `host-${index}.example`,
    }));
    const [card] = buildPerformanceTriageCards(
      entries,
      analysisOf(
        Array.from({ length: 8 }, (_, index) =>
          target(index, {
            summary: "s".repeat(300),
            likelyCauses: Array(4).fill("c".repeat(200)),
          }),
        ),
        { model: "m".repeat(50) },
      ),
    );
    expect(card?.fields?.filter((field) => field.name.startsWith("host-"))).toHaveLength(8);
    expect(embedLength(card!)).toBeLessThanOrEqual(DISCORD_EMBED_LIMIT);
  });
});
