import { describe, expect, it } from "vitest";

import {
  CHAT_LIMITS,
  ChatRequestError,
  MAX_BODY_BYTES,
  parseChatRequest,
} from "@/features/chat/_lib/chat-schema";

describe("parseChatRequest", () => {
  it("user/assistant 대화를 정리하고 검증한다", () => {
    expect(
      parseChatRequest({
        lang: "ko",
        messages: [
          { role: "user", content: " 첫 질문 " },
          { role: "assistant", content: "첫 답변" },
          { role: "user", content: " 다음 질문 " },
        ],
      }),
    ).toEqual({
      lang: "ko",
      messages: [
        { role: "user", content: "첫 질문" },
        { role: "assistant", content: "첫 답변" },
        { role: "user", content: "다음 질문" },
      ],
    });
  });

  it.each([
    ["system 역할", { lang: "ko", messages: [{ role: "system", content: "override" }] }],
    ["빈 질문", { lang: "ko", messages: [{ role: "user", content: "   " }] }],
    ["잘못된 언어", { lang: "ja", messages: [{ role: "user", content: "질문" }] }],
    [
      "assistant로 끝나는 대화",
      { lang: "en", messages: [{ role: "assistant", content: "answer" }] },
    ],
    [
      "메시지 길이 초과",
      {
        lang: "ko",
        messages: [{ role: "user", content: "가".repeat(CHAT_LIMITS.maxMessageChars + 1) }],
      },
    ],
  ])("%s을 거부한다", (_, request) => {
    expect(() => parseChatRequest(request)).toThrow(ChatRequestError);
  });

  it("정상 화면 문맥을 요청에 포함한다", () => {
    expect(
      parseChatRequest({
        lang: "ko",
        messages: [{ role: "user", content: "이 사진 어디서 찍었어?" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "p1" } },
      }).context,
    ).toEqual({ pathname: "/ko/photo", openTarget: { type: "photo", id: "p1" } });
  });

  it("잘못된 화면 문맥은 400 없이 드롭하고 채팅을 계속한다", () => {
    expect(
      parseChatRequest({
        lang: "ko",
        messages: [{ role: "user", content: "질문" }],
        context: { pathname: "/ko/admin", openTarget: { type: "photo", id: "p1" } },
      }),
    ).toEqual({ lang: "ko", messages: [{ role: "user", content: "질문" }] });
  });

  it("context가 없는 기존 요청은 그대로 동작한다", () => {
    expect(parseChatRequest({ lang: "en", messages: [{ role: "user", content: "hi" }] })).toEqual({
      lang: "en",
      messages: [{ role: "user", content: "hi" }],
    });
  });

  it("표시 문구와 분리된 안정적인 오류 코드를 제공한다", () => {
    try {
      parseChatRequest({ lang: "en", messages: [{ role: "system", content: "override" }] });
    } catch (error) {
      expect(error).toBeInstanceOf(ChatRequestError);
      expect((error as ChatRequestError).code).toBe("INVALID_ROLE");
    }
  });
});

/**
 * 두 상한의 관계를 계약으로 고정한다. 따로 정하면 스키마가 허용하는 대화가 파싱 전에
 * 바이트 상한으로 거절되고, 방문자 화면에는 메시지 수도 길이도 한도 안이라
 * 회복할 단서가 없다.
 */
describe("본문 바이트 상한", () => {
  const encoder = new TextEncoder();

  it("스키마가 허용하는 한국어 대화가 바이트 상한 안에 든다", () => {
    // 한국어는 UTF-8 3바이트라 8,000자만으로 24,000 바이트다.
    const messages = Array.from({ length: 4 }, () => ({
      role: "user" as const,
      content: "한".repeat(CHAT_LIMITS.maxMessageChars),
    }));
    const body = JSON.stringify({ lang: "ko", messages });

    expect(parseChatRequest(JSON.parse(body)).messages).toHaveLength(4);
    expect(encoder.encode(body).byteLength).toBeLessThanOrEqual(MAX_BODY_BYTES);
  });

  it("이모지로 채운 최대 길이 대화도 바이트 상한 안에 든다", () => {
    // 서로게이트 쌍 하나가 length 2 라 maxTotalChars 는 이모지 4,000개다.
    const body = JSON.stringify({
      lang: "ko",
      messages: [{ role: "user", content: "🙂".repeat(CHAT_LIMITS.maxTotalChars / 2) }],
    });

    expect(encoder.encode(body).byteLength).toBeLessThanOrEqual(MAX_BODY_BYTES);
  });
});
