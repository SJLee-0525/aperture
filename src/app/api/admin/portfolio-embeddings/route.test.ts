import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyAdminIdToken: vi.fn(),
  getRagSourceData: vi.fn(),
  getRagSourceDataForTarget: vi.fn(),
  buildRagChunks: vi.fn(),
  generateEmbeddings: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/auth/verify-admin-id-token", () => ({
  verifyAdminIdToken: mocks.verifyAdminIdToken,
}));
vi.mock("@/lib/content/rag-source", () => ({
  getRagSourceData: mocks.getRagSourceData,
  getRagSourceDataForTarget: mocks.getRagSourceDataForTarget,
}));
vi.mock("@/lib/ai/rag-chunks", () => ({ buildRagChunks: mocks.buildRagChunks }));
vi.mock("@/lib/ai/embedding", () => ({
  embeddingModelKey: () => "text-embedding-3-small@512",
  generateEmbeddings: mocks.generateEmbeddings,
}));

import { GET, POST } from "@/app/api/admin/portfolio-embeddings/route";
import { MOCK_DEV_ARTICLE_TAGS } from "@/mocks/dev-article-tags";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

const request = () =>
  new Request("http://localhost/api/admin/portfolio-embeddings", {
    method: "POST",
    headers: { Authorization: "Bearer admin-token" },
  });

const targetRequest = (target: { sourceType: string; sourceId: string }) =>
  new Request("http://localhost/api/admin/portfolio-embeddings", {
    method: "POST",
    headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });

/** 청크 조립은 mock 이 대신하지만 route 가 블로그 글을 직접 훑으므로 두 배열은 실제로 필요하다. */
const EMPTY_SOURCE = { source: true, devArticles: [], devArticleTags: [] };

/** DB vector(512) 계약을 만족하는 벡터. */
const vector512 = (fill = 0.1) => Array.from({ length: 512 }, () => fill);

const chunkOf = (id: string, overrides: Partial<Record<string, string>> = {}) => ({
  id,
  section: overrides.section ?? "photography",
  sourceType: overrides.sourceType ?? "photo",
  sourceId: overrides.sourceId ?? id,
  chunkKey: overrides.chunkKey ?? "photo",
  text: overrides.text ?? `본문 ${id}`,
});

const jsonResponse = (rows: unknown[]) => ({
  ok: true,
  status: 200,
  json: async () => rows,
  text: async () => JSON.stringify(rows),
});
const okResponse = () => ({ ok: true, status: 201, json: async () => [], text: async () => "" });

type FetchCall = { url: string; init: RequestInit & { headers: Record<string, string> } };
const calls = (fetchMock: ReturnType<typeof vi.fn>): FetchCall[] =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    init: init as FetchCall["init"],
  }));

/**
 * 쓰기 요청만 남긴다.
 * 기존 청크 조회는 더 읽을 행이 없다는 확인 요청까지 포함해 여러 번 나가므로,
 * 위치로 upsert·삭제를 집으면 조회 횟수에 흔들린다.
 */
