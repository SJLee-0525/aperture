import { describe, expect, it, vi } from "vitest";

import {
  buildChatResponseSchema,
  contentFromPartialJson,
  createStreamingContentCollector,
  parseChatResult,
  parseOrSalvageChatResult,
} from "@/features/chat/_lib/chat-response-contract";

describe("chat response contract", () => {
  it("구조가 잘못된 모델 출력을 거부한다", () => {
    expect(() => parseChatResult('{"content":""}')).toThrow();
    expect(() => parseChatResult("not-json")).toThrow();
    expect(() => parseChatResult('{"links":[]}')).toThrow();
  });

  it("지나치게 긴 답변은 패널에 맞는 길이로 제한한다", () => {
    const result = parseChatResult(
      JSON.stringify({
        content: "가".repeat(2_000),
        links: [
          { label: "사진", href: "/photo" },
          { label: "음악", href: "/music" },
          { label: "개발", href: "/dev" },
        ],
        references: [
          { type: "photo", id: "p01" },
          { type: "music", id: "m01" },
          { type: "project", id: "d01" },
          { type: "project", id: "d02" },
        ],
      }),
    );

    expect(result.content).toHaveLength(1_200);
    expect(result.links).toHaveLength(2);
    expect(result.references).toHaveLength(3);
  });

  it("미완성 JSON은 본문만 회수하고 links·references는 버린다", () => {
    expect(parseOrSalvageChatResult('{"content":"부분 답변입니다.","links":[{"la')).toEqual({
      content: "부분 답변입니다.",
    });
  });

  it("회수할 본문조차 없으면 원래 파싱 오류를 던진다", () => {
    expect(() => parseOrSalvageChatResult('{"links":[{"la')).toThrow();
    expect(() => parseOrSalvageChatResult('{"content":"')).toThrow();
  });

  it("이스케이프가 걸친 채 끊긴 조각도 안전하게 복원한다", () => {
    expect(contentFromPartialJson('{"content":"첫 줄\\n둘째 줄')).toBe("첫 줄\n둘째 줄");
    expect(contentFromPartialJson('{"content":"끊긴 이스케이프\\')).toBe("끊긴 이스케이프");
    expect(contentFromPartialJson('{"links":[]}')).toBe("");
  });

  it("스트리밍 수집기는 아직 내보내지 않은 증분만 전달한다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);

    collector.push('{"content":"사진을 ');
    collector.push('확인해 보세요.","links":[]}');

    expect(onContentDelta.mock.calls.flat()).toEqual(["사진을 ", "확인해 보세요."]);
    expect(collector.serialized).toBe('{"content":"사진을 확인해 보세요.","links":[]}');
  });

  it("본문이 아직 열리지 않은 조각에는 아무것도 내보내지 않는다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);

    collector.push('{"con');
    expect(onContentDelta).not.toHaveBeenCalled();
  });

  /**
   * OpenAI Structured Outputs(strict)는 모든 object에 additionalProperties:false를 요구하고
   * Gemini responseJsonSchema는 이 키를 받지 않는다. 두 계약이 이 한 가지만 다르다는 걸 고정한다.
   */
  it("strict 플래그만으로 두 제공자의 스키마 차이를 만든다", () => {
    const strict = buildChatResponseSchema({ strict: true });
    const loose = buildChatResponseSchema({ strict: false });

    expect(strict).toMatchObject({ additionalProperties: false });
    expect(loose).not.toHaveProperty("additionalProperties");
    expect(
      JSON.parse(JSON.stringify(loose).replaceAll('"additionalProperties":false,', "")),
    ).toEqual(JSON.parse(JSON.stringify(strict).replaceAll('"additionalProperties":false,', "")));
    expect(strict.required).toEqual(["content", "links", "references"]);
  });
});
