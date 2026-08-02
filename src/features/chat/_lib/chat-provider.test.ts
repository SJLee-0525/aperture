import { afterEach, describe, expect, it, vi } from "vitest";

import { getChatProvider } from "@/features/chat/_lib/chat-provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("chat provider routing", () => {
  it("OpenAI가 응답 전에 실패하면 별도 키의 Gemini로 폴백한다", async () => {
    vi.stubEnv("CHAT_PROVIDER", "openai");
    vi.stubEnv("CHAT_PROVIDER_MODEL", "gpt-5.6-luna");
    vi.stubEnv("CHAT_PROVIDER_API_KEY", "openai-key");
    vi.stubEnv("CHAT_FALLBACK_PROVIDER", "gemini");
    vi.stubEnv("CHAT_FALLBACK_PROVIDER_MODEL", "gemini-3.5-flash-lite");
    vi.stubEnv("CHAT_FALLBACK_PROVIDER_API_KEY", "gemini-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        content: "Gemini fallback",
                        links: [],
                        references: [],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getChatProvider()({
      instructions: "context",
      messages: [{ role: "user", content: "question" }],
      lang: "en",
      signal: new AbortController().signal,
    });

    expect(result.content).toBe("Gemini fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("gemini-3.5-flash-lite");
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({
      "x-goog-api-key": "gemini-key",
    });
  });

  it("OpenAI 스트림을 보낸 뒤 실패하면 Gemini 응답을 섞지 않는다", async () => {
    vi.stubEnv("CHAT_PROVIDER", "openai");
    vi.stubEnv("CHAT_PROVIDER_MODEL", "gpt-5.6-luna");
    vi.stubEnv("CHAT_PROVIDER_API_KEY", "openai-key");
    vi.stubEnv("CHAT_FALLBACK_PROVIDER", "gemini");
    vi.stubEnv("CHAT_FALLBACK_PROVIDER_MODEL", "gemini-3.5-flash-lite");
    vi.stubEnv("CHAT_FALLBACK_PROVIDER_API_KEY", "gemini-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        `data: ${JSON.stringify({
          type: "response.output_text.delta",
          delta: '{"content":"시작',
        })}\n\ndata: ${JSON.stringify({ type: "response.failed", error: { message: "failed" } })}\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const deltas: string[] = [];

    await expect(
      getChatProvider()({
        instructions: "context",
        messages: [{ role: "user", content: "question" }],
        lang: "ko",
        signal: new AbortController().signal,
        onContentDelta: (delta) => deltas.push(delta),
      }),
    ).rejects.toThrow("failed");
    expect(deltas).toEqual(["시작"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
