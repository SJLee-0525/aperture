// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChat } from "@/features/chat/_hooks/use-chat";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useChat", () => {
  it("대화 내역을 API에 전달하고 구조화된 답변을 보존한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            role: "assistant",
            content: "사진을 확인해 보세요.",
            references: [
              {
                type: "photo",
                id: "p01",
                title: "새벽의 항구",
                subtitle: "도쿄",
                href: "/photo?photo=p01",
                image: null,
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useChat("ko"));

    act(() => expect(result.current.send("사진 보여줘")).toBe(true));
    expect(result.current.isReplying).toBe(true);
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2]?.references?.[0]).toMatchObject({
      type: "photo",
      href: "/photo?photo=p01",
    });
    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(requestBody).toEqual({
      lang: "ko",
      messages: [{ role: "user", content: "사진 보여줘" }],
    });
  });

  it("서버의 언어별 오류 문구를 대화에 표시한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: "RATE_LIMIT", message: "Usage is limited." } }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          ),
        ),
    );
    const { result } = renderHook(() => useChat("en"));

    act(() => result.current.send("question"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));
    expect(result.current.messages.at(-1)?.content).toBe("Usage is limited.");
  });

  it.each([
    [vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))],
    [vi.fn().mockResolvedValue(new Response("gateway error", { status: 502 }))],
  ])("네트워크·비 JSON 오류 원문 대신 현지화된 안전 문구를 표시한다", async (fetchMock) => {
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useChat("ko"));

    act(() => result.current.send("질문"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));
    expect(result.current.messages.at(-1)?.content).toBe(
      "답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  });
});
