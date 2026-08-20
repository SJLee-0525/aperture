import { describe, expect, it, vi } from "vitest";

import {
  buildChatResponseSchema,
  contentFromPartialJson,
  createStreamingContentCollector,
  parseChatResult,
  parseOrSalvageChatResult,
} from "@/features/chat/_lib/chat-response-contract";
import { MAX_RESPONSE_CHARS } from "@/features/chat/_lib/chat-tuning";

import { CHAT_REFERENCE_TYPES } from "@/types/chat";

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

  it("미완성 JSON은 본문만 회수하고 links·references·contactDraft는 버린다", () => {
    expect(
      parseOrSalvageChatResult(
        '{"content":"부분 답변입니다.","contactDraft":{"name":"이","email":"a@b.co","mess',
      ),
    ).toEqual({
      content: "부분 답변입니다.",
      contactDraft: null,
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

  it("본문을 여는 키가 조각 경계에 걸쳐도 이어서 인식한다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);

    collector.push('{"cont');
    collector.push('ent" : "안녕하세요');

    expect(onContentDelta.mock.calls.flat().join("")).toBe("안녕하세요");
  });

  it("이스케이프가 조각 경계에 걸쳐도 복원한다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);

    collector.push('{"content":"첫 줄\\');
    collector.push("n둘째 줄");

    expect(onContentDelta.mock.calls.flat().join("")).toBe("첫 줄\n둘째 줄");
  });

  it("유니코드 이스케이프가 조각 경계에 걸쳐도 복원한다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);

    collector.push('{"content":"\\u00');
    collector.push("41B");

    expect(onContentDelta.mock.calls.flat().join("")).toBe("AB");
  });

  it("닫는 따옴표 뒤의 다른 필드는 본문에 섞지 않는다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);

    collector.push('{"content":"본문","links":[{"label":"섞이면 안 되는 값"}]}');

    expect(onContentDelta.mock.calls.flat().join("")).toBe("본문");
  });

  it("깨진 이스케이프를 만나면 원문을 지우지 않고 방출을 멈춘다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);
    const source = '{"content":"AAA \\x BBB"}';

    for (const character of source) collector.push(character);

    // 깨지기 전에 나간 델타는 회수할 수 없으므로 그대로 둔다.
    expect(onContentDelta.mock.calls.flat().join("")).toBe("AAA ");
    // 깨진 지점 이후로는 아무것도 내보내지 않는다.
    expect(collector.error).toBeInstanceOf(Error);
    // 진단을 위해 원문은 그대로 남는다.
    expect(collector.serialized).toBe(source);
  });

  it("정상 종료는 error 를 남기지 않는다", () => {
    const collector = createStreamingContentCollector(vi.fn());

    collector.push('{"content":"본문","links":[]}');

    expect(collector.error).toBeNull();
  });

  describe("서로게이트 짝 처리", () => {
    /** 남은 자리를 원하는 만큼 남기고 시작하는 수집기. */
    const collectorWithRoom = (room: number) => {
      const onContentDelta = vi.fn();
      const collector = createStreamingContentCollector(onContentDelta);
      collector.push('{"content":"');
      if (MAX_RESPONSE_CHARS > room) collector.push("가".repeat(MAX_RESPONSE_CHARS - room));
      onContentDelta.mockClear();
      return { collector, onContentDelta };
    };

    it("두 이스케이프로 나뉜 이모지를 짝으로 묶어 방출한다", () => {
      const { collector, onContentDelta } = collectorWithRoom(10);

      collector.push("\\uD83D");
      // 상위 반쪽만으로는 아무것도 내보내지 않는다.
      expect(onContentDelta).not.toHaveBeenCalled();
      collector.push("\\uDE00");

      expect(onContentDelta.mock.calls.flat().join("")).toBe("😀");
    });

    it("남은 자리에 짝이 다 들어가지 않으면 둘 다 내보내지 않는다", () => {
      const { collector, onContentDelta } = collectorWithRoom(1);

      collector.push("\\uD83D");
      collector.push("\\uDE00");

      expect(onContentDelta).not.toHaveBeenCalled();
    });

    it("상한에 걸린 뒤에는 뒤따르는 조각도 내보내지 않는다", () => {
      const { collector, onContentDelta } = collectorWithRoom(1);

      collector.push("\\uD83D");
      collector.push("\\uDE00");
      // 이모지만 빠지고 다음 문자가 이어지면 순서가 뒤섞인다.
      collector.push("나");

      expect(onContentDelta).not.toHaveBeenCalled();
    });

    it("짝을 만나지 못한 상위 서로게이트는 버리고 다음 문자는 살린다", () => {
      const { collector, onContentDelta } = collectorWithRoom(10);

      collector.push("\\uD83D");
      collector.push("가");

      expect(onContentDelta.mock.calls.flat().join("")).toBe("가");
    });

    it("한 조각 안의 짝 없는 상위·하위 서로게이트를 버린다", () => {
      const { collector, onContentDelta } = collectorWithRoom(10);

      // `\uD83DA` 는 상위 반쪽 뒤에 일반 문자가 붙은 값이다.
      collector.push("\\uD83DA\\uDE00B");

      expect(onContentDelta.mock.calls.flat().join("")).toBe("AB");
    });

    it("상위 서로게이트를 보류한 채 본문이 닫히면 버린다", () => {
      const { collector, onContentDelta } = collectorWithRoom(10);

      collector.push('가\\uD83D","links":[]}');

      expect(onContentDelta.mock.calls.flat().join("")).toBe("가");
      expect(collector.error).toBeNull();
    });

    it("이모지 뒤 일반 문자의 순서를 지킨다", () => {
      const { collector, onContentDelta } = collectorWithRoom(10);

      collector.push("\\uD83D");
      collector.push("\\uDE00나");

      expect(onContentDelta.mock.calls.flat().join("")).toBe("😀나");
    });
  });

  it("긴 스트림도 누적 문자열을 다시 훑지 않는다", () => {
    const onContentDelta = vi.fn();
    const collector = createStreamingContentCollector(onContentDelta);

    collector.push('{"content":"');
    for (let index = 0; index < 500; index += 1) collector.push("가".repeat(10));

    // 상한까지만 내보내고 그 뒤로는 조각을 받아도 추가 전달이 없다.
    expect(onContentDelta.mock.calls.flat().join("").length).toBe(MAX_RESPONSE_CHARS);
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
    expect(strict.required).toEqual(["content", "links", "references", "contactDraft"]);
  });

  it("contactDraft는 nullable required — null과 완전·부분 초안을 파싱한다", () => {
    const of = (contactDraft: unknown) =>
      parseChatResult(JSON.stringify({ content: "네.", links: [], references: [], contactDraft }));

    expect(of(null).contactDraft).toBeNull();
    expect(
      of({ name: "이성준", email: "sj@example.com", message: "협업 문의드립니다." }).contactDraft,
    ).toEqual({ name: "이성준", email: "sj@example.com", message: "협업 문의드립니다." });
    // 이름·메일이 없어도 message가 있으면 초안 — 나머지 칸은 방문자가 채운다.
    expect(of({ name: null, email: null, message: "문의드립니다." }).contactDraft).toEqual({
      name: null,
      email: null,
      message: "문의드립니다.",
    });
  });
});

describe("참조 종류", () => {
  // 종류를 다시 나열하지 않는다. 파서만 빠뜨려도 이 목록이 즉시 실패해야 한다.
  it.each([...CHAT_REFERENCE_TYPES])("%s 참조를 받아들인다", (type) => {
    const parsed = parseChatResult(
      JSON.stringify({ content: "본문", references: [{ type, id: "a1" }] }),
    );

    expect(parsed?.references).toEqual([{ type, id: "a1" }]);
  });

  it("알 수 없는 종류는 버린다", () => {
    const parsed = parseChatResult(
      JSON.stringify({ content: "본문", references: [{ type: "album", id: "a1" }] }),
    );

    expect(parsed?.references).toBeUndefined();
  });
});
