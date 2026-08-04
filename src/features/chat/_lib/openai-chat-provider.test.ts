import { afterEach, describe, expect, it, vi } from "vitest";

import { createOpenAIChatProvider } from "@/features/chat/_lib/openai-chat-provider";

const outputResponse = (text: string, status = 200) =>
  new Response(
    JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text }] }],
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI chat provider", () => {
  it("Responses API 스트림에서 구조화 content만 순서대로 전달한다", async () => {
    const event = (type: string, body: object) =>
      `event: ${type}\ndata: ${JSON.stringify({ type, ...body })}\n\n`;
    const serialized = JSON.stringify({
      content: "사진을 확인해 보세요.",
      links: [],
      references: [{ type: "photo", id: "p01" }],
    });
    const first = '{"content":"사진을 ';
    const second = serialized.slice(first.length);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          event("response.output_text.delta", { delta: first }) +
            event("response.output_text.delta", { delta: second }) +
            event("response.completed", {
              response: {
                output: [{ type: "message", content: [{ type: "output_text", text: serialized }] }],
              },
            }),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );
    const deltas: string[] = [];

    const result = await createOpenAIChatProvider(
      "secret",
      "gpt-5.6-luna",
    )({
      instructions: "context",
      messages: [{ role: "user", content: "사진" }],
      lang: "ko",
      signal: new AbortController().signal,
      onContentDelta: (delta) => deltas.push(delta),
    });

    expect(deltas).toEqual(["사진을 ", "확인해 보세요."]);
    expect(result).toEqual({
      content: "사진을 확인해 보세요.",
      references: [{ type: "photo", id: "p01" }],
    });
  });

  it("Luna에 스트리밍·엄격한 스키마·낮은 출력 설정을 전달한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        outputResponse(JSON.stringify({ content: "안녕하세요.", links: [], references: [] })),
      );
    vi.stubGlobal("fetch", fetchMock);

    await createOpenAIChatProvider(
      "openai-key",
      "gpt-5.6-luna",
    )({
      instructions: "system context",
      messages: [
        { role: "user", content: "소개해줘" },
        { role: "assistant", content: "무엇이 궁금한가요?" },
      ],
      lang: "ko",
      signal: new AbortController().signal,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer openai-key");
    expect(body).toMatchObject({
      model: "gpt-5.6-luna",
      instructions: "system context",
      reasoning: { effort: "none" },
      max_output_tokens: 2_048,
      store: false,
      stream: false,
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "portfolio_chat_response",
          strict: true,
          schema: { type: "object", additionalProperties: false },
        },
      },
    });
    expect(body.input.map(({ role }: { role: string }) => role)).toEqual(["user", "assistant"]);
  });

  it("rate limit을 공통 오류 kind로 정규화한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    await expect(
      createOpenAIChatProvider(
        "secret",
        "gpt-5.6-luna",
      )({
        instructions: "context",
        messages: [{ role: "user", content: "question" }],
        lang: "en",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ kind: "rate-limit" });
  });

  it("max_output_tokens 잘림(response.incomplete)이면 스트리밍된 본문만 회수한다", async () => {
    const event = (type: string, body: object) =>
      `event: ${type}\ndata: ${JSON.stringify({ type, ...body })}\n\n`;
    const truncated = '{"content":"긴 답변이 여기서 잘렸습니다';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          event("response.output_text.delta", { delta: truncated }) +
            event("response.incomplete", {
              response: {
                output: [{ type: "message", content: [{ type: "output_text", text: truncated }] }],
              },
            }),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
      ),
    );
    const deltas: string[] = [];

    const result = await createOpenAIChatProvider(
      "secret",
      "gpt-5.6-luna",
    )({
      instructions: "context",
      messages: [{ role: "user", content: "자세히 설명해줘" }],
      lang: "ko",
      signal: new AbortController().signal,
      onContentDelta: (delta) => deltas.push(delta),
    });

    expect(result).toEqual({ content: "긴 답변이 여기서 잘렸습니다" });
    expect(deltas.join("")).toBe("긴 답변이 여기서 잘렸습니다");
  });

  it("비스트림 응답의 미완성 JSON도 본문만 회수하고 links는 버린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(outputResponse('{"content":"부분 답변입니다.","links":[{"la')),
    );

    const result = await createOpenAIChatProvider(
      "secret",
      "gpt-5.6-luna",
    )({
      instructions: "context",
      messages: [{ role: "user", content: "질문" }],
      lang: "ko",
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ content: "부분 답변입니다." });
  });
});
