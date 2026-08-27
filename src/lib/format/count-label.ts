/**
 * 목록 지면의 결과 수 문구를 만든다.
 *
 * 이 문구는 두 언어에서 같은 영어 표기를 쓴다. 사이트 전체가 이중언어라는 규칙의 예외이고
 * `design/README.md` 의 의도적 이탈 목록에 있다. 단수·복수는 언어 정책과 무관한 문법이라
 * 여기서 처리한다. "1 photos" 는 어느 쪽 결정으로도 옳지 않다.
 *
 * @param count 표시할 개수.
 * @param singular 개수가 1일 때의 단위.
 * @param plural 그 밖의 단위. 생략하면 단수형에 s 를 붙인다.
 * @returns `"1 photo"` · `"12 photos"` 형태의 문구.
 */
const countLabel = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export { countLabel };
