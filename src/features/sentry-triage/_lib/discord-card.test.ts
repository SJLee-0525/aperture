import { describe, expect, it } from "vitest";

import {
  buildDiscordCard,
  LIMIT,
  NOISE_COLOR,
  SEVERITY_COLOR,
  UNTRIAGED_COLOR,
} from "@/features/sentry-triage/_lib/discord-card";

import type { SentryAlertSummary, TriageOutcome, TriageResult } from "@/types/sentry-alert";

const alert = (overrides: Partial<SentryAlertSummary> = {}): SentryAlertSummary => ({
  issueId: "issue-1",
  eventId: "event-1",
  title: "TypeError: cannot read properties of undefined",
  culprit: "GalleryView",
  level: "error",
  environment: "production",
  release: "abc1234",
  webUrl: "https://sentry.io/organizations/o/issues/1/events/2/",
  triggeredRule: "New backend issue",
  tags: { app_runtime: "node", area: "server" },
  frames: [],
  ...overrides,
});

const result = (overrides: Partial<TriageResult> = {}): TriageResult => ({
  severity: "high",
  isNoise: false,
  userImpact: "사진 상세를 열면 빈 화면이 보인다.",
  probableCause: "photo.image 가 없는 문서를 렌더에서 그대로 참조한다.",
  suspectArea: "GalleryView.tsx",
  recommendedActions: ["빈 image 문서를 필터한다", "렌더 전에 기본값을 채운다"],
  confidence: "medium",
  ...overrides,
});

const ok = (overrides: Partial<TriageResult> = {}): TriageOutcome => ({
  status: "ok",
  result: result(overrides),
  provider: "openai",
  model: "gpt-5.6-luna",
  latencyMs: 1200,
});

describe("buildDiscordCard", () => {
  it("판정 결과를 심각도 색과 접두사로 표시한다", () => {
    const card = buildDiscordCard(alert(), ok());

    expect(card.title).toBe("[높음] TypeError: cannot read properties of undefined");
    expect(card.color).toBe(SEVERITY_COLOR.high);
    expect(card.url).toBe("https://sentry.io/organizations/o/issues/1/events/2/");
    expect(card.description).toBe("사진 상세를 열면 빈 화면이 보인다.");
  });

  it("권장 조치를 번호 목록으로 넣는다", () => {
    const card = buildDiscordCard(alert(), ok());

    expect(card.fields?.[1]).toEqual({
      name: "권장 조치",
      value: "1. 빈 image 문서를 필터한다\n2. 렌더 전에 기본값을 채운다",
    });
  });

  it("의심 위치를 추정 원인과 함께 담는다", () => {
    const card = buildDiscordCard(alert(), ok());

    expect(card.fields?.[0]?.value).toContain("위치: GalleryView.tsx");
  });

  it("노이즈 판정은 심각도와 무관하게 회색으로 내린다", () => {
    const card = buildDiscordCard(alert(), ok({ isNoise: true, severity: "critical" }));

    expect(card.color).toBe(NOISE_COLOR);
    expect(card.title).toBe("[노이즈] TypeError: cannot read properties of undefined");
  });

  it("환경·릴리즈·규칙·모델을 푸터에 남긴다", () => {
    const card = buildDiscordCard(alert(), ok());

    expect(card.footer?.text).toBe(
      "production · abc1234 · New backend issue · openai/gpt-5.6-luna · 확신도 medium",
    );
  });

  it("조치가 비면 해당 field 를 만들지 않는다", () => {
    const card = buildDiscordCard(alert(), ok({ recommendedActions: [] }));

    expect(card.fields).toHaveLength(1);
  });

  describe("길이 제한", () => {
    it("제목을 상한에서 자르고 말줄임표를 남긴다", () => {
      const card = buildDiscordCard(alert({ title: "가".repeat(400) }), ok());

      expect(card.title).toHaveLength(LIMIT.title);
      expect(card.title.endsWith("…")).toBe(true);
    });

    it("field 값을 상한에서 자른다", () => {
      const card = buildDiscordCard(alert(), ok({ recommendedActions: ["나".repeat(2000)] }));

      expect(card.fields?.[1]?.value).toHaveLength(LIMIT.fieldValue);
    });

    it("합계 상한을 넘으면 뒤쪽 field 부터 버린다", () => {
      const card = buildDiscordCard(
        alert(),
        ok({
          userImpact: "다".repeat(LIMIT.description),
          recommendedActions: ["라".repeat(900)],
        }),
      );

      const total =
        card.title.length +
        (card.description?.length ?? 0) +
        (card.footer?.text.length ?? 0) +
        (card.fields ?? []).reduce((sum, f) => sum + f.name.length + f.value.length, 0);

      expect(total).toBeLessThanOrEqual(LIMIT.total);
      expect(card.title).toContain("[높음]");
      expect(card.url).toBeDefined();
    });

    it("field 를 다 버려도 넘으면 본문을 줄이고 제목과 링크는 남긴다", () => {
      const card = buildDiscordCard(
        alert({ title: "마".repeat(400), release: "바".repeat(2100) }),
        ok({ userImpact: "사".repeat(5000) }),
      );

      expect(card.fields).toHaveLength(0);
      expect(card.title).toHaveLength(LIMIT.title);
      expect(card.url).toBe("https://sentry.io/organizations/o/issues/1/events/2/");

      const total =
        card.title.length + (card.description?.length ?? 0) + (card.footer?.text.length ?? 0);
      expect(total).toBeLessThanOrEqual(LIMIT.total);
    });
  });

  describe("판정 없는 기본 카드", () => {
    it("실패 사유를 본문에 적고 회색으로 보낸다", () => {
      const card = buildDiscordCard(alert(), { status: "failed", reason: "제공자 응답 없음" });

      expect(card.title).toBe("TypeError: cannot read properties of undefined");
      expect(card.description).toBe("AI 트리아지 없음: 제공자 응답 없음");
      expect(card.color).toBe(UNTRIAGED_COLOR);
    });

    it("상한 초과에도 Sentry 링크를 유지한다", () => {
      const card = buildDiscordCard(alert(), { status: "skipped", reason: "일일 상한 초과" });

      expect(card.url).toBe("https://sentry.io/organizations/o/issues/1/events/2/");
      expect(card.fields?.[0]?.value).toContain("level: error");
    });

    it("level 과 culprit 이 없으면 이벤트 field 를 만들지 않는다", () => {
      const card = buildDiscordCard(alert({ level: undefined, culprit: undefined }), {
        status: "failed",
        reason: "파싱 실패",
      });

      expect(card.fields).toHaveLength(0);
    });

    it("환경 정보가 없어도 푸터를 만든다", () => {
      const card = buildDiscordCard(
        alert({ environment: undefined, release: undefined, triggeredRule: undefined }),
        { status: "failed", reason: "파싱 실패" },
      );

      expect(card.footer?.text).toBe("판정 없음");
    });
  });
});
