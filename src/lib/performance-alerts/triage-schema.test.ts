import { describe, expect, it } from "vitest";

import {
  buildPerformanceTriageSchema,
  parsePerformanceTriageResult,
} from "@/lib/performance-alerts/triage-schema";

const valid = {
  summary: "LCP가 field와 lab에서 함께 느립니다.",
  userImpact: "방문자가 첫 화면을 늦게 확인합니다.",
  likelyCauses: ["대표 이미지 전달이 늦을 수 있습니다."],
  inspectFirst: ["Lighthouse의 LCP element와 image delivery 진단"],
  recommendedChecks: ["npm run test:lighthouse:production"],
  confidence: "medium",
};

describe("parsePerformanceTriageResult", () => {
  it("strict 결과를 읽는다", () => {
    expect(parsePerformanceTriageResult(JSON.stringify(valid))).toEqual(valid);
  });

  it.each([
    "not json",
    JSON.stringify({ ...valid, confidence: "certain" }),
    JSON.stringify({ ...valid, extra: true }),
    JSON.stringify({ ...valid, likelyCauses: Array(5).fill("원인") }),
    JSON.stringify({ ...valid, summary: "x".repeat(301) }),
  ])("계약을 벗어난 결과를 거부한다", (value) => {
    expect(parsePerformanceTriageResult(value)).toBeNull();
  });
});

describe("buildPerformanceTriageSchema", () => {
  it("OpenAI schema에서 추가 속성을 막는다", () => {
    expect(buildPerformanceTriageSchema({ strict: true })).toMatchObject({
      additionalProperties: false,
    });
  });

  it("Gemini schema에는 지원하지 않는 strict 속성을 넣지 않는다", () => {
    expect(buildPerformanceTriageSchema({ strict: false })).not.toHaveProperty(
      "additionalProperties",
    );
  });
});
