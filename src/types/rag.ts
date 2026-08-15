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

/** 벡터 본체를 제외한 저장 청크. 벡터는 DB 에만 있고 검색 결과는 메타만 오간다. */
type StoredRagChunkMeta = Omit<StoredRagChunk, "embedding">;

/** RAG 검색 입력 — text는 임베딩·로컬 토큰화용, keywords는 인텐트 분류기가 추출한 검색 키워드. */
type RagQuery = { text: string; keywords?: string[] };

/**
 * 방문자가 열어 둔 원본. 그 청크가 상위 자리를 먼저 채운다.
 * `ignoreScoreFloor`는 질문이 스스로 검색 대상을 고르지 못했을 때만 켠다.
 */
type RagPrioritize = { sourceType: string; sourceId: string; ignoreScoreFloor?: boolean };

/** 검색 후보에서 뺄 원본 — 본문 전문이 이미 화면 문맥에 실린 글의 중복을 막는다. */
type RagExclude = { sourceType: string; sourceId: string };

export type {
  RagChunk,
  RagExclude,
  RagPrioritize,
  RagQuery,
  RagSection,
  RagSyncSourceType,
  RagSyncTarget,
  StoredRagChunkMeta,
};
