/**
 * mock 목록에 공개 게이트와 정렬을 적용한다.
 *
 * live 는 PostgREST 쿼리(`published=eq.true` + 서술자의 `sort_order.asc,id.asc`)가 이 일을
 * 하고, mock 은 각 getter 가 직접 해야 한다. 한 곳에서 정하지 않으면 어느 getter 가 게이트를
 * 빠뜨렸는지 눈으로 볼 수 없다.
 *
 * @param {T[]} items 초안을 포함한 mock 전량.
 * @returns {T[]} 공개 항목만, live 와 같은 순서로.
 */
const publishedInOrder = <T extends { id: string; order: number; published: boolean }>(
  items: T[],
): T[] =>
  items
    .filter((item) => item.published)
    // id 2차 키가 없으면 동점 order 의 상대 순서가 정의되지 않아 live 와 달라진다.
    .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export { publishedInOrder };
