import { collectionCacheTag } from "@/constants/cache";
import { COLLECTIONS, SUPABASE_COLLECTIONS } from "@/constants/collections";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { devArticleRagPolicy } from "@/lib/firebase/dev-article-rag-policy";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listCrud } from "@/lib/supabase/list-crud";
import { toDevArticle } from "@/lib/supabase/public/dev-articles";

import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

const ARTICLES_TABLE = SUPABASE_COLLECTIONS[COLLECTIONS.DEV_ARTICLES]?.table ?? "dev_articles";
const TAGS_TABLE = SUPABASE_COLLECTIONS[COLLECTIONS.DEV_ARTICLE_TAGS]?.table ?? "dev_article_tags";

/**
 * 블로그 글 CRUD. 행 병합 결과의 정규화는 공개 디코더 `toDevArticle` 을 그대로 쓴다 —
 * 기본값·날짜 계약(발행 필드 null 보존, createdAt/updatedAt epoch 폴백)이 같다. 발행 조건·firstPublishedAt 스탬프 같은 도메인 규칙은 여기 없고
 * 도메인 검증은 live 저장소가 이 CRUD를 감싸서 적용한다.
 *
 * RAG 동기화는 `devArticleRagPolicy` 가 판정한다. 초안 저장과 발행일·이미지·연관 프로젝트만
 * 바뀐 저장은 요청을 보내지 않는다.
 */
const devArticlesCrud = listCrud<DevArticle>(
  COLLECTIONS.DEV_ARTICLES,
  toDevArticle,
  "블로그 글",
  "article",
  devArticleRagPolicy,
);

/**
 * slug 를 이미 쓰는 다른 글의 문서 ID를 찾는다. 초안을 포함한 서버 데이터 기준이라,
 * 참조 목록이 로드 중일 때 폼 검사가 놓치는 중복 저장 창을 여기서 닫는다.
 * DB 의 부분 unique 인덱스(`where slug <> ''`)가 최후 방어선이고, 이 조회는 폼 오류
 * 메시지를 위해 유지한다.
 *
 * @param {string} slug 검사할 slug. 빈 값은 초안끼리 겹칠 수 있어 검사하지 않는다.
 * @param {string} selfId 편집 중인 글의 문서 ID. 자기 자신은 중복으로 세지 않는다.
 * @returns {Promise<string | null>} slug 를 선점한 다른 글의 ID. 없으면 `null`.
 */
const findArticleSlugOwner = async (slug: string, selfId: string): Promise<string | null> => {
  if (!slug) return null;
  const { data, error } = await getSupabaseClient()
    .from(ARTICLES_TABLE)
    .select("id")
    .eq("slug", slug)
    .neq("id", selfId)
    .limit(1);
  if (error) throw new Error("slug 중복 검사에 실패했습니다.");
  return (data?.[0]?.id as string | undefined) ?? null;
};

const TAGS_CACHE_TAG = collectionCacheTag(COLLECTIONS.DEV_ARTICLE_TAGS);

/**
 * 태그 전체를 공개 getter와 같은 ID 오름차순으로 읽는다.
 *
 * @returns {Promise<DevArticleTag[]>} id 오름차순의 태그 사전.
 */
const listDevArticleTagsAdmin = async (): Promise<DevArticleTag[]> => {
  const { data, error } = await getSupabaseClient()
    .from(TAGS_TABLE)
    .select("id,ko,en")
    .order("id");
  if (error) throw new Error("태그 목록을 불러오지 못했습니다.");
  return (data as DevArticleTag[]) ?? [];
};

/**
 * 태그 ID를 PK로 사용한다. 기존 문서 덮어쓰기는 PK 충돌(23505)로 막히므로
 * 사전 존재 검사 없이 충돌 코드를 한국어 메시지로 바꾼다.
 *
 * @param {DevArticleTag} tag 저장할 태그.
 * @returns {Promise<void>} 저장과 공개 캐시 갱신이 끝나면 완료된다.
 */
const createDevArticleTag = async (tag: DevArticleTag): Promise<void> => {
  const { error } = await getSupabaseClient()
    .from(TAGS_TABLE)
    .insert({ id: tag.id, ko: tag.ko, en: tag.en });
  if (error?.code === "23505") throw new Error("같은 id의 태그가 이미 있습니다.");
  if (error) throw new Error("태그 저장에 실패했습니다.");
  requestPublicRevalidate(TAGS_CACHE_TAG);
};

/**
 * 태그 라벨만 수정한다. 태그 ID는 글이 참조하므로 바꾸지 않는다.
 * id 변경이 필요하면 새 태그를 만들고 글을 옮긴 뒤 지운다.
 *
 * @param {DevArticleTag} tag 수정할 태그. id 로 행을 찾고 ko/en 만 갱신한다.
 * @returns {Promise<void>} 저장과 공개 캐시 갱신이 끝나면 완료된다.
 */
const updateDevArticleTag = async (tag: DevArticleTag): Promise<void> => {
  const { data, error } = await getSupabaseClient()
    .from(TAGS_TABLE)
    .update({ ko: tag.ko, en: tag.en })
    .eq("id", tag.id)
    .select("id");
  if (error || !data?.length) throw new Error("태그 수정에 실패했습니다.");
  requestPublicRevalidate(TAGS_CACHE_TAG);
};

/**
 * 태그 행을 삭제한다. 사용 글 수 검증은 저장소(`live-dev-article-repository`)가
 * 먼저 수행하고 여기서는 행과 캐시만 갱신한다.
 *
 * @param {string} id 삭제할 태그 id.
 * @returns {Promise<void>} 삭제와 공개 캐시 갱신이 끝나면 완료된다.
 */
const removeDevArticleTag = async (id: string): Promise<void> => {
  const { data, error } = await getSupabaseClient()
    .from(TAGS_TABLE)
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) throw new Error("태그 삭제에 실패했습니다.");
  requestPublicRevalidate(TAGS_CACHE_TAG);
};

export {
  createDevArticleTag,
  devArticlesCrud,
  findArticleSlugOwner,
  listDevArticleTagsAdmin,
  removeDevArticleTag,
  updateDevArticleTag,
};
