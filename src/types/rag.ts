type RagSection = "profile" | "development" | "music" | "photography";
type RagSyncSourceType =
  | "photo"
  | "album"
  | "project"
  | "musicWork"
  | "musicAward"
  | "musicMedia"
  | "siteConfig"
  | "devConfig"
  | "musicConfig"
  | "photoTags"
  | "article";

type RagSyncTarget = { sourceType: RagSyncSourceType; sourceId: string };

type RagChunk = {
  id: string;
  section: RagSection;
  sourceType: string;
  sourceId: string;
  chunkKey: string;
  text: string;
};

type StoredRagChunk = RagChunk & {
  embedding: number[];
  embeddingModel: string;
  published: boolean;
};

/** 벡터 본체를 제외한 저장 청크 — 스냅샷 인덱스가 벡터를 별도 압축 보관할 때 사용. */
type StoredRagChunkMeta = Omit<StoredRagChunk, "embedding">;

/** RAG 검색 입력 — text는 임베딩·로컬 토큰화용, keywords는 인텐트 분류기가 추출한 검색 키워드. */
type RagQuery = { text: string; keywords?: string[] };

/**
 * 방문자가 열어 둔 원본. 그 청크가 상위 자리를 먼저 채운다.
 * `ignoreScoreFloor`는 질문이 스스로 검색 대상을 고르지 못했을 때만 켠다.
 */
type RagPrioritize = { sourceType: string; sourceId: string; ignoreScoreFloor?: boolean };

export type {
  RagChunk,
  RagPrioritize,
  RagQuery,
  RagSection,
  RagSyncSourceType,
  RagSyncTarget,
  StoredRagChunk,
  StoredRagChunkMeta,
};
