import { describe, expect, it } from "vitest";

import { CHAT_LIMITS, ChatRequestError, parseChatRequest } from "@/features/chat/_lib/chat-schema";

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
