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

/**
 * Supabase 테이블을 갖는 컬렉션. `ragDocuments` 는 공개 읽기 경로가 아니라 RPC 로만
 * 조회하므로 서술자가 없다. 이 타입 덕분에 서술자 조회가 `undefined` 를 돌려주지 않고,
 * 소비처의 `?? "리터럴"` 폴백과 런타임 throw 가 필요 없어진다.
 */
type TableCollectionId = Exclude<CollectionId, typeof COLLECTIONS.RAG_DOCUMENTS>;

/**
 * 관리자가 드래그로 순서를 정하는 컬렉션. 나머지는 정렬 축이 다르거나 목록이 아니다
 * (`devArticles` 는 발행일, `site`·`devArticleTags` 는 목록 화면이 없다).
 * 이 타입이 정렬 RPC 이름의 존재를 타입으로 보장한다.
 */
const SORTABLE_COLLECTIONS = [
  COLLECTIONS.PHOTOS,
  COLLECTIONS.ALBUMS,
  COLLECTIONS.MUSIC_WORKS,
  COLLECTIONS.MUSIC_AWARDS,
  COLLECTIONS.MUSIC_MEDIA,
  COLLECTIONS.DEV_PROJECTS,
] as const;

type SortableCollectionId = (typeof SORTABLE_COLLECTIONS)[number];

/** site 컬렉션의 고정 문서 ID */
const SITE_DOC = "config"; // 전역 + 사진
const SITE_MUSIC_DOC = "music"; // 음악 섹션 설정
const SITE_DEV_DOC = "dev"; // 개발 섹션 설정

type SupabaseCollectionDescriptor = {
  /** Postgres 테이블명. 코드의 다른 곳은 논리 이름(COLLECTIONS)만 쓴다. */
  table: string;
  /** PostgREST select 목록. 테이블마다 스칼라 구성이 달라 공통 기본값을 두지 않는다. */
  select: string;
  /** PostgREST order 파라미터. 정렬에는 항상 id 2차 키가 붙는다. */
  order: string;
  /** published 게이트 컬럼 존재 여부. site 문서·태그 사전에는 없다. */
  hasPublished: boolean;
  /** 나머지 필드를 담는 data jsonb 컬럼 존재 여부. 태그 사전에는 없다. */
  hasData: boolean;
  /** 도메인 camelCase 키 ← 행 스칼라 컬럼 매핑. data 안의 구형 잔존값보다 우선한다. */
  scalars: Record<string, string>;
};

/** 드래그 정렬 결과를 한 번에 저장하는 RPC 이름을 반드시 갖는 서술자. */
type SortableCollectionDescriptor = SupabaseCollectionDescriptor & { sortRpc: string };

const listDescriptor = (table: string, sortRpc: string): SortableCollectionDescriptor => ({
  table,
  sortRpc,
  select: "id,published,sort_order,data",
  // id 2차 키가 없으면 동점(sort_order) 행의 상대 순서가 정의되지 않는다.
  // 신규 항목이 전부 order 0 으로 생성되므로 동점은 기본 상태다.
  order: "sort_order.asc,id.asc",
  hasPublished: true,
  hasData: true,
  scalars: { published: "published", order: "sort_order" },
});

const SUPABASE_COLLECTIONS: Record<
  Exclude<TableCollectionId, SortableCollectionId>,
  SupabaseCollectionDescriptor
> &
  Record<SortableCollectionId, SortableCollectionDescriptor> = {
  [COLLECTIONS.PHOTOS]: listDescriptor("photos", "update_photos_sort_orders"),
  [COLLECTIONS.ALBUMS]: listDescriptor("albums", "update_albums_sort_orders"),
  [COLLECTIONS.MUSIC_WORKS]: listDescriptor("music_works", "update_music_works_sort_orders"),
  [COLLECTIONS.MUSIC_AWARDS]: listDescriptor("music_awards", "update_music_awards_sort_orders"),
  [COLLECTIONS.MUSIC_MEDIA]: listDescriptor("music_media", "update_music_media_sort_orders"),
  [COLLECTIONS.DEV_PROJECTS]: listDescriptor("dev_projects", "update_dev_projects_sort_orders"),
  [COLLECTIONS.DEV_ARTICLES]: {
    table: "dev_articles",
    select: "id,published,pinned,slug,published_at,created_at,updated_at,data",
    // publishedAt desc + id asc — 기존 `__name__ ASC` 명시와 같은 순서 계약.
    // 고정 글은 이 정렬에 끼어들지 않는다. 목록·sitemap·검색·이웃 글 표가 같은 순서를 쓰고,
    // 고정 섹션 분리는 목록 화면(`ArticlesView`)만 한다.
    order: "published_at.desc.nullslast,id.asc",
    hasPublished: true,
    hasData: true,
    scalars: {
      published: "published",
      pinned: "pinned",
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

/**
 * 논리 컬렉션 이름을 물리 테이블명으로 바꾼다.
 *
 * 테이블명을 아는 곳은 여기 하나다. 소비처가 `SUPABASE_COLLECTIONS[x]?.table ?? "리터럴"`
 * 로 읽으면 서술자가 사라져도 오류 없이 동작해 계약이 무력해진다.
 *
 * @param {TableCollectionId} collection 테이블을 가진 논리 컬렉션.
 * @returns {string} Postgres 테이블명.
 */
const tableFor = (collection: TableCollectionId): string => SUPABASE_COLLECTIONS[collection].table;

export {
  COLLECTIONS,
  SITE_DOC,
  SITE_MUSIC_DOC,
  SITE_DEV_DOC,
  SORTABLE_COLLECTIONS,
  SUPABASE_COLLECTIONS,
  tableFor,
};
export type { CollectionId, SortableCollectionId, TableCollectionId };
