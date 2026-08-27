import { describe, expect, it } from "vitest";

import { buildTriageInput, TRIAGE_INSTRUCTIONS } from "@/lib/sentry-triage/triage-prompt";

import type { SentryAlertSummary } from "@/types/sentry-alert";

const summary = (overrides: Partial<SentryAlertSummary> = {}): SentryAlertSummary => ({
  issueId: "1",
  eventId: "2",
  title: "EvalError: capture",
  culprit: "/:lang",
  level: "error",
  environment: "production",
  release: "aperture@abc1234",
  webUrl: "https://sentry.io/x",
  triggeredRule: "Backend",
  tags: { app_runtime: "browser", area: "public" },
  exceptionType: "EvalError",
  exceptionValue: "capture",
  frames: [{ filename: "app.ts", function: "handle", lineno: 12 }],
  ...overrides,
});

describe("TRIAGE_INSTRUCTIONS", () => {
  it("심각도 네 단계를 모두 정의한다", () => {
    for (const level of ["critical:", "high:", "medium:", "low:"]) {
      expect(TRIAGE_INSTRUCTIONS).toContain(level);
    }
  });

  it("출력 언어를 한국어로 못박는다", () => {
    expect(TRIAGE_INSTRUCTIONS).toContain("Korean");
  });

  it("일반론 조치를 금지한다", () => {
    expect(TRIAGE_INSTRUCTIONS).toContain("Never write generic advice");
  });
});

describe("buildTriageInput", () => {
  it("표시 필드를 이름표와 함께 넣는다", () => {
    const input = buildTriageInput(summary());

    expect(input).toContain("Title: EvalError: capture");
    expect(input).toContain("Environment: production");
    expect(input).toContain("Release: aperture@abc1234");
    expect(input).toContain("Triggered rule: Backend");
  });

  it("예외 타입과 메시지를 합쳐 적는다", () => {
    expect(buildTriageInput(summary())).toContain("Exception: EvalError: capture");
  });

  it("태그를 한 줄로 모은다", () => {
    expect(buildTriageInput(summary())).toContain("Tags: app_runtime=browser area=public");
  });

  it("스택을 최신 순 표기로 적는다", () => {
    const input = buildTriageInput(
      summary({
        frames: [
          { filename: "a.ts", function: "outer", lineno: 1 },
          { filename: "b.ts", function: "inner", lineno: 2 },
        ],
      }),
    );

    expect(input).toContain("In-app stack (most recent first):");
    expect(input.indexOf("outer")).toBeLessThan(input.indexOf("inner"));
  });

  it("이름 없는 프레임을 anonymous 로 적는다", () => {
    const input = buildTriageInput(summary({ frames: [{ filename: "a.ts", lineno: 3 }] }));

    expect(input).toContain("at (anonymous) (a.ts:3)");
  });

  it("in-app 프레임이 없으면 그 사실을 적는다", () => {
    expect(buildTriageInput(summary({ frames: [] }))).toContain("In-app stack: none");
  });

  it("빈 필드는 줄 자체를 만들지 않는다", () => {
    const input = buildTriageInput(
      summary({ culprit: undefined, release: undefined, triggeredRule: undefined }),
    );

    expect(input).not.toContain("Culprit:");
    expect(input).not.toContain("Release:");
    expect(input).not.toContain("Triggered rule:");
  });

  it("식별자와 Sentry 링크는 입력에 넣지 않는다", () => {
    const input = buildTriageInput(summary({ issueId: "ISSUE-ZZZ", eventId: "EVENT-ZZZ" }));

    expect(input).not.toContain("ISSUE-ZZZ");
    expect(input).not.toContain("EVENT-ZZZ");
    expect(input).not.toContain("https://sentry.io/x");
  });
});
