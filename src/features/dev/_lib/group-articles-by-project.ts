import type { DevArticleProjectLink } from "@/types/dev-article";

/**
 * 공개 글을 프로젝트 id 로 뒤집는다.
 *
 * 관계는 글에만 저장되므로 프로젝트 쪽 목록은 매번 이 계산으로 만든다. 입력 순서를 그대로
 * 옮겨 담아 각 프로젝트의 글도 발행일 내림차순이 된다.
 *
 * @param {readonly DevArticleProjectLink[]} articles 발행일 내림차순의 공개 글 관계 목록.
 * @returns {Record<string, DevArticleProjectLink[]>} 프로젝트 id → 그 프로젝트를 지목한 글.
 *   글이 하나도 없는 프로젝트는 키 자체가 없다.
 */
const groupArticlesByProject = (
  articles: readonly DevArticleProjectLink[],
): Record<string, DevArticleProjectLink[]> => {
  // 프로젝트 id 는 관리자가 정하는 행 ID 다. `__proto__`·`constructor` 를 객체
  // 리터럴 키로 쓰면 프로토타입 값을 읽거나 대입하게 되므로 Map 으로 모은다.
  const grouped = new Map<string, DevArticleProjectLink[]>();

  articles.forEach((article) => {
    // 같은 프로젝트를 두 번 지목한 글이 목록에 두 줄로 나오지 않게 한다.
    new Set(article.relatedProjectIds).forEach((projectId) => {
      const found = grouped.get(projectId);
      if (found) found.push(article);
      else grouped.set(projectId, [article]);
    });
  });

  // `fromEntries` 는 속성을 정의하므로 위 키들도 전부 자기 속성으로 남는다.
  return Object.fromEntries(grouped);
};

export { groupArticlesByProject };
