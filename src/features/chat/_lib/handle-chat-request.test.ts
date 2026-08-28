import { describe, expect, it, vi } from "vitest";

import { ChatProviderUnavailableError } from "@/features/chat/_lib/chat-provider";
import { ChatRateLimitConfigurationError } from "@/features/chat/_lib/chat-rate-limit";
import { MAX_BODY_BYTES } from "@/features/chat/_lib/chat-schema";
import { ChatUpstreamError } from "@/features/chat/_lib/chat-upstream-error";
import { handleChatRequest } from "@/features/chat/_lib/handle-chat-request";

import { EMPTY_DEV_CONFIG, EMPTY_MUSIC_CONFIG, EMPTY_SITE_CONFIG } from "@/constants/empty-configs";

import type { PhotoFilterVocabulary } from "@/lib/photo/filter-query";
import type { ChatReference } from "@/types/chat";
import type { DevArticle } from "@/types/dev-article";

const createRequest = (body: unknown, headers?: HeadersInit) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const EMPTY_LOOKUP = { photo: {}, work: {}, award: {}, project: {}, article: {} };
/** 관리자가 방금 비공개로 바꿔 최신 조회에 아무 항목도 없는 상태. */
const FRESH_WITHOUT_PHOTO = {
  site: EMPTY_SITE_CONFIG,
  devConfig: EMPTY_DEV_CONFIG,
  devProjects: [],
  musicConfig: EMPTY_MUSIC_CONFIG,
  musicWorks: [],
  musicAwards: [],
  musicMedia: [],
  photos: [],
  albums: [],
  articles: [],
  articleTags: [],
};
const createSnapshot = (overrides?: Partial<ReturnType<typeof baseSnapshot>>) => ({
  ...baseSnapshot(),
  ...overrides,
});
const baseSnapshot = () => ({
  context: [{ section: "__header__", text: "# PROFILE_CONTEXT\ncontext" }],
  references: [] as ChatReference[],
  screenLookup: EMPTY_LOOKUP,
  articleSlugById: {} as Record<string, string>,
  linkVocabulary: { tags: [], cameras: [], photoIds: [] } as PhotoFilterVocabulary,
});

const PHOTO_VOCABULARY: PhotoFilterVocabulary = {
  tags: [{ id: "sea", ko: "바다", en: "Sea" }],
  cameras: ["Leica Q3"],
  photoIds: ["p01"],
};

