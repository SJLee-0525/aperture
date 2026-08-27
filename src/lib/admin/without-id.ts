/**
 * 저장소 CRUD 가 받는 입력 형태로 좁힌다. 문서 ID 는 경로가 이미 알고 있어 본문에 넣지 않는다.
 *
 * 구조 분해로 버리면 쓰지 않는 변수가 남아 lint 를 통과시키려고 `void _id` 를 덧붙이게 된다.
 * 폼 여섯과 블로그가 같은 세 줄을 반복하던 자리다.
 *
 * @param {T} entity 문서 ID 를 가진 도메인 값.
 * @returns {Omit<T, "id">} ID 를 뺀 같은 값.
 */
const withoutId = <T extends { id: string }>(entity: T): Omit<T, "id"> => {
  const { id, ...input } = entity;
  void id;
  return input;
};

export { withoutId };
