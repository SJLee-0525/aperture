/**
 * 태그를 참조하는 글 수를 센다. 삭제 전 검증과 관리자 패널의 사용 현황 표시가 공유한다.
 *
 * @param articles 검사할 글 목록. 초안을 포함해야 한다 —
 *   초안만 쓰는 태그를 지우면 그 초안이 발행 조건(`tag-unknown`)에 걸린다.
 * @param tagId 셀 태그 id.
 * @returns 이 태그를 참조하는 글 수.
 */
const countTagUsage = (articles: Array<{ tags: string[] }>, tagId: string): number =>
  articles.filter((article) => article.tags.includes(tagId)).length;

/**
 * 사용 중 태그 삭제를 거부할 때의 문구. mock·live 저장소가 같은 문장을 쓴다.
 *
 * @param count 이 태그를 참조하는 글 수.
 * @returns 거부 사유와 다음 행동을 담은 문구.
 */
const tagInUseMessage = (count: number): string =>
  `이 태그를 사용하는 글이 ${count}건 있습니다. 글에서 태그를 빼고 다시 삭제하세요.`;

export { countTagUsage, tagInUseMessage };
