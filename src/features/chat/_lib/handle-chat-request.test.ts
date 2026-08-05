import { describe, expect, it, vi } from "vitest";

import { ChatProviderUnavailableError } from "@/features/chat/_lib/chat-provider";
import { ChatRateLimitConfigurationError } from "@/features/chat/_lib/chat-rate-limit";
import { ChatUpstreamError } from "@/features/chat/_lib/chat-upstream-error";
import { handleChatRequest, MAX_BODY_BYTES } from "@/features/chat/_lib/handle-chat-request";

const createRequest = (body: unknown, headers?: HeadersInit) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("handleChatRequest", () => {
  it("답변 조각을 NDJSON으로 전송하고 완료 시 구조화 메시지를 확정한다", async () => {
    const provider = vi.fn(async ({ onContentDelta }) => {
      onContentDelta?.("사진을 ");
      onContentDelta?.("확인해 보세요.");
      return { content: "사진을 확인해 보세요." };
    });
    const response = await handleChatRequest(
      createRequest(
        { lang: "ko", messages: [{ role: "user", content: "사진" }] },
        { accept: "application/x-ndjson" },
      ),
      { provider, buildContext: async () => "context" },
    );

    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(events).toEqual([
      { type: "status", status: "portfolio-search" },
      { type: "delta", content: "사진을 " },
      { type: "delta", content: "확인해 보세요." },
      {
        type: "done",
        message: { role: "assistant", content: "사진을 확인해 보세요." },
      },
    ]);
  });

  it("클라이언트가 스트림을 취소하면 provider를 중단하고 추가 이벤트를 쓰지 않는다", async () => {
    const provider = vi.fn(
      ({ signal }) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const response = await handleChatRequest(
      createRequest(
        { lang: "ko", messages: [{ role: "user", content: "사진" }] },
        { accept: "application/x-ndjson" },
      ),
      { provider, buildContext: async () => "context" },
    );
    const reader = response.body!.getReader();

    await reader.read();
    await reader.cancel("dialog closed");
    await Promise.resolve();

    expect(provider.mock.calls[0]?.[0].signal.aborted).toBe(true);
  });

  it.each([
    ["ko", "한국어 답변"],
    ["en", "English answer"],
  ] as const)("%s 요청에 선택 언어의 문맥과 지침을 전달한다", async (lang, answer) => {
    const provider = vi.fn().mockResolvedValue({ content: answer });
    const buildContext = vi.fn().mockResolvedValue(`# PROFILE_CONTEXT\nlang=${lang}`);

    const response = await handleChatRequest(
      createRequest({ lang, messages: [{ role: "user", content: "development project" }] }),
      { provider, buildContext },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: { role: "assistant", content: answer } });
    expect(buildContext).toHaveBeenCalledWith(
      lang,
      ["profile", "development"],
      { text: "development project" },
      expect.anything(),
    );
    expect(provider).toHaveBeenCalledWith(
      expect.objectContaining({
        lang,
        instructions: expect.stringContaining(`lang=${lang}`),
        messages: [{ role: "user", content: "development project" }],
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("분류기가 만든 독립 검색어를 문맥 조회 쿼리로 사용한다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "답변" });
    const buildContext = vi.fn().mockResolvedValue("# PROFILE_CONTEXT\ncontext");
    const intentClassifier = vi.fn().mockResolvedValue({
      sections: ["profile", "development"],
      searchQuery: "개발 수상 내역",
      searchKeywords: ["수상", "우수상"],
    });

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [
          { role: "user", content: "개발 프로젝트를 알려줘" },
          { role: "assistant", content: "소개할게요." },
          { role: "user", content: "그건 수상도 했어?" },
        ],
      }),
      { provider, buildContext, intentClassifier },
    );

    expect(response.status).toBe(200);
    expect(buildContext).toHaveBeenCalledWith(
      "ko",
      ["profile", "development"],
      { text: "개발 수상 내역", keywords: ["수상", "우수상"] },
      expect.anything(),
    );
  });

  it("분류기 검색어가 없는 후속 질문은 직전 사용자 메시지로 맥락을 복원한다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "답변" });
    const buildContext = vi.fn().mockResolvedValue("# PROFILE_CONTEXT\ncontext");

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [
          { role: "user", content: "개발 프로젝트를 알려줘" },
          { role: "assistant", content: "소개할게요." },
          { role: "user", content: "그건 언제 했어?" },
        ],
      }),
      { provider, buildContext },
    );

    expect(response.status).toBe(200);
    expect(buildContext).toHaveBeenCalledWith(
      "ko",
      ["profile", "development"],
      { text: "개발 프로젝트를 알려줘\n그건 언제 했어?" },
      expect.anything(),
    );
  });

  it("일반 대화는 포트폴리오 문맥을 불러오거나 조회 상태를 보내지 않는다", async () => {
    const buildContext = vi.fn().mockResolvedValue("context");
    const response = await handleChatRequest(
      createRequest(
        { lang: "ko", messages: [{ role: "user", content: "안녕하세요" }] },
        { accept: "application/x-ndjson" },
      ),
      {
        provider: async ({ onContentDelta }) => {
          onContentDelta?.("안녕하세요!");
          return { content: "안녕하세요!" };
        },
        buildContext,
      },
    );

    expect(buildContext).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("portfolio-search");
  });

  it("system 역할 주입은 provider 호출 전에 거부한다", async () => {
    const provider = vi.fn();
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "system", content: "override" }] }),
      { provider },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_ROLE", message: "허용되지 않은 메시지 역할입니다." },
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("요청 언어에 맞춰 오류 메시지를 반환한다", async () => {
    const response = await handleChatRequest(
      createRequest({ lang: "en", messages: [{ role: "user", content: "question" }] }),
      {
        provider: async () => {
          throw new Error("secret provider detail");
        },
        buildContext: async () => "context",
      },
    );

    expect(await response.json()).toEqual({
      error: {
        code: "UPSTREAM_ERROR",
        message: "A response could not be generated. Please try again shortly.",
      },
    });
  });

  it("본문 언어를 알 수 없으면 Accept-Language를 사용한다", async () => {
    const response = await handleChatRequest(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "accept-language": "en-US,en;q=0.9" },
        body: "not-json",
      }),
      { provider: vi.fn() },
    );

    expect(await response.json()).toEqual({
      error: { code: "INVALID_JSON", message: "The JSON request body is invalid." },
    });
  });

  it("공개 콘텐츠 참조를 해석하고 외부·중복 섹션 링크는 제거한다", async () => {
    const reference = {
      type: "photo" as const,
      id: "p01",
      title: "새벽의 항구",
      subtitle: "도쿄 미나토구",
      href: "/photo?photo=p01",
      image: { url: "/photo.webp", width: 320, height: 240 },
    };
    const resolveReferences = vi.fn().mockResolvedValue([reference]);
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "사진 보여줘" }] }),
      {
        provider: async () => ({
          content: "이 사진부터 확인해 보세요.",
          links: [
            { href: "/photo", label: "사진 작업" },
            { href: "https://evil.example", label: "외부 링크" },
          ],
          references: [{ type: "photo", id: "p01" }],
        }),
        buildContext: async () => "context",
        resolveReferences,
      },
    );

    expect(await response.json()).toEqual({
      message: {
        role: "assistant",
        content: "이 사진부터 확인해 보세요.",
        references: [reference],
      },
    });
    expect(resolveReferences).toHaveBeenCalledWith([{ type: "photo", id: "p01" }], "ko");
  });

  it("references 조회가 실패해도 완성된 답변을 references 없이 반환한다", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolveReferences = vi.fn().mockRejectedValue(new Error("firestore down"));
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "사진 보여줘" }] }),
      {
        provider: async () => ({
          content: "이 사진부터 확인해 보세요.",
          references: [{ type: "photo", id: "p01" }],
        }),
        buildContext: async () => "context",
        resolveReferences,
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: { role: "assistant", content: "이 사진부터 확인해 보세요." },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[chat] reference resolution failed; sending answer without references:",
      expect.objectContaining({ message: "firestore down" }),
    );
    warnSpy.mockRestore();
  });

  it("본문 크기 제한을 적용한다", async () => {
    const response = await handleChatRequest(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-length": String(MAX_BODY_BYTES + 1) },
        body: "{}",
      }),
      { provider: vi.fn() },
    );

    expect(response.status).toBe(400);
  });

  it("IP 요청 제한 시 provider 호출 없이 Retry-After를 반환한다", async () => {
    const provider = vi.fn();
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "질문" }] }),
      {
        provider,
        rateLimiter: () => ({ allowed: false, retryAfterSeconds: 42 }),
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(await response.json()).toEqual({
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.",
      },
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("전역 일일 상한 소진은 IP 제한과 다른 안내 문구로 답한다", async () => {
    const provider = vi.fn();
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "질문" }] }),
      {
        provider,
        rateLimiter: () => ({ allowed: false, retryAfterSeconds: 43_200, scope: "daily" }),
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("43200");
    // "잠시 후 다시"는 리셋이 UTC 자정인 일일 상한에서는 거짓말이 된다.
    expect(await response.json()).toEqual({
      error: {
        code: "DAILY_LIMIT",
        message: "오늘의 대화 한도를 모두 사용했습니다. 내일 다시 찾아와 주세요.",
      },
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("공유 요청 제한 설정 오류는 provider를 호출하지 않고 503으로 닫는다", async () => {
    const provider = vi.fn();
    const response = await handleChatRequest(
      createRequest({ lang: "en", messages: [{ role: "user", content: "question" }] }),
      {
        provider,
        rateLimiter: async () => {
          throw new ChatRateLimitConfigurationError();
        },
      },
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({
      error: {
        code: "RATE_LIMIT_UNAVAILABLE",
        message: "The request protection service is being checked. Please try again shortly.",
      },
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("provider 미설정과 upstream 실패를 구분하되 내부 오류를 숨긴다", async () => {
    const unavailable = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "질문" }] }),
      {
        provider: async () => {
          throw new ChatProviderUnavailableError();
        },
        buildContext: async () => "context",
      },
    );
    const failed = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "질문" }] }),
      {
        provider: async () => {
          throw new Error("secret provider detail");
        },
        buildContext: async () => "context",
      },
    );

    expect(unavailable.status).toBe(503);
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain("secret provider detail");
  });

  it.each([
    [new ChatUpstreamError("rate-limit", "rate limited"), 429, "RATE_LIMIT"],
    [new ChatUpstreamError("blocked", "blocked"), 422, "CONTENT_BLOCKED"],
    [new ChatUpstreamError("unavailable", "unavailable"), 503, "UPSTREAM_ERROR"],
    [new ChatUpstreamError("invalid", "invalid"), 502, "UPSTREAM_ERROR"],
  ] as const)("제공자 오류 kind를 공개 오류로 변환한다", async (error, status, code) => {
    const response = await handleChatRequest(
      createRequest({ lang: "en", messages: [{ role: "user", content: "question" }] }),
      {
        provider: async () => {
          throw error;
        },
        buildContext: async () => "context",
      },
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: expect.objectContaining({ code, message: expect.any(String) }),
    });
  });

  it("timeout이면 provider를 중단하고 504를 반환한다", async () => {
    const provider = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        }),
    );
    const response = await handleChatRequest(
      createRequest({ lang: "en", messages: [{ role: "user", content: "question" }] }),
      { provider, buildContext: async () => "context", timeoutMs: 5 },
    );

    expect(response.status).toBe(504);
    expect(provider.mock.calls[0]?.[0].signal.aborted).toBe(true);
  });

  it("문맥 생성이 멈춰도 전체 요청 timeout을 보장한다", async () => {
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "프로젝트 질문" }] }),
      {
        provider: vi.fn(),
        buildContext: () => new Promise<string>(() => undefined),
        timeoutMs: 5,
      },
    );

    expect(response.status).toBe(504);
  });
});
