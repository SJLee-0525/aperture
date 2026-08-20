import "server-only";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { paginateAll } from "@/lib/supabase/paginate-all";
import { fetchWithRetry } from "@/lib/supabase/public/retry-fetch";

import type { RagChunk, RagSection, RagSyncTarget, StoredRagChunkMeta } from "@/types/rag";

/**
 * RAG 임베딩 저장·검색 transport. Route Handler 와 챗 검색만 사용하는 서버 전용
 * 모듈이다 (`server-only` 가 클라이언트 번들 유입을 빌드에서 차단한다).
 * 논리 컬렉션명은 `COLLECTIONS.RAG_DOCUMENTS`(ragDocuments), 물리 테이블은 아래 상수다.
 */
const TABLE = "rag_documents";

/**
 * DB `vector(512)` 컬럼의 차원 계약. 임베딩 요청 차원(env)과 별개의 저장소 제약이라
 * 이름을 나눈다 — env 를 바꿔도 이 값과 어긋나면 저장 전에 거부해야 한다.
 */
const RAG_STORAGE_DIMENSIONS = 512;

/** upsert 한 요청의 행 수. 벡터 512차원 × 100행이면 본문이 수백 KB 수준에 머문다. */
const UPSERT_CHUNK_SIZE = 100;

/** `id=in.(...)` 삭제 한 요청의 ID 수. URL 길이 제한을 피한다. */
const DELETE_CHUNK_SIZE = 50;

/** 전체 색인 상한 — 초과는 콘텐츠 규모 가정이 깨진 것이므로 갱신을 거부한다. */
const MAX_DOCUMENTS = 1_000;

type ExistingDocument = { id: string; embeddingModel: string };

type MatchedRagChunk = StoredRagChunkMeta & { vectorScore: number };

type ReplacementScope = { sourceTypes: string[]; sourceId?: string; section?: RagSection };

const restUrl = (params: URLSearchParams) => `${supabaseUrl()}/rest/v1/${TABLE}?${params}`;

/** publishable key 는 apikey 헤더로만 보낸다. Authorization 은 사용자 토큰 전용이다. */
const baseHeaders = (): Record<string, string> => ({ apikey: supabasePublishableKey() });

