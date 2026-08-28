import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatUpstreamError } from "@/features/chat/_lib/chat-upstream-error";
import { createGeminiChatProvider } from "@/features/chat/_lib/gemini-chat-provider";

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("Gemini chat provider", () => {
  it("구조화 응답의 content를 생성되는 순서대로 전달한다", async () => {
    const event = (text: string) =>
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            event('{"content":"사진을 ') + event('확인해 보세요.","links":[],"references":[]}'),
            { headers: { "Content-Type": "text/event-stream" } },
          ),
        ),
    );
    const deltas: string[] = [];

    const result = await createGeminiChatProvider(
      "secret",
      "gemini-test",
    )({
      instructions: "context",
      messages: [{ role: "user", content: "사진" }],
      lang: "ko",
      signal: new AbortController().signal,
      onContentDelta: (delta) => deltas.push(delta),
    });

    expect(deltas).toEqual(["사진을 ", "확인해 보세요."]);
    expect(result.content).toBe("사진을 확인해 보세요.");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("streamGenerateContent?alt=sse");
  });

  it("본문 이스케이프가 깨지면 잘린 답변을 구제하지 않고 실패한다", async () => {
    const event = (text: string) =>
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        // `\x` 는 JSON 문자열에서 허용되지 않는 이스케이프다.
        new Response(event('{"content":"앞부분 \\x 뒷부분","links":[]}'), {
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );

    await expect(
      createGeminiChatProvider(
        "secret",
        "gemini-test",
      )({
        instructions: "context",
        messages: [{ role: "user", content: "질문" }],
        lang: "ko",
        signal: new AbortController().signal,
        onContentDelta: () => undefined,
      }),
    ).rejects.toThrow(/invalid JSON escape/);
  });

  it("대화 역할과 구조화 응답 스키마를 Gemini 요청으로 변환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    content: "사진을 확인해 보세요.",
                    links: [{ label: "사진", href: "/photo" }],
                    references: [{ type: "photo", id: "p01" }],
                  }),
                },
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createGeminiChatProvider(
      "secret",
      "gemini-test",
    )({
      instructions: "system context",
      messages: [
        { role: "user", content: "사진" },
        { role: "assistant", content: "어떤 사진인가요?" },
        { role: "user", content: "도시 사진" },
      ],
      lang: "ko",
      signal: new AbortController().signal,
    });

    expect(result).toEqual({
      content: "사진을 확인해 보세요.",
      links: [{ label: "사진", href: "/photo" }],
      references: [{ type: "photo", id: "p01" }],
      contactDraft: null,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(url).toContain("gemini-test:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret");
    expect(body.systemInstruction.parts[0].text).toBe("system context");
    expect(body.contents.map(({ role }: { role: string }) => role)).toEqual([
      "user",
      "model",
      "user",
    ]);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema).toMatchObject({ type: "object" });
    expect(body.generationConfig.maxOutputTokens).toBe(2_048);
  });

  /**
   * 사고 제어 필드는 모델 세대마다 이름이 다르다(2.5=thinkingBudget, 3.x=thinkingLevel).
   * 어느 쪽을 하드코딩해도 다른 세대 모델에서 400 이 나므로 아예 보내지 않는다 —
   * env 로 모델만 바꿔 끼우는 운용을 지키기 위한 의도적 선택이다.
   */
  it("모델 세대에 종속되는 사고 설정을 보내지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        candidates: [
          {
            content: {
              parts: [
                { text: JSON.stringify({ content: "안녕하세요.", links: [], references: [] }) },
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createGeminiChatProvider(
      "secret",
      "gemini-test",
    )({
      instructions: "context",
      messages: [{ role: "user", content: "소개해줘" }],
      lang: "ko",
      signal: new AbortController().signal,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).generationConfig).not.toHaveProperty("thinkingConfig");
  });

  /**
   * 예전에는 MAX_TOKENS 를 오류로 올려 502 로 끝냈다. 스트리밍으로 이미 다 보여준 본문을
   * 버리는 셈이라 OpenAI 와 동작이 어긋났고, 지금은 양쪽 모두 본문만 남긴다.
   */
  it("MAX_TOKENS로 잘린 응답도 본문만 남긴다", async () => {
    const event = `data: ${JSON.stringify({
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"content":"잘린 답변' }] } },
      ],
    })}\n\n`;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(event, { headers: { "Content-Type": "text/event-stream" } }),
        ),
    );
    const deltas: string[] = [];

    const result = await createGeminiChatProvider(
      "secret",
      "gemini-test",
    )({
      instructions: "context",
      messages: [{ role: "user", content: "question" }],
      lang: "ko",
      signal: new AbortController().signal,
      onContentDelta: (delta) => deltas.push(delta),
    });

    expect(result).toEqual({ content: "잘린 답변", contactDraft: null });
    expect(deltas.join("")).toBe("잘린 답변");
  });

  it("무료 티어 제한과 안전 차단을 구분한다", async () => {
    const provider = createGeminiChatProvider("secret", "gemini-test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({}, 429)));

    await expect(
      provider({
        instructions: "context",
        messages: [{ role: "user", content: "question" }],
        lang: "en",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ kind: "rate-limit" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(response({ promptFeedback: { blockReason: "SAFETY" } })),
    );
    const blocked = provider({
      instructions: "context",
      messages: [{ role: "user", content: "question" }],
      lang: "en",
      signal: new AbortController().signal,
    });

    await expect(blocked).rejects.toBeInstanceOf(ChatUpstreamError);
    await expect(blocked).rejects.toMatchObject({ kind: "blocked" });
  });
});
