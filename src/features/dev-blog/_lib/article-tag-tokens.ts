import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 글의 태그 id 를 검색·색인용 라벨 토큰으로 편다.
 *
 * 사전에 없는 id 는 id 자체를 남긴다. 라벨이 지워진 태그가 검색과 RAG 에서 사라지지 않게 하는 폴백이다.
 * `ko` 와 `en` 이 같은 태그(`Firebase`)가 흔해 중복은 제거한다.
 *
 * 표시용 라벨과 목적이 다르다. 화면에 그리는 라벨은 현재 로케일 한 값이라 이 함수를 쓰지 않는다.
 *
 * @param {readonly string[]} tagIds 글에 저장된 태그 id.
 * @param {readonly DevArticleTag[]} tags 블로그 태그 사전.
 * @param {{ includeId?: boolean }} [options] `includeId` 가 참이면 id 도 토큰에 포함한다.
 * @returns {string[]} 입력 순서를 지킨 중복 없는 토큰.
 */
const articleTagTokens = (
  tagIds: readonly string[],
  tags: readonly DevArticleTag[],
  options?: { includeId?: boolean },
): string[] => {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  return [
    ...new Set(
      tagIds
        .flatMap((id) => {
          const tag = tagById.get(id);
          const labels = [tag?.ko ?? "", tag?.en ?? ""];
          // 사전에 없으면 라벨이 둘 다 비므로 id 폴백이 유일한 토큰이 된다.
          return options?.includeId || !tag ? [id, ...labels] : labels;
        })
        .filter(Boolean),
    ),
  ];
};

export { articleTagTokens };
