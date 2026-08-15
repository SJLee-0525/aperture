import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  listRagDocumentMeta,
  matchRagChunks,
  replaceRagDocuments,
  replacementScopeFor,
} from "@/lib/supabase/rag";

import type { RagChunk } from "@/types/rag";

const chunk = (id: string): RagChunk => ({
  id,
  section: "photography",
  sourceType: "photo",
  sourceId: id,
  chunkKey: "photo",
  text: `본문 ${id}`,
});

const vector512 = (fill = 0.1) => Array.from({ length: 512 }, () => fill);

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

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("replacementScopeFor", () => {
  it("일반 콘텐츠는 (sourceType, sourceId) 쌍이 범위다", () => {
    expect(replacementScopeFor({ sourceType: "photo", sourceId: "p1" })).toEqual({
      sourceTypes: ["photo"],
      sourceId: "p1",
    });
  });

  it("siteConfig 는 profile 청크(site)로 저장된다", () => {
    expect(replacementScopeFor({ sourceType: "siteConfig", sourceId: "config" })).toEqual({
      sourceTypes: ["profile"],
      sourceId: "site",
    });
  });

  it("devConfig 는 하위 4타입 + development 섹션까지 좁힌다", () => {
    expect(replacementScopeFor({ sourceType: "devConfig", sourceId: "dev" })).toEqual({
      sourceTypes: ["devConfig", "devCareer", "devEducation", "devAward"],
      sourceId: "dev",
      section: "development",
    });
  });

  it("musicConfig 는 하위 3타입이 범위다", () => {
    expect(replacementScopeFor({ sourceType: "musicConfig", sourceId: "music" })).toEqual({
      sourceTypes: ["musicConfig", "musicCareer", "musicEducation"],
      sourceId: "music",
    });
  });

  it("photoTags 는 사진 전체 — 요청 sourceId 를 필터에 쓰지 않는다", () => {
    expect(replacementScopeFor({ sourceType: "photoTags", sourceId: "config" })).toEqual({
      sourceTypes: ["photo"],
    });
  });
});

describe("matchRagChunks", () => {
  it("anon 헤더(apikey만)로 RPC 를 호출하고 벡터를 number[] 로 직렬화한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          id: "c1",
          section: "photography",
          source_type: "photo",
          source_id: "p1",
          chunk_key: "photo",
          text: "사진",
          embedding_model: "m@512",
          vector_score: 0.8,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await matchRagChunks({
      queryVector: [0.1, 0.2],
      sections: ["photography"],
      modelKey: "m@512",
    });

    const [{ url, init }] = calls(fetchMock);
    expect(url).toBe("https://test.supabase.co/rest/v1/rpc/match_rag_chunks");
    expect(init.headers.apikey).toBe("sb_publishable_test");
    expect(init.headers.Authorization).toBeUndefined();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    // Float32Array 를 넘기면 {"0":…} 객체가 되어 RPC 인자 파싱에 실패한다.
    expect(body.query_embedding).toEqual([0.1, 0.2]);
    expect(body.prioritize_source_type).toBeNull();
    expect(body.prioritize_source_id).toBeNull();
    expect(result).toEqual([
      {
        id: "c1",
        section: "photography",
        sourceType: "photo",
        sourceId: "p1",
        chunkKey: "photo",
        text: "사진",
        embeddingModel: "m@512",
        published: true,
        vectorScore: 0.8,
      },
    ]);
  });

  it("우선 대상 쌍을 RPC 인자로 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await matchRagChunks({
      queryVector: [0.1],
      sections: ["development"],
      modelKey: "m@512",
      prioritize: { sourceType: "article", sourceId: "a1" },
    });

    const body = JSON.parse(calls(fetchMock)[0].init.body as string) as Record<string, unknown>;
    expect(body.prioritize_source_type).toBe("article");
    expect(body.prioritize_source_id).toBe("a1");
  });
});

describe("listRagDocumentMeta", () => {
  it("Range 페이지네이션으로 전량을 읽고 416 을 종료로 처리한다", async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `doc-${index}`,
      embedding_model: "m@512",
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

    const rows = await listRagDocumentMeta("token");

    expect(rows).toHaveLength(1000);
    expect(rows[0]).toEqual({ id: "doc-0", embeddingModel: "m@512" });
    const [first, second] = calls(fetchMock);
    expect(first.url).toContain("order=id.asc");
    expect(first.init.headers.Range).toBe("0-999");
    expect(second.init.headers.Range).toBe("1000-1999");
    expect(first.init.headers.Authorization).toBe("Bearer token");
  });

  it("조회 오류는 빈 결과로 위장하지 않고 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => [],
        text: async () => "boom",
      }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(listRagDocumentMeta("token")).rejects.toThrow("기존 임베딩 조회 실패 (500)");
    errorSpy.mockRestore();
  });
});

describe("replaceRagDocuments", () => {
  it("벡터 수가 청크 수와 다르면 조회조차 하지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      replaceRagDocuments("token", [chunk("a"), chunk("b")], [vector512()], "m@512"),
    ).rejects.toThrow("임베딩 수가 청크 수와 다릅니다");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("차원이 저장소 계약(512)과 다르거나 유한하지 않으면 거부한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(replaceRagDocuments("token", [chunk("a")], [[0.1, 0.2]], "m@512")).rejects.toThrow(
      "임베딩 차원이 저장소 계약(512)과 다릅니다",
    );
    await expect(
      replaceRagDocuments("token", [chunk("a")], [[...vector512().slice(1), Number.NaN]], "m@512"),
    ).rejects.toThrow("유한하지 않은 값");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("upsert 를 마친 뒤에만 stale 을 지운다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ id: "gone", embedding_model: "m@512" }]))
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await replaceRagDocuments("token", [chunk("a")], [vector512()], "m@512");

    const methods = calls(fetchMock).map(({ init }) => init.method ?? "GET");
    expect(methods).toEqual(["GET", "POST", "DELETE"]);
  });

  it("stale 과 새 청크의 합이 상한을 넘으면 갱신을 거부한다", async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `old-${index}`,
      embedding_model: "m@512",
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(fullPage))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      replaceRagDocuments("token", [chunk("a")], [vector512()], "m@512"),
    ).rejects.toThrow("1000개를 초과");
    expect(calls(fetchMock).every(({ init }) => init.method === undefined)).toBe(true);
  });
});
