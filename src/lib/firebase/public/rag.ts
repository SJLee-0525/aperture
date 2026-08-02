import { COLLECTIONS } from "@/constants/collections";
import { runQuery } from "@/lib/firebase/public/transport";
import type { RagSection, StoredRagChunk } from "@/types/rag";

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
