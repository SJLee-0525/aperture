// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
const submitEvent = (values: Partial<Record<"name" | "email" | "message", string>> = {}) => {
  const form = document.createElement("form");
  for (const name of ["name", "email", "message"] as const) {
    const field = document.createElement(name === "message" ? "textarea" : "input");
    field.name = name;
    field.value = values[name] ?? "";
    form.append(field);
  }
  const event = {
    preventDefault: vi.fn(),
    currentTarget: form,
  } as unknown as FormEvent<HTMLFormElement>;
  return { event, form };
};

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
    const { event, form } = submitEvent({
      name: "  Sungjoon ",
      email: " hello@example.com ",
      message: " 안녕하세요. ",
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
    expect(new FormData(form).get("message")).toBe("");
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
    const { event } = submitEvent();

    act(() => {
      submission = result.current.submit(event);
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
    const { event, form } = submitEvent({ message: "보존할 메시지" });

    await act(() => result.current.submit(event));

    expect(result.current.status).toBe("error");
    expect(new FormData(form).get("message")).toBe("보존할 메시지");
  });

  it("전송 오류 후 입력을 수정하면 상태를 idle로 되돌린다", async () => {
    fetchMock.mockRejectedValue(new TypeError("network error"));
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));
    const { event } = submitEvent();
    await act(() => result.current.submit(event));
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.resetStatus());

    expect(result.current.status).toBe("idle");
  });
});
