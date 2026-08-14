// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChat } from "@/features/chat/_hooks/use-chat";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
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
    expect(result.current.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "",
      pending: true,
    });
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

  it("스트림 조각을 대기 말풍선에 누적하고 완료 메타데이터를 보존한다", async () => {
    const events = [
      { type: "status", status: "portfolio-search" },
      { type: "delta", content: "사진을 " },
      { type: "delta", content: "확인해 보세요." },
      {
        type: "done",
        message: {
          role: "assistant",
          content: "사진을 확인해 보세요.",
          links: [{ label: "사진", href: "/photo" }],
          contactDraft: { name: null, email: null, message: "문의" },
        },
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(events.map((event) => JSON.stringify(event)).join("\n") + "\n", {
          headers: { "Content-Type": "application/x-ndjson" },
        }),
      ),
    );
    const { result } = renderHook(() => useChat("ko"));

    act(() => result.current.send("사진"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(result.current.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "사진을 확인해 보세요.",
      pending: false,
      links: [{ label: "사진", href: "/photo" }],
      // done 이벤트의 contactDraft가 메시지에 보존된다 — delta에는 실리지 않는다.
      contactDraft: { name: null, email: null, message: "문의" },
    });
  });

  it("전송 시점의 URL에서 화면 문맥을 새로 만들어 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { role: "assistant", content: "네." } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/ko/photo?photo=p01");
    const { result } = renderHook(() => useChat("ko"));

    act(() => expect(result.current.send("이 사진 어디서 찍었어?")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).context).toEqual({
      pathname: "/ko/photo",
      openTarget: { type: "photo", id: "p01" },
    });

    // 모달을 바꾼 뒤의 다음 전송은 저장된 값이 아니라 새 URL에서 문맥을 다시 만든다.
    window.history.replaceState(null, "", "/ko/music?work=w1");
    act(() => expect(result.current.send("지금 보고 있는 연주 알려줘")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string).context).toEqual({
      pathname: "/ko/music",
      openTarget: { type: "work", id: "w1" },
    });
  });

  it("글 상세에서는 URL 대신 등록한 화면 target 의 문서 ID 를 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { role: "assistant", content: "네." } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/ko/dev/articles/serverless-portfolio");
    const { result } = renderHook(() =>
      useChat("ko", undefined, () => ({ type: "article", id: "a1", label: "서버 없이 운영한다" })),
    );

    act(() => expect(result.current.send("이 글 요약해 줘")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    // slug 가 아니라 바뀌지 않는 문서 ID 를 보낸다. slug 는 서버가 대조에만 쓴다.
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).context).toEqual({
      pathname: "/ko/dev/articles/serverless-portfolio",
      openTarget: { type: "article", id: "a1" },
    });
  });

  it("등록한 target 이 없는 글 상세에서는 경로만 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { role: "assistant", content: "네." } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/ko/dev/articles/serverless-portfolio");
    const { result } = renderHook(() => useChat("ko"));

    act(() => expect(result.current.send("이 글 요약해 줘")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).context).toEqual({
      pathname: "/ko/dev/articles/serverless-portfolio",
    });
  });

  it("실제 요청과 일치하는 화면 항목을 사용자 메시지에 표시용으로 기록한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { role: "assistant", content: "네." } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/ko/photo?photo=p01");
    const { result } = renderHook(() =>
      useChat("ko", undefined, () => ({ type: "photo", id: "p01", label: "새벽의 항구" })),
    );

    act(() => expect(result.current.send("이 사진 어디서 찍었어?")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(result.current.messages[1]).toMatchObject({
      role: "user",
      content: "이 사진 어디서 찍었어?",
      sentContext: {
        type: "photo",
        id: "p01",
        label: "새벽의 항구",
        href: "/ko/photo?photo=p01",
      },
    });
    // 표시용 스냅샷은 모델 대화 이력에 복제하지 않는다.
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).messages).toEqual([
      { role: "user", content: "이 사진 어디서 찍었어?" },
    ]);
  });

  it("화면 표시 target과 URL target이 다르면 사용자 메시지에 기록하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: { role: "assistant", content: "네." } }), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    window.history.replaceState(null, "", "/ko/photo?photo=p02");
    const { result } = renderHook(() =>
      useChat("ko", undefined, () => ({ type: "photo", id: "p01", label: "새벽의 항구" })),
    );

    act(() => result.current.send("이 사진은 어디야?"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(result.current.messages[1]?.sentContext).toBeUndefined();
  });

  it("제외 키가 현재 열린 항목과 일치하면 openTarget만 빼고 pathname은 유지한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { role: "assistant", content: "네." } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/ko/photo?photo=p01");
    const { result } = renderHook(() =>
      useChat(
        "ko",
        () => "photo:p01",
        () => ({ type: "photo", id: "p01", label: "새벽의 항구" }),
      ),
    );

    act(() => expect(result.current.send("사진 페이지 이야기")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).context).toEqual({
      pathname: "/ko/photo",
    });
    expect(result.current.messages[1]?.sentContext).toBeUndefined();
  });

  it("제외 키가 다른 항목이면 openTarget을 그대로 보낸다 — 이동하면 제외는 무효", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: { role: "assistant", content: "네." } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/ko/photo?photo=p02");
    const { result } = renderHook(() => useChat("ko", () => "photo:p01"));

    act(() => expect(result.current.send("이 사진 어디서 찍었어?")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).context).toEqual({
      pathname: "/ko/photo",
      openTarget: { type: "photo", id: "p02" },
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

  it("오류 안내 메시지를 다음 모델 요청의 대화 기록에서 제외한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "일시 오류입니다." } }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: { role: "assistant", content: "다시 답변합니다." } }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useChat("ko"));

    act(() => result.current.send("프로젝트 알려줘"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));
    act(() => result.current.send("다시 알려줘"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    const request = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(request.messages).not.toContainEqual({ role: "assistant", content: "일시 오류입니다." });
  });

  it("terminal 이벤트 없이 끊긴 스트림을 성공으로 처리하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(`${JSON.stringify({ type: "delta", content: "작성 중" })}\n`, {
          headers: { "Content-Type": "application/x-ndjson" },
        }),
      ),
    );
    const { result } = renderHook(() => useChat("en"));

    act(() => result.current.send("question"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(result.current.messages.at(-1)).toMatchObject({
      pending: false,
      content: "The response could not be loaded. Please try again shortly.",
    });
  });

  it("재시도 가능한 오류를 같은 질문으로 다시 보내고 중복 사용자 턴을 남기지 않는다", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: { role: "assistant", content: "재시도에 성공했습니다." } }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useChat("ko"));

    act(() => result.current.send("프로젝트 알려줘"));
    await waitFor(() => expect(result.current.isReplying).toBe(false));
    const errorId = result.current.messages.at(-1)?.id;
    expect(result.current.messages.at(-1)?.error?.retryable).toBe(true);

    act(() => expect(result.current.retry(errorId ?? "")).toBe(true));
    await waitFor(() => expect(result.current.isReplying).toBe(false));

    expect(result.current.messages.filter(({ role }) => role === "user")).toHaveLength(1);
    expect(result.current.messages.at(-1)?.content).toBe("재시도에 성공했습니다.");
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