describe("handleChatRequest", () => {
  it("답변 조각을 NDJSON으로 전송하고 완료 시 구조화 메시지를 확정한다", async () => {
    const provider = vi.fn(async ({ onContentDelta }) => {
      onContentDelta?.("사진을 ");
      onContentDelta?.("확인해 보세요.");
      return { content: "사진을 확인해 보세요.", contactDraft: null };
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
      expect.any(Function),
      ["profile", "development"],
      { text: "development project" },
      expect.anything(),
      undefined,
      undefined,
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
      expect.any(Function),
      ["profile", "development"],
      { text: "개발 수상 내역", keywords: ["수상", "우수상"] },
      expect.anything(),
      undefined,
      undefined,
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
      expect.any(Function),
      ["profile", "development"],
      { text: "개발 프로젝트를 알려줘\n그건 언제 했어?" },
      expect.anything(),
      undefined,
      undefined,
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
          return { content: "안녕하세요!", contactDraft: null };
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
        headers: {
          "content-type": "application/json",
          "accept-language": "en-US,en;q=0.9",
        },
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
    const cachedReferences = [reference];
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
          contactDraft: null,
        }),
        loadSnapshot: async () => createSnapshot({ references: cachedReferences }),
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
    expect(resolveReferences).toHaveBeenCalledWith(
      [{ type: "photo", id: "p01" }],
      cachedReferences,
      undefined,
    );
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
          contactDraft: null,
        }),
        loadSnapshot: async () => createSnapshot(),
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
        headers: {
          "content-type": "application/json",
          "content-length": String(MAX_BODY_BYTES + 1),
        },
        body: "{}",
      }),
      { provider: vi.fn() },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "REQUEST_TOO_LARGE", message: "요청이 너무 큽니다." },
    });
  });

  it("JSON 이 아닌 Content-Type 은 본문을 읽기 전에 막는다", async () => {
    const provider = vi.fn();
    const response = await handleChatRequest(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ lang: "ko", messages: [{ role: "user", content: "안녕" }] }),
      }),
      { provider },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_REQUEST_SOURCE", message: "이 요청은 처리할 수 없습니다." },
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("교차 출처 Sec-Fetch-Site 는 막고, 헤더가 없으면 통과시킨다", async () => {
    const crossSite = await handleChatRequest(
      createRequest(
        { lang: "ko", messages: [{ role: "user", content: "안녕" }] },
        {
          "sec-fetch-site": "cross-site",
        },
      ),
      { provider: vi.fn() },
    );
    expect(crossSite.status).toBe(400);

    const sameOrigin = await handleChatRequest(
      createRequest(
        { lang: "ko", messages: [{ role: "user", content: "안녕" }] },
        {
          "sec-fetch-site": "same-origin",
        },
      ),
      { provider: vi.fn().mockResolvedValue({ content: "네" }) },
    );
    expect(sameOrigin.status).not.toBe(400);
  });

  it("Content-Length 없이 보낸 큰 본문도 상한에서 끊는다", async () => {
    const provider = vi.fn();
    const chunk = new TextEncoder().encode("x".repeat(8_000));
    let pushed = 0;
    // chunked 전송은 Content-Length 가 없어 선검사를 지나온다.
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pushed += 1;
        controller.enqueue(chunk);
        if (pushed >= 100) controller.close();
      },
    });
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const response = await handleChatRequest(request, { provider });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("REQUEST_TOO_LARGE");
    // 상한을 넘는 순간 멈추므로 본문 전체를 읽지 않는다.
    expect(pushed).toBeLessThan(10);
    expect(provider).not.toHaveBeenCalled();
  });

  it("본문 상한 초과는 사용량 판정 전에 400 으로 끊는다", async () => {
    const provider = vi.fn();
    const rateLimiter = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [{ role: "user", content: "x".repeat(MAX_BODY_BYTES + 1) }],
      }),
      { provider, rateLimiter },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("REQUEST_TOO_LARGE");
    // 형식이 깨진 요청이 전역 일일 카운터를 올리지 않게 제한기까지 가지 않는다.
    expect(rateLimiter).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it("깨진 JSON 은 사용량 카운터를 건드리지 않는다", async () => {
    const provider = vi.fn();
    const rateLimiter = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));

    const response = await handleChatRequest(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      { provider, rateLimiter },
    );

    expect(response.status).toBe(400);
    expect(rateLimiter).not.toHaveBeenCalled();
  });

  it("하루 입력 문자 예산을 넘기면 문맥 조회 없이 답한다", async () => {
    const provider = vi.fn(async (input: { instructions: string }) => {
      instructions = input.instructions;
      return { content: "답변", contactDraft: null };
    });
    const buildContext = vi.fn(async () => "context");
    const recordTokenUsage = vi.fn<(chars: number) => Promise<void>>(async () => undefined);
    let instructions = "";

    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "사진 보여 줘" }] }),
      {
        provider,
        buildContext,
        recordTokenUsage,
        inputCharLimit: 1_000,
        rateLimiter: () => ({ allowed: true, retryAfterSeconds: 0, dailyInputChars: 1_001 }),
      },
    );

    expect(response.status).toBe(200);
    // 문맥 조회와 벡터 검색을 모두 건너뛴다.
    expect(buildContext).not.toHaveBeenCalled();
    expect(instructions).toContain("No portfolio lookup was needed");
    expect(instructions).not.toContain("SCREEN_CONTEXT");
    // 강등 상태에서도 이번 요청의 입력은 예산에 더한다.
    expect(recordTokenUsage).toHaveBeenCalledWith(expect.any(Number));
    expect(recordTokenUsage.mock.lastCall?.[0]).toBeGreaterThan(0);
  });

  it("예산을 넘기면 조회하지 않으므로 검색 중 상태를 보내지 않는다", async () => {
    const provider = vi.fn(async ({ onContentDelta }: { onContentDelta?: (d: string) => void }) => {
      onContentDelta?.("답변");
      return { content: "답변", contactDraft: null };
    });

    const response = await handleChatRequest(
      createRequest(
        { lang: "ko", messages: [{ role: "user", content: "사진 보여 줘" }] },
        { accept: "application/x-ndjson" },
      ),
      {
        provider,
        buildContext: async () => "context",
        recordTokenUsage: async () => undefined,
        inputCharLimit: 1_000,
        rateLimiter: () => ({ allowed: true, retryAfterSeconds: 0, dailyInputChars: 1_001 }),
      },
    );

    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.some((event) => event.status === "portfolio-search")).toBe(false);
  });

  it("기록 구현이 거부해도 응답을 막지 않는다", async () => {
    const provider = vi.fn(async () => ({ content: "답변", contactDraft: null }));

    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "질문" }] }),
      {
        provider,
        buildContext: async () => "context",
        recordTokenUsage: async () => {
          throw new Error("기록 실패");
        },
      },
    );

    expect(response.status).toBe(200);
  });

  it("예산 안에서는 문맥을 그대로 싣는다", async () => {
    const provider = vi.fn(async () => ({ content: "답변", contactDraft: null }));
    const buildContext = vi.fn(async () => "context");

    await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "사진 보여 줘" }] }),
      {
        provider,
        buildContext,
        recordTokenUsage: async () => undefined,
        inputCharLimit: 1_000,
        rateLimiter: () => ({ allowed: true, retryAfterSeconds: 0, dailyInputChars: 999 }),
      },
    );

    expect(buildContext).toHaveBeenCalled();
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
    // 상류가 요청을 거절한 것과 응답이 상한을 넘은 것은 방문자가 할 수 있는 일이 다르다.
    [new ChatUpstreamError("invalid", "invalid"), 502, "UPSTREAM_REQUEST_REJECTED"],
    [new ChatUpstreamError("too-long", "too long"), 502, "RESPONSE_TOO_LONG"],
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

  it("열린 모달 문맥을 SCREEN_CONTEXT 블록으로 지침에 넣는다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "새벽의 항구는 도쿄에서 찍었어요." });
    const loadSnapshot = vi.fn(async () =>
      createSnapshot({
        screenLookup: { ...EMPTY_LOOKUP, photo: { p01: "Photo: 새벽의 항구 | place: 도쿄" } },
      }),
    );

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [{ role: "user", content: "이 사진 어디서 찍었어?" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "p01" } },
      }),
      { provider, loadSnapshot, buildContext: async () => "context" },
    );

    expect(response.status).toBe(200);
    const instructions = provider.mock.calls[0]?.[0].instructions as string;
    expect(instructions).toContain("# SCREEN_CONTEXT");
    expect(instructions).toContain("새벽의 항구 | place: 도쿄");
  });

  it("인텐트가 프로필 로드를 생략해도 화면 문맥은 포함하고 스냅샷은 1회만 로드한다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "네, 이 사진이에요." });
    const loadSnapshot = vi.fn(async () =>
      createSnapshot({ screenLookup: { ...EMPTY_LOOKUP, photo: { p01: "Photo: 새벽의 항구" } } }),
    );

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        // 인사말은 섹션이 비어 프로필 로드를 건너뛰는 입력이다.
        messages: [{ role: "user", content: "안녕하세요" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "p01" } },
      }),
      { provider, loadSnapshot },
    );

    expect(response.status).toBe(200);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
    const instructions = provider.mock.calls[0]?.[0].instructions as string;
    expect(instructions).toContain("# SCREEN_CONTEXT");
    expect(instructions).toContain("No portfolio lookup was needed");
  });

  it("openTarget이 없고 프로필도 불필요하면 스냅샷을 로드하지 않는다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "안녕하세요!" });
    const loadSnapshot = vi.fn(async () => createSnapshot());

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [{ role: "user", content: "안녕하세요" }],
        context: { pathname: "/ko/photo" },
      }),
      { provider, loadSnapshot },
    );

    expect(response.status).toBe(200);
    expect(loadSnapshot).not.toHaveBeenCalled();
  });

  it("화면 문맥 조회가 실패해도 SCREEN_CONTEXT 없이 답변을 계속한다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "사진 이야기를 해볼까요?" });
    const loadSnapshot = vi.fn(async () => {
      throw new Error("firestore down");
    });

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [{ role: "user", content: "안녕하세요" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "p01" } },
      }),
      { provider, loadSnapshot },
    );

    expect(response.status).toBe(200);
    const instructions = provider.mock.calls[0]?.[0].instructions as string;
    expect(instructions).not.toContain("# SCREEN_CONTEXT");
  });

  it("존재하지 않는 id의 화면 문맥은 무시하고 기존 응답과 동일하게 답한다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "안녕하세요!" });

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [{ role: "user", content: "안녕하세요" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "no-such" } },
      }),
      { provider, loadSnapshot: async () => createSnapshot() },
    );

    expect(response.status).toBe(200);
    const instructions = provider.mock.calls[0]?.[0].instructions as string;
    expect(instructions).not.toContain("# SCREEN_CONTEXT");
    expect(await response.json()).toEqual({
      message: { role: "assistant", content: "안녕하세요!" },
    });
  });

  it("존재하지 않는 id의 열린 항목은 프로필 조회를 열지 못한다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "무엇을 도와드릴까요?" });
    const buildContext = vi.fn(async () => "context");

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        // 분야 단어가 없어 인텐트가 비는 입력이다. 열린 항목만이 섹션을 열 수 있다.
        messages: [{ role: "user", content: "asdf" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "no-such" } },
      }),
      { provider, loadSnapshot: async () => createSnapshot(), buildContext },
    );

    expect(response.status).toBe(200);
    expect(buildContext).not.toHaveBeenCalled();
  });

  /**
   * 관리자가 사진을 비공개로 바꾼 직후, 그 딥링크를 열어 둔 방문자가 질문하는 경우.
   * 섹션 게이트(verified)와 화면 문맥이 서로 다른 판정을 보면 누수가 반만 닫힌다.
   * 화면 문맥이 빠져도 그 섹션의 RAG 검색이 열리면 같은 항목이 다른 경로로 나온다.
   */
  it("최신 조회에서 사라진 항목은 섹션 조회도 열지 못한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const provider = vi.fn().mockResolvedValue({ content: "무엇을 도와드릴까요?" });
    const buildContext = vi.fn(async () => "context");
    // 최신 데이터에는 그 사진이 없다. 캐시 스냅샷에는 아직 남아 있다.
    const loadFreshData = vi.fn(async () => FRESH_WITHOUT_PHOTO);

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [{ role: "user", content: "asdf" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "p01" } },
      }),
      {
        provider,
        loadSnapshot: async () =>
          createSnapshot({
            screenLookup: { ...EMPTY_LOOKUP, photo: { p01: "Photo: 새벽의 항구" } },
          }),
        buildContext,
        loadFreshData,
      },
    );

    expect(response.status).toBe(200);
    expect(loadFreshData).toHaveBeenCalled();
    // 섹션이 열리지 않아 프로필 조회 자체가 없다.
    expect(buildContext).not.toHaveBeenCalled();
    expect(provider.mock.calls[0]?.[0].instructions).not.toContain("# SCREEN_CONTEXT");
    vi.unstubAllEnvs();
  });

  it("스냅샷에서 찾은 열린 항목은 그 섹션으로 조회한다", async () => {
    const provider = vi.fn().mockResolvedValue({ content: "이 사진 이야기예요." });
    const buildContext = vi.fn(async () => "context");

    const response = await handleChatRequest(
      createRequest({
        lang: "ko",
        messages: [{ role: "user", content: "asdf" }],
        context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "p01" } },
      }),
      {
        provider,
        loadSnapshot: async () =>
          createSnapshot({
            screenLookup: { ...EMPTY_LOOKUP, photo: { p01: "Photo: 새벽의 항구" } },
          }),
        buildContext,
      },
    );

    expect(response.status).toBe(200);
    expect(buildContext).toHaveBeenCalledWith(
      expect.any(Function),
      ["profile", "photography"],
      expect.anything(),
      expect.anything(),
      undefined,
      undefined,
    );
  });

  const linksOf = async (links: Array<{ href: string; label: string }>) => {
    const loadSnapshot = vi.fn(async () => createSnapshot({ linkVocabulary: PHOTO_VOCABULARY }));
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "사진 보여줘" }] }),
      {
        provider: async () => ({ content: "확인해 보세요.", links, contactDraft: null }),
        loadSnapshot,
        buildContext: async () => "context",
      },
    );
    const body = (await response.json()) as { message: { links?: unknown } };
    return { links: body.message.links, loadSnapshot };
  };

  it("사진 필터 링크를 canonical로 재직렬화한다 (라벨 정규화·순서 재정렬)", async () => {
    const { links, loadSnapshot } = await linksOf([
      { href: "/photo?camera=leica&tag=Sea", label: "바다 사진" },
    ]);

    expect(links).toEqual([{ href: "/photo?tag=sea&camera=Leica+Q3", label: "바다 사진" }]);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["unknown key 포함", "/photo?redirect=https://evil.example"],
    ["known+unknown 혼합", "/photo?tag=sea&redirect=https://evil.example"],
    ["사전에 없는 태그", "/photo?tag=zzz"],
    ["역전 초점 범위", "/photo?focalMin=200&focalMax=35"],
    ["존재하지 않는 photo id", "/photo?photo=zzz"],
    ["중복 known key", "/photo?tag=sea&tag=sea"],
    ["fragment 포함", "/photo#top"],
    ["protocol-relative", "//evil.example/photo"],
    ["credentials", "https://user:pw@evil.example/photo"],
    ["encoded slash 우회", "/photo%2F../admin"],
    ["dot segment 우회", "/foo/../photo"],
  ])("%s 링크는 전체 폐기한다", async (_, href) => {
    const { links } = await linksOf([{ href, label: "링크" }]);
    expect(links).toBeUndefined();
  });

  it("query 없는 /photo와 검증 통과 링크는 유지된다", async () => {
    const { links } = await linksOf([
      { href: "/photo", label: "사진 작업" },
      { href: "/photo?photo=p01", label: "이 사진" },
    ]);

    expect(links).toEqual([
      { href: "/photo", label: "사진 작업" },
      { href: "/photo?photo=p01", label: "이 사진" },
    ]);
  });

  it("참조 카드와 같은 사진을 가리키는 query 링크는 중복이라 버린다", async () => {
    const reference = {
      type: "photo" as const,
      id: "p01",
      title: "새벽의 항구",
      subtitle: "도쿄",
      href: "/photo?photo=p01",
      image: null,
    };
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "사진 보여줘" }] }),
      {
        provider: async () => ({
          content: "이 사진이에요.",
          links: [
            { href: "/photo?photo=p01", label: "이 사진 열기" },
            // 같은 사진이라도 필터 링크는 목록 진입이라 유지된다 (정책).
            { href: "/photo?tag=sea", label: "바다 사진 더 보기" },
          ],
          references: [{ type: "photo", id: "p01" }],
          contactDraft: null,
        }),
        loadSnapshot: async () =>
          createSnapshot({ references: [reference], linkVocabulary: PHOTO_VOCABULARY }),
        buildContext: async () => "context",
        resolveReferences: async () => [reference],
      },
    );

    const body = (await response.json()) as { message: { links?: unknown } };
    expect(body.message.links).toEqual([{ href: "/photo?tag=sea", label: "바다 사진 더 보기" }]);
  });

  it("사진 외 허용 경로의 query는 현행대로 통과한다 (정책 명시)", async () => {
    const { links } = await linksOf([{ href: "/contact?subject=hello", label: "연락" }]);

    expect(links).toEqual([{ href: "/contact?subject=hello", label: "연락" }]);
  });

  it("어휘 로드가 실패하면 query 있는 /photo 링크만 fail-closed로 버린다", async () => {
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "사진 보여줘" }] }),
      {
        provider: async () => ({
          content: "확인해 보세요.",
          links: [
            { href: "/photo?tag=sea", label: "바다 사진" },
            { href: "/contact", label: "연락" },
          ],
          contactDraft: null,
        }),
        loadSnapshot: async () => {
          throw new Error("firestore down");
        },
        buildContext: async () => "context",
      },
    );

    const body = (await response.json()) as { message: { links?: unknown; content: string } };
    expect(body.message.content).toBe("확인해 보세요.");
    expect(body.message.links).toEqual([{ href: "/contact", label: "연락" }]);
  });

  it("블로그 목록 링크는 허용 경로라 통과한다", async () => {
    const { links } = await linksOf([{ href: "/dev/articles", label: "블로그 보기" }]);

    expect(links).toEqual([{ href: "/dev/articles", label: "블로그 보기" }]);
  });

  it("모델이 지어낸 /article 경로는 버린다", async () => {
    const { links } = await linksOf([{ href: "/article", label: "글" }]);

    expect(links).toBeUndefined();
  });

  it("article 카드가 있으면 블로그 목록 링크도 중복 표면으로 제거한다", async () => {
    const reference = {
      type: "article" as const,
      id: "a1",
      title: "서버 없이 운영한다",
      subtitle: "2026.05.18 · 기록",
      href: "/dev/articles/serverless",
      image: null,
    };
    const response = await handleChatRequest(
      createRequest({ lang: "ko", messages: [{ role: "user", content: "블로그 보여줘" }] }),
      {
        provider: async () => ({
          content: "이 글이에요.",
          links: [
            { href: "/dev/articles", label: "블로그 목록" },
            { href: "/contact", label: "연락" },
          ],
          references: [{ type: "article", id: "a1" }],
          contactDraft: null,
        }),
        loadSnapshot: async () => createSnapshot({ references: [reference] }),
        buildContext: async () => "context",
        resolveReferences: async () => [reference],
      },
    );

    const body = (await response.json()) as { message: { links?: unknown } };
    // 프로젝트 카드와 같은 정책이다. 목록 링크를 살리고 싶어지면 이 계약부터 바꾼다.
    expect(body.message.links).toEqual([{ href: "/contact", label: "연락" }]);
  });

  describe("열린 블로그 글 검증", () => {
    const ARTICLE_CONTEXT = {
      pathname: "/ko/dev/articles/serverless-portfolio",
      openTarget: { type: "article" as const, id: "a1" },
    };
    const LIVE_ARTICLE: DevArticle = {
      id: "a1",
      slug: "serverless-portfolio",
      title: { ko: "서버 없이 운영한다", en: "Running without a server" },
      summary: { ko: "요약", en: "Summary" },
      body: "본문",
      cover: null,
      coverAlt: null,
      tags: [],
      relatedProjectIds: [],
      pinned: false,
      published: true,
      publishedAt: new Date("2026-05-18T00:00:00Z"),
      firstPublishedAt: new Date("2026-05-18T00:00:00Z"),
      createdAt: new Date("2026-05-01T00:00:00Z"),
      updatedAt: new Date("2026-05-18T00:00:00Z"),
    };
    const snapshotWith = (slugById: Record<string, string>) =>
      createSnapshot({
        articleSlugById: slugById,
        screenLookup: { ...EMPTY_LOOKUP, article: { a1: "Article: 서버 없이 운영한다" } },
      });

    const runWith = async (
      snapshot: ReturnType<typeof createSnapshot>,
      overrides?: { message?: string; loadArticle?: (id: string) => Promise<DevArticle | null> },
    ) => {
      // 인자 위치로 sections·prioritize 를 읽어야 해서 가변 인자 시그니처로 둔다.
      const buildContext = vi.fn<(...args: unknown[]) => Promise<string>>(async () => "context");
      const provider = vi.fn<
        (...args: Array<{ instructions: string }>) => Promise<{
          content: string;
          contactDraft: null;
        }>
      >(async () => ({ content: "요약입니다.", contactDraft: null }));
      await handleChatRequest(
        createRequest({
          lang: "ko",
          messages: [{ role: "user", content: overrides?.message ?? "이 글 요약해 줘" }],
          context: ARTICLE_CONTEXT,
        }),
        {
          provider,
          loadSnapshot: async () => snapshot,
          buildContext,
          ...(overrides?.loadArticle ? { loadArticle: overrides.loadArticle } : {}),
        },
      );
      return {
        sections: buildContext.mock.calls[0]?.[1],
        prioritize: buildContext.mock.calls[0]?.[4],
        contextCalls: buildContext.mock.calls.length,
        instructions: provider.mock.calls[0]?.[0]?.instructions,
      };
    };

    it("slug 가 맞으면 화면 문맥과 우선 검색에 같은 target 을 넘긴다", async () => {
      const { prioritize, instructions } = await runWith(
        snapshotWith({ a1: "serverless-portfolio" }),
      );

      expect(prioritize).toEqual({
        sourceType: "article",
        sourceId: "a1",
        ignoreScoreFloor: true,
      });
      expect(instructions).toContain("# SCREEN_CONTEXT");
    });

    it("slug 가 다르면 화면 문맥과 우선 검색을 함께 버린다", async () => {
      const { prioritize, instructions } = await runWith(snapshotWith({ a1: "another-article" }));

      expect(prioritize).toBeUndefined();
      expect(instructions).not.toContain("# SCREEN_CONTEXT");
    });

    it("발행이 취소돼 목록에서 사라진 글도 함께 버린다", async () => {
      const { prioritize, instructions } = await runWith(snapshotWith({}));

      expect(prioritize).toBeUndefined();
      expect(instructions).not.toContain("# SCREEN_CONTEXT");
    });

    it("검증에 실패한 target 으로는 포트폴리오 조회를 시작하지 않는다", async () => {
      const { contextCalls } = await runWith(snapshotWith({ a1: "another-article" }));

      expect(contextCalls).toBe(0);
    });

    it("열린 글로 섹션을 고를 때도 profile 을 함께 넣는다", async () => {
      const { sections } = await runWith(snapshotWith({ a1: "serverless-portfolio" }), {
        message: "작성자는?",
      });

      expect(sections).toEqual(["profile", "development"]);
    });

    it("질문이 스스로 섹션을 고르면 우선 대상에 점수 면제를 주지 않는다", async () => {
      const { sections, prioritize } = await runWith(snapshotWith({ a1: "serverless-portfolio" }), {
        message: "무슨 프로젝트 했어?",
      });

      expect(sections).toEqual(["profile", "development"]);
      expect(prioritize).toEqual({
        sourceType: "article",
        sourceId: "a1",
        ignoreScoreFloor: false,
      });
    });

    it("live 에서는 글 한 건만 읽어 검증하고 목록 전체를 다시 읽지 않는다", async () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
      const loadFreshData = vi.fn();
      const loadArticle = vi.fn(async () => LIVE_ARTICLE);
      const buildContext = vi.fn<(...args: unknown[]) => Promise<string>>(async () => "context");
      const provider = vi.fn<
        (...args: Array<{ instructions: string }>) => Promise<{
          content: string;
          contactDraft: null;
        }>
      >(async () => ({ content: "요약입니다.", contactDraft: null }));

      await handleChatRequest(
        createRequest({
          lang: "ko",
          messages: [{ role: "user", content: "이 글 요약해 줘" }],
          context: ARTICLE_CONTEXT,
        }),
        {
          provider,
          loadSnapshot: async () => snapshotWith({}),
          buildContext,
          loadArticle,
          loadFreshData,
        },
      );

      // 요청이 끊기거나 제한 시간을 넘기면 진행 중인 Firestore 조회도 함께 끝나야 한다.
      expect(loadArticle).toHaveBeenCalledWith("a1", expect.any(AbortSignal));
      expect(loadFreshData).not.toHaveBeenCalled();
      expect(provider.mock.calls[0]?.[0]?.instructions).toContain("서버 없이 운영한다");
      vi.unstubAllEnvs();
    });

    it("본문 전문이 문맥에 실리면 우선 검색 대신 같은 글을 후보에서 뺀다", async () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
      const buildContext = vi.fn<(...args: unknown[]) => Promise<string>>(async () => "context");
      const provider = vi.fn(async () => ({ content: "요약입니다.", contactDraft: null }));

      await handleChatRequest(
        createRequest({
          lang: "ko",
          messages: [{ role: "user", content: "이 글 요약해 줘" }],
          context: ARTICLE_CONTEXT,
        }),
        {
          provider,
          loadSnapshot: async () => snapshotWith({}),
          buildContext,
          loadArticle: async () => LIVE_ARTICLE,
        },
      );

      expect(buildContext.mock.calls[0]?.[4]).toBeUndefined();
      expect(buildContext.mock.calls[0]?.[5]).toEqual({ sourceType: "article", sourceId: "a1" });
      vi.unstubAllEnvs();
    });

    it("본문이 상한에서 잘리면 꼬리 보완을 위해 우선 검색을 유지한다", async () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
      const buildContext = vi.fn<(...args: unknown[]) => Promise<string>>(async () => "context");
      const provider = vi.fn(async () => ({ content: "요약입니다.", contactDraft: null }));

      await handleChatRequest(
        createRequest({
          lang: "ko",
          messages: [{ role: "user", content: "이 글 요약해 줘" }],
          context: ARTICLE_CONTEXT,
        }),
        {
          provider,
          loadSnapshot: async () => snapshotWith({}),
          buildContext,
          loadArticle: async () => ({ ...LIVE_ARTICLE, body: "가나다 ".repeat(15000) }),
        },
      );

      expect(buildContext.mock.calls[0]?.[4]).toEqual({
        sourceType: "article",
        sourceId: "a1",
        ignoreScoreFloor: true,
      });
      expect(buildContext.mock.calls[0]?.[5]).toBeUndefined();
      vi.unstubAllEnvs();
    });

    it("live 조회가 막히면 문맥 없이 답한다", async () => {
      vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
      const { prioritize, instructions } = await runWith(snapshotWith({}), {
        loadArticle: async () => {
          throw new Error("Firestore 블로그 글 읽기 실패 (403)");
        },
      });

      expect(prioritize).toBeUndefined();
      expect(instructions).not.toContain("# SCREEN_CONTEXT");
      vi.unstubAllEnvs();
    });
  });
});
