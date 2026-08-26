/** 헤더 조회만 필요하므로 `Request` 와 `next/headers` 양쪽을 같은 함수로 받는다. */
type HeaderLookup = { get: (name: string) => string | null };

/**
 * 제한 버킷을 나눌 클라이언트 주소.
 *
 * Vercel 이 직접 채우는 `x-vercel-forwarded-for` 를 최우선으로 본다. `x-forwarded-for` 는
 * 클라이언트가 임의로 덧붙일 수 있어, 그 첫 항목을 키로 쓰면 임의 헤더로 새 버킷을 만들지 못한다.
 * 프록시가 없는 배포에서는 `x-real-ip` 도 위조할 수 있다.
 *
 * @returns 주소를 찾지 못하면 `"unknown"`. 길이는 128자로 자른다.
 */
const clientAddress = (headers: HeaderLookup): string => {
  const address =
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return address.slice(0, 128);
};

export { clientAddress };
export type { HeaderLookup };