const adminHeaders = (accessToken: string): Record<string, string> => ({
  ...baseHeaders(),
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

/**
 * 업스트림 원문은 서버 로그에만 남긴다 — 응답에 실으면 컬럼·정책명 같은 내부
 * 정보가 관리자 화면 밖까지 나간다.
 */
const logUpstreamError = async (label: string, response: Response) => {
  const body = await response.text().catch(() => "");
  console.error(`[rag] ${label} ${response.status}: ${body.slice(0, 500)}`);
};

/**
 * 갱신 대상이 지우고 다시 써야 하는 저장 청크 범위.
 * 기존 문서 조회와 stale 판정이 이 함수 하나를 공유한다 — 범위를 두 곳에서 따로
 * 계산하면 한쪽이 어긋나 유효 청크를 지우거나 stale 청크를 남긴다.
 *
 * config 계열은 요청의 sourceType 이 저장 청크의 sourceType 과 다르다:
 * siteConfig 는 profile 청크로, devConfig·musicConfig 는 여러 하위 타입으로 저장된다.
 * photoTags 는 태그 사전 변경이 모든 사진 청크의 본문을 바꾸므로 photo 전체가 범위다
 * (요청의 sourceId 는 필터에 쓰면 안 된다).
 */
const replacementScopeFor = (target: RagSyncTarget): ReplacementScope => {
  if (target.sourceType === "siteConfig") return { sourceTypes: ["profile"], sourceId: "site" };
  if (target.sourceType === "devConfig") {
    return {
      sourceTypes: ["devConfig", "devCareer", "devEducation", "devAward"],
      sourceId: "dev",
      section: "development",
    };
  }
  if (target.sourceType === "musicConfig") {
    return {
      sourceTypes: ["musicConfig", "musicCareer", "musicEducation"],
      sourceId: "music",
    };
  }
  if (target.sourceType === "photoTags") return { sourceTypes: ["photo"] };
  return { sourceTypes: [target.sourceType], sourceId: target.sourceId };
};

/** PostgREST `in.(...)` 값 인용 — 예약문자(쉼표·괄호)가 섞여도 하나의 값으로 읽히게 한다. */
const quoteInListValue = (value: string) => `"${value.replaceAll('"', '\\"')}"`;

/**
 * id 프로젝션 행을 Range 헤더로 전량 읽는다.
 *
 * 안정 정렬(order=id.asc)이 없으면 페이지 사이 순서가 보장되지 않는다.
 * 범위를 벗어난 Range 는 416 으로 응답하므로 빈 페이지로 바꿔 종료 조건에 맞춘다.
 * 종료 판정과 offset 규칙은 `paginateAll` 이 한 곳에서 관리한다.
 */
const listAllRows = <Row>(
  params: URLSearchParams,
  accessToken: string,
  label: string,
): Promise<Row[]> => {
  params.set("order", "id.asc");
  return paginateAll<Row>(async (offset, size) => {
    const response = await fetch(restUrl(params), {
      // Range 의 끝은 포함이라 요청 크기에서 하나를 뺀다.
      headers: { ...adminHeaders(accessToken), Range: `${offset}-${offset + size - 1}` },
      cache: "no-store",
    });
    if (response.status === 416) return [];
    if (!response.ok) {
      await logUpstreamError(label, response);
      throw new Error(`기존 임베딩 조회 실패 (${response.status})`);
    }
    return (await response.json()) as Row[];
  });
};

/**
 * 전체 저장 청크의 id·모델키를 읽는다. 벡터 컬럼을 projection 에서 빼는 것이
 * 핵심이다 — 포함하면 응답이 문서당 수 KB 로 커진다.
 * Firestore 시절의 full resource name 대신 행 id 를 그대로 비교 키로 쓴다.
 */
const listRagDocumentMeta = async (accessToken: string): Promise<ExistingDocument[]> => {
  const params = new URLSearchParams({ select: "id,embedding_model" });
  const rows = await listAllRows<{ id: string; embedding_model: string }>(
    params,
    accessToken,
    "meta",
  );
  return rows.map(({ id, embedding_model }) => ({ id, embeddingModel: embedding_model }));
};

/** 갱신 범위 안의 기존 문서 id 를 읽는다. */
const listScopedIds = async (accessToken: string, scope: ReplacementScope): Promise<string[]> => {
  const params = new URLSearchParams({ select: "id" });
  params.set("source_type", `in.(${scope.sourceTypes.map(quoteInListValue).join(",")})`);
  if (scope.sourceId !== undefined) params.set("source_id", `eq.${scope.sourceId}`);
  if (scope.section !== undefined) params.set("section", `eq.${scope.section}`);
  const rows = await listAllRows<{ id: string }>(params, accessToken, "scope");
  return rows.map(({ id }) => id);
};

/**
 * 저장 전 벡터 전수 검증. 배치 쓰기 도중 DB 제약(차원 불일치 등)에 걸리면 앞
 * 배치만 반영된 부분 갱신이 남으므로, 한 건이라도 어긋나면 쓰기 자체를 시작하지 않는다.
 */
const assertStorableVectors = (chunks: RagChunk[], vectors: number[][]) => {
  if (vectors.length !== chunks.length) {
    throw new Error(`임베딩 수가 청크 수와 다릅니다 (${vectors.length}/${chunks.length}).`);
  }
  for (const vector of vectors) {
    if (vector.length !== RAG_STORAGE_DIMENSIONS) {
      throw new Error(
        `임베딩 차원이 저장소 계약(${RAG_STORAGE_DIMENSIONS})과 다릅니다 (${vector.length}).`,
      );
    }
    if (!vector.every(Number.isFinite)) throw new Error("임베딩에 유한하지 않은 값이 있습니다.");
  }
};

/**
 * 대상 범위의 청크를 새 임베딩으로 교체한다.
 *
 * 순서는 upsert 후 stale 삭제다. 삭제를 먼저 하면 upsert 실패 시 유효 청크가
 * 사라진다. 반대로 upsert 성공 후 삭제가 실패하면 stale 이 남지만, 중복 후보는
 * 상태 조회(stale 수치)가 탐지하고 재실행으로 복구된다.
 *
 * @param accessToken 관리자 access token — 인가는 RLS 가 한다.
 * @param target 증분 갱신 대상. 없으면 전체 색인을 교체한다.
 */
const replaceRagDocuments = async (
  accessToken: string,
  chunks: RagChunk[],
  vectors: number[][],
  model: string,
  target?: RagSyncTarget,
): Promise<void> => {
  assertStorableVectors(chunks, vectors);
  const existingIds = target
    ? await listScopedIds(accessToken, replacementScopeFor(target))
    : (await listRagDocumentMeta(accessToken)).map(({ id }) => id);
  const nextIds = new Set(chunks.map(({ id }) => id));
  const staleIds = existingIds.filter((id) => !nextIds.has(id));
  if (staleIds.length + chunks.length > MAX_DOCUMENTS) {
    throw new Error(`RAG 문서가 ${MAX_DOCUMENTS}개를 초과해 한 번에 갱신할 수 없습니다.`);
  }
  for (let start = 0; start < chunks.length; start += UPSERT_CHUNK_SIZE) {
    const rows = chunks.slice(start, start + UPSERT_CHUNK_SIZE).map((chunk, index) => ({
      id: chunk.id,
      section: chunk.section,
      source_type: chunk.sourceType,
      source_id: chunk.sourceId,
      chunk_key: chunk.chunkKey,
      text: chunk.text,
      embedding: vectors[start + index],
      embedding_model: model,
      published: true,
    }));
    const response = await fetch(restUrl(new URLSearchParams()), {
      method: "POST",
      headers: { ...adminHeaders(accessToken), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
      cache: "no-store",
    });
    if (!response.ok) {
      await logUpstreamError("upsert", response);
      throw new Error(`임베딩 저장 실패 (${response.status})`);
    }
  }
  for (let start = 0; start < staleIds.length; start += DELETE_CHUNK_SIZE) {
    const params = new URLSearchParams();
    params.set(
      "id",
      `in.(${staleIds
        .slice(start, start + DELETE_CHUNK_SIZE)
        .map(quoteInListValue)
        .join(",")})`,
    );
    const response = await fetch(restUrl(params), {
      method: "DELETE",
      headers: adminHeaders(accessToken),
      cache: "no-store",
    });
    if (!response.ok) {
      await logUpstreamError("delete", response);
      throw new Error(`이전 임베딩 삭제 실패 (${response.status})`);
    }
  }
};

/**
 * 질문 벡터와 가까운 발행 청크 후보를 RPC 로 받는다. 무인증(anon) 호출이며
 * 모델키·섹션 필터는 RPC 가 우선 보강 후보에도 동일하게 적용한다.
 *
 * 벡터는 `number[]` 로 보내야 한다 — Float32Array 는 JSON 직렬화 시 인덱스 키
 * 객체가 되어 RPC 인자 파싱에 실패한다.
 */
const matchRagChunks = async (input: {
  queryVector: number[];
  sections: RagSection[];
  modelKey: string;
  prioritize?: { sourceType: string; sourceId: string };
  signal?: AbortSignal;
}): Promise<MatchedRagChunk[]> => {
  const response = await fetchWithRetry(`${supabaseUrl()}/rest/v1/rpc/match_rag_chunks`, {
    method: "POST",
    headers: { ...baseHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      query_embedding: input.queryVector,
      target_sections: input.sections,
      model_key: input.modelKey,
      prioritize_source_type: input.prioritize?.sourceType ?? null,
      prioritize_source_id: input.prioritize?.sourceId ?? null,
    }),
    cache: "no-store",
    ...(input.signal ? { signal: input.signal } : {}),
  });
  if (!response.ok) {
    await logUpstreamError("match", response);
    throw new Error(`RAG 검색 실패 (${response.status})`);
  }
  const rows = (await response.json()) as Array<{
    id: string;
    section: RagSection;
    source_type: string;
    source_id: string;
    chunk_key: string;
    text: string;
    embedding_model: string;
    vector_score: number;
  }>;
  return rows.map((row) => ({
    id: row.id,
    section: row.section,
    sourceType: row.source_type,
    sourceId: row.source_id,
    chunkKey: row.chunk_key,
    text: row.text,
    embeddingModel: row.embedding_model,
    published: true,
    vectorScore: row.vector_score,
  }));
};

export { listRagDocumentMeta, matchRagChunks, replaceRagDocuments, replacementScopeFor };