const writeCalls = (fetchMock: ReturnType<typeof vi.fn>): FetchCall[] =>
  calls(fetchMock).filter(({ init }) => init.method && init.method !== "GET");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/admin/portfolio-embeddings", () => {
  it("관리자가 아니면 임베딩을 생성하지 않는다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.generateEmbeddings).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("전체 모드는 upsert 를 먼저 하고 다음 색인에 없는 문서만 지운다", async () => {
    const chunks = [
      chunkOf("profile-site-intro", {
        section: "profile",
        sourceType: "profile",
        sourceId: "site",
      }),
      chunkOf("development-project-overview", {
        section: "development",
        sourceType: "project",
        sourceId: "project-1",
      }),
    ];
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue(chunks);
    mocks.generateEmbeddings.mockResolvedValue([vector512(0.1), vector512(0.2)]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          { id: "stale", embedding_model: "old" },
          { id: "profile-site-intro", embedding_model: "text-embedding-3-small@512" },
        ]),
      )
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      count: 2,
      dimensions: 512,
      model: "text-embedding-3-small@512",
      mode: "full",
      sections: { profile: 1, development: 1, music: 0, photography: 0 },
    });
    // 첫 GET 뒤에는 더 읽을 행이 없다는 확인 요청이 한 번 더 나간다.
    const [meta] = calls(fetchMock);
    const [upsert, remove] = writeCalls(fetchMock);
    expect(meta.url).toContain("select=id%2Cembedding_model");
    expect(meta.url).toContain("order=id.asc");
    // upsert 실패 시 유효 청크가 남아 있도록 삭제는 upsert 뒤에 온다.
    expect(upsert.init.method).toBe("POST");
    expect(upsert.init.headers.Prefer).toBe("resolution=merge-duplicates");
    const rows = JSON.parse(upsert.init.body as string) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "profile-site-intro",
      chunk_key: "photo",
      published: true,
      embedding_model: "text-embedding-3-small@512",
    });
    expect((rows[0]?.embedding as number[]).length).toBe(512);
    expect(remove.init.method).toBe("DELETE");
    expect(decodeURIComponent(remove.url)).toContain('id=in.("stale")');
    expect(decodeURIComponent(remove.url)).not.toContain("profile-site-intro");
    expect(mocks.revalidateTag).toHaveBeenCalled();
  });

  it("지정한 콘텐츠는 같은 범위의 이전 청크만 조회해 교체한다", async () => {
    const targetChunk = chunkOf("photography-photo-photo-1-photo", { sourceId: "photo-1" });
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceDataForTarget.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([
      targetChunk,
      chunkOf("other", { sourceId: "photo-2", text: "다른 사진" }),
    ]);
    mocks.generateEmbeddings.mockResolvedValue([vector512()]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ id: "old-photo-1" }]))
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(targetRequest({ sourceType: "photo", sourceId: "photo-1" }));
    const result = await response.json();

    expect(result).toMatchObject({ count: 1, mode: "incremental" });
    expect(mocks.generateEmbeddings).toHaveBeenCalledWith(
      ["본문 photography-photo-photo-1-photo"],
      expect.anything(),
    );
    const [scope] = calls(fetchMock);
    const [upsert, remove] = writeCalls(fetchMock);
    expect(decodeURIComponent(scope.url)).toContain('source_type=in.("photo")');
    expect(decodeURIComponent(scope.url)).toContain("source_id=eq.photo-1");
    const rows = JSON.parse(upsert.init.body as string) as Array<{ id: string }>;
    expect(rows.map(({ id }) => id)).toEqual(["photography-photo-photo-1-photo"]);
    expect(decodeURIComponent(remove.url)).toContain('id=in.("old-photo-1")');
  });

  it("photoTags 는 요청 sourceId 와 무관하게 사진 청크 전체가 범위다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceDataForTarget.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([
      chunkOf("photo-a", { sourceId: "photo-a" }),
      chunkOf("album-1", { sourceType: "album" }),
    ]);
    mocks.generateEmbeddings.mockResolvedValue([vector512()]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ id: "photo-a" }, { id: "photo-gone" }]))
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await POST(targetRequest({ sourceType: "photoTags", sourceId: "config" }));

    const [scope] = calls(fetchMock);
    const [upsert, remove] = writeCalls(fetchMock);
    expect(decodeURIComponent(scope.url)).toContain('source_type=in.("photo")');
    // 요청의 sourceId(config)는 저장 청크 범위와 무관하다 — 필터에 쓰면 사진 전체가 stale 로 남는다.
    expect(scope.url).not.toContain("source_id");
    const rows = JSON.parse(upsert.init.body as string) as Array<{ id: string }>;
    expect(rows.map(({ id }) => id)).toEqual(["photo-a"]);
    expect(decodeURIComponent(remove.url)).toContain('id=in.("photo-gone")');
  });

  it("지원하지 않는 소스 타입은 거부한다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);

    const response = await POST(targetRequest({ sourceType: "unknown", sourceId: "x" }));

    expect(response.status).toBe(400);
    expect(mocks.generateEmbeddings).not.toHaveBeenCalled();
  });

  it("블로그 글 청크를 전체 생성 대상에 함께 넣는다", async () => {
    const article = MOCK_DEV_ARTICLES.find(({ published }) => published)!;
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue({
      devArticles: [article],
      devArticleTags: MOCK_DEV_ARTICLE_TAGS,
    });
    mocks.buildRagChunks.mockReturnValue([]);
    mocks.generateEmbeddings.mockImplementation(async (texts: string[]) =>
      texts.map(() => vector512()),
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = (await (await POST(request())).json()) as { count: number };

    expect(result.count).toBeGreaterThan(0);
    const [texts] = mocks.generateEmbeddings.mock.calls[0] as [string[]];
    expect(texts.some((text) => text.includes(`/dev/articles/${article.slug}`))).toBe(true);
  });

  it("블로그 글 타깃은 같은 글의 이전 청크만 지운다", async () => {
    const article = MOCK_DEV_ARTICLES.find(({ published }) => published)!;
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceDataForTarget.mockResolvedValue({
      devArticles: [article],
      devArticleTags: MOCK_DEV_ARTICLE_TAGS,
    });
    mocks.buildRagChunks.mockReturnValue([]);
    mocks.generateEmbeddings.mockImplementation(async (texts: string[]) =>
      texts.map(() => vector512()),
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ id: "stale-article" }]))
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await POST(targetRequest({ sourceType: "article", sourceId: article.id }));

    const [scope] = calls(fetchMock);
    const [, remove] = writeCalls(fetchMock);
    expect(decodeURIComponent(scope.url)).toContain('source_type=in.("article")');
    expect(decodeURIComponent(scope.url)).toContain(`source_id=eq.${article.id}`);
    expect(decodeURIComponent(remove.url)).toContain('id=in.("stale-article")');
  });

  it("벡터 검증(개수·차원·유한값)에 걸리면 아무것도 쓰지 않고 502 로 끝낸다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([chunkOf("photo-a")]);
    mocks.generateEmbeddings.mockResolvedValue([[0.1, 0.2]]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());

    expect(response.status).toBe(502);
    // 부분 갱신 차단 — 검증이 쓰기 시작 전에 실패하므로 조회조차 하지 않는다.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("업스트림 오류 원문은 응답에 싣지 않고 상태 코드는 502 를 유지한다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([chunkOf("photo-a")]);
    mocks.generateEmbeddings.mockResolvedValue([vector512()]);
    const upstreamBody =
      '{"message":"column rag_documents.secret does not exist","hint":"internal"}';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => upstreamBody,
      });
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(request());
    const result = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(result.error).toBe("임베딩 저장 실패 (500)");
    expect(result.error).not.toContain("secret");
    expect(errorSpy.mock.calls.some(([line]) => String(line).includes("secret"))).toBe(true);
    errorSpy.mockRestore();
  });

  it("대량 upsert 는 100행씩, stale 삭제는 50개씩 나눠 보낸다", async () => {
    const chunks = Array.from({ length: 201 }, (_, index) => chunkOf(`photo-${index}`));
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue(chunks);
    mocks.generateEmbeddings.mockResolvedValue(chunks.map(() => vector512()));
    const staleRows = Array.from({ length: 51 }, (_, index) => ({ id: `gone-${index}` }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(staleRows.map((row) => ({ ...row, embedding_model: "m" }))),
      )
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());

    expect(response.status).toBe(200);
    const all = calls(fetchMock);
    const upserts = all.filter(({ init }) => init.method === "POST");
    const removes = all.filter(({ init }) => init.method === "DELETE");
    expect(
      upserts.map(({ init }) => (JSON.parse(init.body as string) as unknown[]).length),
    ).toEqual([100, 100, 1]);
    expect(removes).toHaveLength(2);
    expect(decodeURIComponent(removes[1].url)).toContain('"gone-50"');
  });

  it("PostgREST 예약문자가 든 stale id 를 이중따옴표로 감싼다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([chunkOf("photo-a")]);
    mocks.generateEmbeddings.mockResolvedValue([vector512()]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ id: 'weird,(id)"x' }]))
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await POST(request());

    const remove = calls(fetchMock).find(({ init }) => init.method === "DELETE");
    expect(decodeURIComponent(remove!.url)).toContain('id=in.("weird,(id)\\"x")');
  });
});

