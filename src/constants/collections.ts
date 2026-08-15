/** 콘텐츠 컬렉션의 논리 이름 단일 출처 — 문자열 직박 금지(hook 경고), 항상 이 상수 경유.
 *  캐시 태그와 쓰기 경로가 이 논리 이름을 공유하고, Supabase 물리 테이블은 아래 서술자가 매핑한다. */
const COLLECTIONS = {
  PHOTOS: "photos",
  ALBUMS: "albums",
  // 음악 섹션
  MUSIC_WORKS: "musicWorks",
  MUSIC_AWARDS: "musicAwards",
  MUSIC_MEDIA: "musicMedia",
  // 개발 섹션
  DEV_PROJECTS: "devProjects",
  DEV_ARTICLES: "devArticles",
  DEV_ARTICLE_TAGS: "devArticleTags",
  RAG_DOCUMENTS: "ragDocuments",
  SITE: "site",
} as const;

type CollectionId = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** site 컬렉션의 고정 문서 ID */
const SITE_DOC = "config"; // 전역 + 사진
const SITE_MUSIC_DOC = "music"; // 음악 섹션 설정
const SITE_DEV_DOC = "dev"; // 개발 섹션 설정

type SupabaseCollectionDescriptor = {
  /** Postgres 테이블명. 코드의 다른 곳은 논리 이름(COLLECTIONS)만 쓴다. */
  table: string;
  /** PostgREST select 목록. 테이블마다 스칼라 구성이 달라 공통 기본값을 두지 않는다. */
  select: string;
  /** PostgREST order 파라미터. 기존 Firestore 쿼리의 정렬 계약과 같다. */
  order: string;
  /** published 게이트 컬럼 존재 여부. site 문서·태그 사전에는 없다. */
  hasPublished: boolean;
  /** 나머지 필드를 담는 data jsonb 컬럼 존재 여부. 태그 사전에는 없다. */
  hasData: boolean;
  /** 도메인 camelCase 키 ← 행 스칼라 컬럼 매핑. data 안의 구형 잔존값보다 우선한다. */
  scalars: Record<string, string>;
};

const listDescriptor = (table: string): SupabaseCollectionDescriptor => ({
  table,
  select: "id,published,sort_order,data",
  // id 2차 키가 없으면 동점(sort_order) 행의 상대 순서가 정의되지 않는다.
  // 신규 항목이 전부 order 0 으로 생성되므로 동점은 기본 상태다.
  order: "sort_order.asc,id.asc",
  hasPublished: true,
  hasData: true,
  scalars: { published: "published", order: "sort_order" },
});

/** ragDocuments 는 공개 읽기 경로가 아니라 여기 없다 — RAG 는 M6에서 RPC 로 조회한다. */
const SUPABASE_COLLECTIONS: Partial<Record<CollectionId, SupabaseCollectionDescriptor>> = {
  [COLLECTIONS.PHOTOS]: listDescriptor("photos"),
  [COLLECTIONS.ALBUMS]: listDescriptor("albums"),
  [COLLECTIONS.MUSIC_WORKS]: listDescriptor("music_works"),
  [COLLECTIONS.MUSIC_AWARDS]: listDescriptor("music_awards"),
  [COLLECTIONS.MUSIC_MEDIA]: listDescriptor("music_media"),
  [COLLECTIONS.DEV_PROJECTS]: listDescriptor("dev_projects"),
  [COLLECTIONS.DEV_ARTICLES]: {
    table: "dev_articles",
    select: "id,published,slug,published_at,created_at,updated_at,data",
    // publishedAt desc + id asc — 기존 `__name__ ASC` 명시와 같은 순서 계약.
    order: "published_at.desc.nullslast,id.asc",
    hasPublished: true,
    hasData: true,
    scalars: {
      published: "published",
      slug: "slug",
      publishedAt: "published_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  [COLLECTIONS.DEV_ARTICLE_TAGS]: {
    table: "dev_article_tags",
    select: "id,ko,en",
    order: "id.asc",
    hasPublished: false,
    hasData: false,
    scalars: { ko: "ko", en: "en" },
  },
  [COLLECTIONS.SITE]: {
    table: "site_documents",
    select: "id,data,created_at,updated_at",
    order: "id.asc",
    hasPublished: false,
    hasData: true,
    scalars: { createdAt: "created_at", updatedAt: "updated_at" },
  },
};

export { COLLECTIONS, SITE_DOC, SITE_MUSIC_DOC, SITE_DEV_DOC, SUPABASE_COLLECTIONS };
export type { CollectionId };
