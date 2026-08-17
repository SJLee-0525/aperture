import { collectionCacheTag } from "@/constants/cache";
import { COLLECTIONS, SUPABASE_COLLECTIONS } from "@/constants/collections";
import { MAX_PINNED_ARTICLES, PIN_LIMIT_MESSAGE } from "@/constants/dev-article-pin";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { devArticleRagPolicy } from "@/lib/content/dev-article-rag-policy";
import { requireAdminSession } from "@/lib/supabase/admin/require-admin-session";
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
  // 세션 없이 조회하면 RLS 가 초안을 감춰 선점된 slug 를 "사용 가능"으로 판정한다.
  await requireAdminSession();
  const { data, error } = await getSupabaseClient()
    .from(ARTICLES_TABLE)
    .select("id")
    .eq("slug", slug)
    .neq("id", selfId)
    .limit(1);
  if (error) throw new Error("slug 중복 검사에 실패했습니다.");
  return (data?.[0]?.id as string | undefined) ?? null;
};

/**
 * 고정 여부만 바꾼다. 제목·요약·본문·태그가 그대로라 RAG 청크가 달라지지 않으므로
 * `devArticlesCrud` 를 거치지 않는다. 발행 필드도 건드리지 않는다.
 *
 * 상한 검사와 갱신은 RPC 한 번에 묶는다. 개수 조회와 update 를 나누면 두 클라이언트가
 * 같은 개수를 읽고 각자 고정해 상한을 넘긴다. 이미 같은 상태면 RPC 가 상한과 무관하게
 * 성공으로 끝내므로, 상한에 도달한 뒤에도 재시도가 실패로 뒤집히지 않는다.
 *
 * 이 UPDATE 는 `updated_at` 을 올리지 않는다. 트리거가 data·published·slug·published_at
 * 이 실제로 바뀔 때만 발화하므로 SEO 수정 시각이 고정 토글에 흔들리지 않는다.
 *
 * @param {string} id 대상 글의 문서 ID.
 * @param {boolean} pinned 고정 여부.
 * @returns {Promise<void>} 저장과 공개 캐시 갱신이 끝나면 완료된다.
 * @throws {Error} 상한을 넘겼거나, 문서가 없거나, RLS 가 쓰기를 막아 0행이 된 경우.
 */
const setDevArticlePinned = async (id: string, pinned: boolean): Promise<void> => {
  const { data, error } = await getSupabaseClient().rpc("set_dev_article_pinned", {
    p_id: id,
    p_pinned: pinned,
    p_max: MAX_PINNED_ARTICLES,
  });
  if (error?.code === "23514") throw new Error(PIN_LIMIT_MESSAGE);
  if (error || data !== true) throw new Error("고정 상태 변경에 실패했습니다.");
  requestPublicRevalidate(collectionCacheTag(COLLECTIONS.DEV_ARTICLES));
};

const TAGS_CACHE_TAG = collectionCacheTag(COLLECTIONS.DEV_ARTICLE_TAGS);

/**
 * 태그 전체를 공개 getter와 같은 ID 오름차순으로 읽는다.
 *
 * @returns {Promise<DevArticleTag[]>} id 오름차순의 태그 사전.
 */
const listDevArticleTagsAdmin = async (): Promise<DevArticleTag[]> => {
  const { data, error } = await getSupabaseClient().from(TAGS_TABLE).select("id,ko,en").order("id");
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
  setDevArticlePinned,
  updateDevArticleTag,
};
