import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiChatProvider } from "@/features/chat/_lib/gemini-chat-provider";
import { createOpenAIChatProvider } from "@/features/chat/_lib/openai-chat-provider";

import type { ChatProvider } from "@/features/chat/_lib/chat-provider";

/**
 * 메인·서브 제공자를 env 로 맞바꿔도 방문자가 보는 동작이 같아야 한다.
 * 와이어 포맷 차이는 아래 fixture 로 흡수하고, 시나리오는 두 제공자에 똑같이 돌린다.
 * 여기서 갈라지면 스왑이 곧 동작 변경이 되므로 이 파일이 그 회귀를 막는다.
 */
type ProviderFixture = {
  label: string;
  create: (apiKey: string, model: string) => ChatProvider;
  /** 본문 조각들을 제공자별 SSE 이벤트 스트림으로 감싼다. */
  streamOf: (chunks: string[]) => Response;
  /** 완성된 본문을 제공자별 비스트림 JSON 응답으로 감싼다. */
  jsonOf: (text: string) => Response;
};

const sse = (payloads: string[]) =>
  new Response(payloads.map((payload) => `data: ${payload}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });

const openAIOutput = (text: string) => ({
  output: [{ type: "message", content: [{ type: "output_text", text }] }],
});

const FIXTURES: ProviderFixture[] = [
  {
    label: "openai",
    create: createOpenAIChatProvider,
    streamOf: (chunks) =>
      sse([
        ...chunks.map((delta) => JSON.stringify({ type: "response.output_text.delta", delta })),
        JSON.stringify({
          type: "response.completed",
          response: openAIOutput(chunks.join("")),
        }),
      ]),
    jsonOf: (text) => json(openAIOutput(text)),
  },
  {
    label: "gemini",
    create: createGeminiChatProvider,
    streamOf: (chunks) =>
      sse(
        chunks.map((text) => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })),
      ),
    jsonOf: (text) => json({ candidates: [{ content: { parts: [{ text }] } }] }),
  },
];

const invoke = (provider: ChatProvider, onContentDelta?: (delta: string) => void) =>
  provider({
    instructions: "context",
    messages: [{ role: "user", content: "질문" }],
    lang: "ko",
    signal: new AbortController().signal,
    onContentDelta,
  });

afterEach(() => vi.unstubAllGlobals());

describe.each(FIXTURES)("제공자 동작 대칭성 ($label)", ({ create, streamOf, jsonOf }) => {
  const provider = () => create("secret", "test-model");

  it("완성된 구조화 응답을 같은 형태로 반환한다", async () => {
    const serialized = JSON.stringify({
      content: "사진을 확인해 보세요.",
      links: [{ label: "사진", href: "/photo" }],
      references: [{ type: "photo", id: "p01" }],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOf(serialized)));

    await expect(invoke(provider())).resolves.toEqual({
      content: "사진을 확인해 보세요.",
      links: [{ label: "사진", href: "/photo" }],
      references: [{ type: "photo", id: "p01" }],
      contactDraft: null,
    });
  });

  it("스트리밍 중에는 본문 증분만 순서대로 내보낸다", async () => {
    const serialized = JSON.stringify({
      content: "사진을 확인해 보세요.",
      links: [],
      references: [],
    });
    const head = '{"content":"사진을 ';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamOf([head, serialized.slice(head.length)])),
    );
    const deltas: string[] = [];

    const result = await invoke(provider(), (delta) => deltas.push(delta));

    expect(deltas).toEqual(["사진을 ", "확인해 보세요."]);
    expect(result.content).toBe("사진을 확인해 보세요.");
  });

  it("잘린 응답이면 본문만 회수하고 links·references는 버린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamOf(['{"content":"여기서 ', "잘렸습니다"])),
    );
    const deltas: string[] = [];

    const result = await invoke(provider(), (delta) => deltas.push(delta));

    expect(result).toEqual({ content: "여기서 잘렸습니다", contactDraft: null });
    expect(deltas.join("")).toBe("여기서 잘렸습니다");
  });

  it("비스트림 응답의 잘림도 같은 방식으로 회수한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonOf('{"content":"부분 답변입니다.","links":[{"la')),
    );

    await expect(invoke(provider())).resolves.toEqual({
      content: "부분 답변입니다.",
      contactDraft: null,
    });
  });

  it.each([
    [429, "rate-limit"],
    [500, "unavailable"],
    [502, "unavailable"],
    [503, "unavailable"],
  ])("HTTP %i을 같은 오류 kind로 정규화한다", async (status, kind) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));

    await expect(invoke(provider())).rejects.toMatchObject({ kind });
  });

  it("빈 본문은 회수하지 않고 오류로 올린다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOf('{"content":"   "}')));

    await expect(invoke(provider())).rejects.toThrow();
  });
});
