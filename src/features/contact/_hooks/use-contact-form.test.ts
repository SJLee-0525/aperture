// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
const submitEvent = (
  values: Partial<Record<"name" | "email" | "message", string>> = {},
  options: { botcheck?: boolean; captchaToken?: string | null } = {},
) => {
  const form = document.createElement("form");
  for (const name of ["name", "email", "message"] as const) {
    const field = document.createElement(name === "message" ? "textarea" : "input");
    field.name = name;
    field.value = values[name] ?? "";
    form.append(field);
  }
  if (options.botcheck) {
    const honeypot = document.createElement("input");
    honeypot.type = "checkbox";
    honeypot.name = "botcheck";
    honeypot.checked = true;
    form.append(honeypot);
  }
  // hCaptcha 가 폼에 심는 토큰 필드 — 기본은 "해결됨"으로 두고, 미해결 케이스만 명시적으로 끈다.
  if (options.captchaToken !== null) {
    const token = document.createElement("input");
    token.name = "h-captcha-response";
    token.value = options.captchaToken ?? "hcaptcha-token";
    form.append(token);
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
        botcheck: false,
        "h-captcha-response": "hcaptcha-token",
      }),
    });
    expect(result.current.status).toBe("sent");
    expect(new FormData(form).get("message")).toBe("");
  });

  it("캡차 미해결 제출은 전송하지 않고 무엇을 해야 하는지 알린다", async () => {
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));
    const { event, form } = submitEvent({ message: "보존할 메시지" }, { captchaToken: null });

    await act(() => result.current.submit(event));

    // 토큰 없이 보내면 Web3Forms 가 거부하므로, 왕복 없이 미리 막고 입력은 보존한다.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("captcha-required");
    expect(new FormData(form).get("message")).toBe("보존할 메시지");
  });

  it("전송에 성공하면 1회용 hCaptcha 토큰을 리셋한다", async () => {
    const reset = vi.fn();
    vi.stubGlobal("hcaptcha", { reset });
    fetchMock.mockResolvedValue(new Response('{"success":true}'));
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));

    await act(() => result.current.submit(submitEvent().event));

    // 리셋하지 않으면 위젯이 소진된 토큰을 계속 들고 있어 두 번째 제출이 항상 거부된다.
    expect(reset).toHaveBeenCalledOnce();
  });

  it("허니팟이 채워진 제출은 전송하지 않고 성공한 척 끝낸다", async () => {
    const { useContactForm } = await import("@/features/contact/_hooks/use-contact-form");
    const { result } = renderHook(() => useContactForm("hello@example.com"));
    const { event } = submitEvent({ message: "스팸" }, { botcheck: true });

    await act(() => result.current.submit(event));

    // 봇에게 차단 사실을 알리지 않아야 우회 시도를 유도하지 않는다.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("sent");
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
