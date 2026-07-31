import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createGeminiChatProvider,
  GeminiBlockedError,
  GeminiRateLimitError,
  parseGeminiResult,
} from "@/features/chat/_lib/gemini-chat-provider";

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("Gemini chat provider", () => {
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
    expect(body.generationConfig.maxOutputTokens).toBe(512);
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
    ).rejects.toBeInstanceOf(GeminiRateLimitError);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(response({ promptFeedback: { blockReason: "SAFETY" } })),
    );
    await expect(
      provider({
        instructions: "context",
        messages: [{ role: "user", content: "question" }],
        lang: "en",
        signal: new AbortController().signal,
      }),
    ).rejects.toBeInstanceOf(GeminiBlockedError);
  });

  it("구조가 잘못된 모델 출력을 거부한다", () => {
    expect(() => parseGeminiResult('{"content":""}')).toThrow();
    expect(() => parseGeminiResult("not-json")).toThrow();
  });

  it("지나치게 긴 답변은 패널에 맞는 길이로 제한한다", () => {
    const result = parseGeminiResult(
      JSON.stringify({
        content: "가".repeat(2_000),
        links: [
          { label: "사진", href: "/photo" },
          { label: "음악", href: "/music" },
          { label: "개발", href: "/dev" },
        ],
        references: [],
      }),
    );

    expect(result.content).toHaveLength(1_200);
    expect(result.links).toHaveLength(2);
  });
});
