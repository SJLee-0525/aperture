import { describe, expect, it } from "vitest";

import {
  buildTriageSchema,
  MAX_ACTIONS,
  parseTriageResult,
} from "@/lib/sentry-triage/triage-schema";

const valid = {
  severity: "high",
  isNoise: false,
  userImpact: "사진 상세가 열리지 않는다.",
  probableCause: "image 가 없는 문서를 렌더가 참조한다.",
  suspectArea: "GalleryView.tsx",
  recommendedActions: ["빈 문서를 필터한다", "기본값을 채운다"],
  confidence: "medium",
};

const json = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ ...valid, ...overrides });

describe("buildTriageSchema", () => {
  it("strict 에서만 additionalProperties 를 붙인다", () => {
    expect(buildTriageSchema({ strict: true })).toHaveProperty("additionalProperties", false);
    expect(buildTriageSchema({ strict: false })).not.toHaveProperty("additionalProperties");
  });

  it("두 모드가 같은 속성과 required 를 쓴다", () => {
    const strict = buildTriageSchema({ strict: true });
    const loose = buildTriageSchema({ strict: false });

    expect(Object.keys(strict.properties)).toEqual(Object.keys(loose.properties));
    expect(strict.required).toEqual(loose.required);
  });

  it("모든 속성을 required 에 넣는다", () => {
    const schema = buildTriageSchema({ strict: true });

    expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort());
  });

  it("심각도와 확신도를 열거값으로 제한한다", () => {
    const schema = buildTriageSchema({ strict: true });

    expect(schema.properties.severity.enum).toEqual(["critical", "high", "medium", "low"]);
    expect(schema.properties.confidence.enum).toEqual(["high", "medium", "low"]);
  });
});

describe("parseTriageResult", () => {
  it("계약을 만족하는 응답을 읽는다", () => {
    expect(parseTriageResult(json())).toEqual(valid);
  });

  it("JSON 이 아니면 null 이다", () => {
    expect(parseTriageResult("판정 결과입니다")).toBeNull();
  });

  it("잘린 JSON 은 회수하지 않는다", () => {
    expect(parseTriageResult(json().slice(0, 40))).toBeNull();
  });

  it("객체가 아니면 null 이다", () => {
    expect(parseTriageResult('["high"]')).toBeNull();
  });

  it("열거값 밖 severity 를 거절한다", () => {
    expect(parseTriageResult(json({ severity: "urgent" }))).toBeNull();
  });

  it("열거값 밖 confidence 를 거절한다", () => {
    expect(parseTriageResult(json({ confidence: "certain" }))).toBeNull();
  });

  it("isNoise 가 불리언이 아니면 거절한다", () => {
    expect(parseTriageResult(json({ isNoise: "false" }))).toBeNull();
  });

  it("userImpact 가 비면 거절한다", () => {
    expect(parseTriageResult(json({ userImpact: "   " }))).toBeNull();
  });

  it("probableCause 가 비면 거절한다", () => {
    expect(parseTriageResult(json({ probableCause: "" }))).toBeNull();
  });

  it("suspectArea 는 비어도 받는다", () => {
    expect(parseTriageResult(json({ suspectArea: "" }))?.suspectArea).toBe("");
  });

  it("조치가 배열이 아니면 빈 배열로 둔다", () => {
    expect(parseTriageResult(json({ recommendedActions: "필터한다" }))?.recommendedActions).toEqual(
      [],
    );
  });

  it("조치에서 빈 항목을 버린다", () => {
    const result = parseTriageResult(json({ recommendedActions: ["확인한다", "  ", ""] }));

    expect(result?.recommendedActions).toEqual(["확인한다"]);
  });

  it("조치를 상한까지만 남긴다", () => {
    const actions = Array.from({ length: MAX_ACTIONS + 3 }, (_, index) => `조치 ${index}`);

    expect(
      parseTriageResult(json({ recommendedActions: actions }))?.recommendedActions,
    ).toHaveLength(MAX_ACTIONS);
  });

  it("문자열 값의 앞뒤 공백을 정리한다", () => {
    const result = parseTriageResult(json({ userImpact: "  화면이 비어 있다  " }));

    expect(result?.userImpact).toBe("화면이 비어 있다");
  });
});
