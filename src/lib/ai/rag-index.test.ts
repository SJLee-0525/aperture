import { describe, expect, it } from "vitest";

import { packRagIndex, unpackRagIndex } from "@/lib/ai/rag-index";
import { cosineSimilarity } from "@/lib/ai/rag-search";
import type { StoredRagChunk } from "@/types/rag";

const chunk = (id: string, embedding: number[]): StoredRagChunk => ({
  id,
  section: "photography",
  sourceType: "photo",
  sourceId: id,
  chunkKey: "photo",
  text: `사진 ${id}`,
  embedding,
  embeddingModel: "text-embedding-3-small@512",
  published: true,
});

/**
 * 결정적 의사 난수 벡터 — 실제 임베딩처럼 소수 성분이 뒤섞인 모양을 흉내낸다.
 *
 * @param {number} seed
 * @param {number} dims
 * @returns {number[]}
 */
const pseudoVector = (seed: number, dims: number): number[] =>
  Array.from({ length: dims }, (_, index) => Math.sin(seed * 997 + index * 13.7) * 0.05);

describe("packRagIndex / unpackRagIndex", () => {
  it("메타데이터를 보존하고 벡터를 int8 양자화 라운드트립한다", () => {
    const chunks = [chunk("a", pseudoVector(1, 64)), chunk("b", pseudoVector(2, 64))];

    const unpacked = unpackRagIndex(packRagIndex(chunks));

    expect(unpacked).toHaveLength(2);
    expect(unpacked[0]?.chunk).toEqual({
      id: "a",
      section: "photography",
      sourceType: "photo",
      sourceId: "a",
      chunkKey: "photo",
      text: "사진 a",
      embeddingModel: "text-embedding-3-small@512",
      published: true,
    });
    unpacked.forEach(({ vector }, index) => {
      expect(cosineSimilarity(vector, chunks[index]!.embedding)).toBeGreaterThan(0.999);
    });
  });

  it("양자화 후에도 질문 벡터에 대한 유사도 순위가 유지된다", () => {
    const query = pseudoVector(9, 64);
    const chunks = [
      chunk("far", pseudoVector(3, 64)),
      chunk(
        "near",
        query.map((value) => value * 0.9),
      ),
      chunk(
        "mid",
        query.map((value, index) => value + pseudoVector(4, 64)[index]! * 2),
      ),
    ];

    const ranked = unpackRagIndex(packRagIndex(chunks))
      .map(({ chunk: meta, vector }) => ({ id: meta.id, score: cosineSimilarity(query, vector) }))
      .toSorted((a, b) => b.score - a.score)
      .map(({ id }) => id);

    const exact = chunks
      .map(({ id, embedding }) => ({ id, score: cosineSimilarity(query, embedding) }))
      .toSorted((a, b) => b.score - a.score)
      .map(({ id }) => id);

    expect(ranked).toEqual(exact);
    expect(ranked[0]).toBe("near");
  });

  it("차원이 어긋나거나 비어 있는 벡터는 스냅샷에서 제외한다", () => {
    const chunks = [
      chunk("ok", pseudoVector(5, 64)),
      chunk("broken", [0.1, 0.2]),
      chunk("empty", []),
    ];

    const unpacked = unpackRagIndex(packRagIndex(chunks));

    expect(unpacked.map(({ chunk: meta }) => meta.id)).toEqual(["ok"]);
  });
});
