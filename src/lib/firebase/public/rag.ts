import { COLLECTIONS } from "@/constants/collections";
import { runQuery } from "@/lib/firebase/public/transport";

import type { RagSection, StoredRagChunk } from "@/types/rag";

/**
 * 공개된 RAG 청크를 캐시 없이 읽고 필수 필드가 유효한 문서만 반환한다.
 *
 * @returns {Promise<StoredRagChunk[]>} 검색에 사용할 수 있는 RAG 청크 목록.
 */
const fetchRagChunks = async (): Promise<StoredRagChunk[]> =>
  (
    await runQuery(
      {
        from: [{ collectionId: COLLECTIONS.RAG_DOCUMENTS }],
        where: {
          fieldFilter: {
            field: { fieldPath: "published" },
            op: "EQUAL",
            value: { booleanValue: true },
          },
        },
        select: {
          fields: [
            "section",
            "sourceType",
            "sourceId",
            "chunkKey",
            "text",
            "embedding",
            "embeddingModel",
            "published",
          ].map((fieldPath) => ({ fieldPath })),
        },
      },
      { fresh: true },
    )
  ).flatMap(({ id, data }) => {
    if (
      typeof data.section !== "string" ||
      typeof data.sourceType !== "string" ||
      typeof data.sourceId !== "string" ||
      typeof data.chunkKey !== "string" ||
      typeof data.text !== "string" ||
      typeof data.embeddingModel !== "string" ||
      !Array.isArray(data.embedding)
    ) {
      return [];
    }
    return [
      {
        id,
        section: data.section as RagSection,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        chunkKey: data.chunkKey,
        text: data.text,
        embedding: data.embedding as number[],
        embeddingModel: data.embeddingModel,
        published: data.published === true,
      },
    ];
  });

export { fetchRagChunks };
