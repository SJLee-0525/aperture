import type { CollectionId } from "@/constants/collections";

/**
 * 도메인 입력을 Supabase 행으로 바꾸는 인코더 단일 출처.
 *
 * 읽기 병합(`lib/supabase/public/transport`의 mergeRow — data 를 먼저 펼치고 행 스칼라로
 * 덮는다)의 정확한 역함수여야 한다. 스칼라로 나가는 필드는 data 에서 제거해 이중 저장을
 * 막는다 — data 안에 남으면 정렬 RPC 가 컬럼만 갱신할 때 즉시 stale 이 되고, 마이그레이션
 * 잔존값과 구분할 수 없는 쓰레기가 쌓인다.
 */

type ListRow = {
  id: string;
  published: boolean;
  sort_order: number;
  data: Record<string, unknown>;
};

type ArticleRow = {
  id: string;
  published: boolean;
  slug: string;
  published_at: string | null;
  data: Record<string, unknown>;
};

/**
 * jsonb 에 넣을 값을 JSON 왕복으로 정규화한다. `Date` 는 ISO 문자열이 되고(읽기의
 * `toDate`/`toNullableDate` 와 왕복 무손실), `undefined` 키는 떨어진다.
 * 값이 없는 선택 필드(`fileName` 등)를 담은 문서도 그대로 재저장된다.
 * 입력 객체는 변경하지 않는다.
 */
const toJson = (value: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

/** 수동 정렬 목록 컬렉션 공통 인코딩. `order`·`published` 를 스칼라로 분리한다. */
const encodeListRow = (id: string, input: Record<string, unknown>): ListRow => {
  const { order, published, ...rest } = input;
  return {
    id,
    published: published === true,
    sort_order: typeof order === "number" ? order : 0,
    data: toJson(rest),
  };
};

/**
 * dev_articles 인코딩. 쓰는 스칼라는 `published`·`slug`·`published_at` 3개다.
 * `created_at`/`updated_at` 은 DB(default·트리거) 소유라 쓰지 않고,
 * `firstPublishedAt` 은 조회 대상이 아니라 data 안에 남긴다.
 *
 * `pinned` 는 읽기 병합의 대상이지만 이 인코더가 유일하게 되돌려 쓰지 않는 컬럼이다.
 * `setDevArticlePinned` 만 그 컬럼을 쓴다. 여기서 함께 쓰면 낡은 폼 스냅샷이 고정을 지운다.
 * data 에서는 계속 걷어낸다 — 남겨 두면 컬럼과 이중 저장이 되어 곧바로 stale 이 된다.
 */
const encodeArticleRow = (id: string, input: Record<string, unknown>): ArticleRow => {
  const { published, pinned, slug, publishedAt, createdAt, updatedAt, ...rest } = input;
  void pinned;
  void createdAt;
  void updatedAt;
  // publishedAt 이 Date 가 아닐 때 조용히 null 로 강등하면, 발행 조건 검사를 이미
  // 통과한 글이 published_at NULL 로 저장되어 정렬 맨 뒤로 가라앉고 어디에도 오류가 없다.
  if (published === true && !(publishedAt instanceof Date)) {
    throw new Error("발행된 글에는 Date 형식의 publishedAt 이 필요합니다.");
  }
  return {
    id,
    published: published === true,
    slug: typeof slug === "string" ? slug : "",
    published_at: publishedAt instanceof Date ? publishedAt.toISOString() : null,
    data: toJson(rest),
  };
};

type RowEncoder = (id: string, input: Record<string, unknown>) => Record<string, unknown>;

/** 컬렉션에 맞는 행 인코더. site·태그 사전은 목록 CRUD 밖에서 자체 인코딩한다. */
const rowEncoderFor = (collection: CollectionId): RowEncoder =>
  collection === "devArticles" ? encodeArticleRow : encodeListRow;

export { encodeArticleRow, encodeListRow, rowEncoderFor, toJson };
