import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createOpenAIIntentClassifier,
  parseIntentSections,
} from "@/features/chat/_lib/openai-intent-classifier";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAI intent classifier", () => {
  it.each([
    ['{"sections":["none"]}', []],
    ['{"sections":["photography"]}', ["profile", "photography"]],
    ['{"sections":["profile","music"]}', ["profile", "music"]],
  ])("구조화 분류 결과를 정규화한다: %s", (serialized, expected) => {
    expect(parseIntentSections(serialized)).toEqual(expected);
  });

  it("최근 대화와 저비용 분류 설정을 Responses API에 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        output: [
          {
            content: [{ type: "output_text", text: '{"sections":["photography"]}' }],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const classify = createOpenAIIntentClassifier("secret", "gpt-5-nano");
    await expect(
      classify(
        [
          { role: "user", content: "바다 사진 있어?" },
          { role: "assistant", content: "울릉도 사진이 있어요." },
          { role: "user", content: "그럼 독도도 있어?" },
        ],
        new AbortController().signal,
      ),
    ).resolves.toEqual(["profile", "photography"]);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));
    expect(init?.headers).toEqual({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    });
    expect(body).toEqual(
      expect.objectContaining({
        model: "gpt-5-nano",
        reasoning: { effort: "minimal" },
        max_output_tokens: 80,
        store: false,
        input: expect.arrayContaining([{ role: "user", content: "그럼 독도도 있어?" }]),
      }),
    );
    expect(body.text.format).toEqual(
      expect.objectContaining({ type: "json_schema", strict: true }),
    );
    expect(body.text.format.schema.properties.sections).not.toHaveProperty("uniqueItems");
  });
});