describe("GET /api/admin/portfolio-embeddings", () => {
  it("상태 조회의 전체 개수에도 블로그 글 청크가 들어간다", async () => {
    const article = MOCK_DEV_ARTICLES.find(({ published }) => published)!;
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue({
      devArticles: [article],
      devArticleTags: MOCK_DEV_ARTICLE_TAGS,
    });
    mocks.buildRagChunks.mockReturnValue([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    const status = (await (await GET(request())).json()) as { total: number };

    // 조립을 POST 한쪽에만 넣으면 생성은 되는데 진행률이 계속 100%에 닿지 않는다.
    expect(status.total).toBeGreaterThan(0);
  });

  it("OpenAI 호출 없이 현재 임베딩 완료 비율을 계산한다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([
      chunkOf("ready", { section: "profile", sourceType: "profile", sourceId: "site" }),
      chunkOf("missing", { section: "music", sourceType: "musicWork", sourceId: "work" }),
    ]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse([
            { id: "ready", embedding_model: "text-embedding-3-small@512" },
            { id: "gone", embedding_model: "text-embedding-3-small@512" },
            { id: "outdated-doc", embedding_model: "text-embedding-3-small" },
          ]),
        )
        // 조회는 빈 페이지를 받아야 끝난다.
        .mockResolvedValue(jsonResponse([])),
    );
    mocks.buildRagChunks.mockReturnValue([
      chunkOf("ready"),
      chunkOf("missing"),
      chunkOf("outdated-doc"),
    ]);

    const response = await GET(request());

    await expect(response.json()).resolves.toMatchObject({
      completed: 1,
      outdated: 1,
      pending: 2,
      percent: 33,
      stale: 1,
      total: 3,
    });
    expect(mocks.generateEmbeddings).not.toHaveBeenCalled();
  });

  it("1,000행 페이지는 다음 Range 를 이어 읽고 416 은 종료로 처리한다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([chunkOf("photo-0")]);
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `photo-${index}`,
      embedding_model: "text-embedding-3-small@512",
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(fullPage))
      .mockResolvedValueOnce({
        ok: false,
        status: 416,
        json: async () => [],
        text: async () => "",
      });
    vi.stubGlobal("fetch", fetchMock);

    const status = (await (await GET(request())).json()) as { stale: number };

    expect(status.stale).toBe(999);
    const [first, second] = calls(fetchMock);
    expect(first.init.headers.Range).toBe("0-999");
    expect(second.init.headers.Range).toBe("1000-1999");
    expect(first.url).toContain("order=id.asc");
  });
});
