/**
 * `searchParams.q` 를 검색어 한 줄로 정규화한다.
 *
 * `?q=a&q=b` 는 배열로 들어온다. 검색창이 만드는 형태가 아니므로 첫 값만 쓴다.
 */
const readSearchQuery = (raw: string | string[] | undefined): string =>
  (Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")).trim();

export { readSearchQuery };
