/**
 * 블로그 글 순서 — 발행일 내림차순, 발행일이 없는 글은 뒤로, 같으면 id 오름차순.
 *
 * 다른 컬렉션이 쓰는 수동 `order` 를 블로그에는 두지 않는다. 발행일이 목록·탐색·pagination 의
 * 공통 기준이고, 보조 정렬이 없으면 발행일이 겹치는 글의 페이지 경계가 요청마다 흔들린다.
 * Firestore 쿼리(`publishedAt desc` + `__name__ asc`)가 같은 순서를 내야 하며,
 * 공개 목록·챗봇 투영이 이 비교자 하나를 공유해 mock 과 live 의 순서가 갈리지 않는다.
 *
 * @param {{ id: string; publishedAt: Date | null }} a
 * @param {{ id: string; publishedAt: Date | null }} b
 * @returns {number} `Array.prototype.sort` 비교 결과.
 */
const compareByPublishedAtDesc = <T extends { id: string; publishedAt: Date | null }>(
  a: T,
  b: T,
): number => {
  const left = a.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const right = b.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  // 둘 다 발행일이 없으면 뺄셈이 NaN 이 되므로 같은 값은 뺄셈 앞에서 걸러낸다.
  return right !== left ? right - left : a.id.localeCompare(b.id);
};

export { compareByPublishedAtDesc };
