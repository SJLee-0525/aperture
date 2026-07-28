// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
const submitEvent = (): FormEvent => ({ preventDefault: vi.fn() }) as unknown as FormEvent;

describe("useContactForm", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY", "test-access-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("입력값을 정리해 Web3Forms로 전송하고 성공 후 폼을 비운다", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));
    const event = submitEvent();

    act(() => {
      result.current.update("name", "  Sungjoon ");
      result.current.update("email", " hello@example.com ");
      result.current.update("message", " 안녕하세요. ");
    });
    await act(() => result.current.submit(event));

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: "test-access-key",
        subject: "[Portfolio] Sungjoon",
        name: "Sungjoon",
        email: "hello@example.com",
        message: "안녕하세요.",
      }),
    });
    expect(result.current.status).toBe("sent");
    expect(result.current.draft).toEqual({ name: "", email: "", message: "" });
  });

  it("응답을 기다리는 동안 전송 중 상태를 보여준다", async () => {
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));
    let submission!: Promise<void>;

    act(() => {
      submission = result.current.submit(submitEvent());
    });
    expect(result.current.status).toBe("sending");

    resolveResponse(new Response('{"success":true}'));
    await act(() => submission);
    expect(result.current.status).toBe("sent");
  });

  it.each([
    ["API가 실패를 반환할 때", () => Promise.resolve(new Response('{"success":false}'))],
    ["네트워크 요청이 실패할 때", () => Promise.reject(new TypeError("network error"))],
  ])("%s 오류 상태를 보여주고 입력값을 보존한다", async (_label, response) => {
    fetchMock.mockImplementation(response);
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));
    act(() => result.current.update("message", "보존할 메시지"));

    await act(() => result.current.submit(submitEvent()));

    expect(result.current.status).toBe("error");
    expect(result.current.draft.message).toBe("보존할 메시지");
  });

  it("전송 오류 후 입력을 수정하면 상태를 idle로 되돌린다", async () => {
    fetchMock.mockRejectedValue(new TypeError("network error"));
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));
    await act(() => result.current.submit(submitEvent()));
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.update("message", "다시 작성"));

    expect(result.current.status).toBe("idle");
  });
});
