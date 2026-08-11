import { describe, expect, it, vi } from "vitest";

import { ChatProviderUnavailableError } from "@/features/chat/_lib/chat-provider";
import { ChatRateLimitConfigurationError } from "@/features/chat/_lib/chat-rate-limit";
import { ChatUpstreamError } from "@/features/chat/_lib/chat-upstream-error";
import { handleChatRequest, MAX_BODY_BYTES } from "@/features/chat/_lib/handle-chat-request";

import type { ChatReference } from "@/types/chat";
import type { PhotoFilterVocabulary } from "@/lib/photo-filter-query";

const createRequest = (body: unknown, headers?: HeadersInit) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const EMPTY_LOOKUP = { photo: {}, work: {}, award: {}, project: {} };
const createSnapshot = (overrides?: Partial<ReturnType<typeof baseSnapshot>>) => ({
  ...baseSnapshot(),
  ...overrides,
});
const baseSnapshot = () => ({
  context: "# PROFILE_CONTEXT\ncontext",
  references: [] as ChatReference[],
  screenLookup: EMPTY_LOOKUP,
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
});
