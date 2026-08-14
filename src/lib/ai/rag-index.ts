import { unstable_cache } from "next/cache";

import { CHAT_PROFILE_CACHE_TAG, PUBLIC_CACHE_REVALIDATE_SECONDS } from "@/constants/cache";
import { fetchRagChunks } from "@/lib/firebase/public/rag";

import type { StoredRagChunk, StoredRagChunkMeta } from "@/types/rag";

/**
 * RAG 인덱스 스냅샷 — raw 벡터 응답(질문당 전 청크 Firestore 읽기 + 수 MB 전송)을 매번 받는 대신
 * int8 양자화 + base64 로 압축해 Next Data Cache(항목 2MB 제한)에 담는다.
 * 임베딩 동기화 라우트가 CHAT_PROFILE_CACHE_TAG 를 무효화하므로 콘텐츠 변경은 다음 질문에 반영되고,
 * 방문자 질문의 Firestore 읽기·egress 는 캐시 fill 시점에만 발생한다.
 */

/** Data Cache 항목 2MB 제한의 경고 문턱 — 초과 시 Next 가 캐시를 건너뛰어 매 요청 재조회로 강등된다. */
const PACKED_SIZE_WARN_BYTES = 1_500_000;

type PackedRagIndex = {
  chunks: StoredRagChunkMeta[];
  /** 모든 벡터를 청크 순서대로 이어붙인 int8 배열의 base64. */
  vectors: string;
  /** 벡터별 역양자화 계수 (maxAbs / 127). */
  scales: number[];
  dims: number;
};

type RagIndexEntry = { chunk: StoredRagChunkMeta; vector: Float32Array };

const packRagIndex = (chunks: StoredRagChunk[]): PackedRagIndex => {
  const dims = chunks.find(({ embedding }) => embedding.length > 0)?.embedding.length ?? 0;
  const usable = chunks.filter(({ embedding }) => dims > 0 && embedding.length === dims);
  const bytes = new Int8Array(usable.length * dims);
  const scales = usable.map(({ embedding }, index) => {
    let maxAbs = 0;
    for (const value of embedding) maxAbs = Math.max(maxAbs, Math.abs(value));
    const scale = maxAbs / 127 || 1;
    embedding.forEach((value, offset) => {
      bytes[index * dims + offset] = Math.round(value / scale);
    });
    return scale;
  });
  return {
    chunks: usable.map((chunk) => ({
      id: chunk.id,
      section: chunk.section,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      chunkKey: chunk.chunkKey,
      text: chunk.text,
      embeddingModel: chunk.embeddingModel,
      published: chunk.published,
    })),
    vectors: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64"),
    scales,
    dims,
  };
};

const unpackRagIndex = (packed: PackedRagIndex): RagIndexEntry[] => {
  const buffer = Buffer.from(packed.vectors, "base64");
  const bytes = new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return packed.chunks.map((chunk, index) => {
    const vector = new Float32Array(packed.dims);
    const scale = packed.scales[index] ?? 1;
    for (let offset = 0; offset < packed.dims; offset += 1) {
      vector[offset] = (bytes[index * packed.dims + offset] ?? 0) * scale;
    }
    return { chunk, vector };
  });
};

const loadPackedRagIndex = unstable_cache(
  async () => {
    const packed = packRagIndex(await fetchRagChunks());
    // 한도는 UTF-8 바이트 기준이다. 문자열 길이로 재면 한글 본문을 글자당 1로 세어 과소 측정한다.
    const serializedBytes = Buffer.byteLength(JSON.stringify(packed), "utf8");
    // 캐시를 채울 때만 남는다. 남은 여유를 확인할 다른 통로가 없다.
    console.info(`[rag-index] chunks=${packed.chunks.length} bytes=${serializedBytes}`);
    if (serializedBytes > PACKED_SIZE_WARN_BYTES) {
      console.warn(
        `RAG 스냅샷이 Data Cache 항목 한도에 근접했습니다 (${serializedBytes} bytes) — Firestore findNearest 이전을 검토하세요.`,
      );
    }
    return packed;
  },
  ["rag-index-v1"],
  { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS, tags: [CHAT_PROFILE_CACHE_TAG] },
);

const getRagIndex = async (): Promise<RagIndexEntry[]> =>
  unpackRagIndex(await loadPackedRagIndex());

export { getRagIndex, packRagIndex, unpackRagIndex };
