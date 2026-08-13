import { stripParticles, tokensFor } from "@/lib/text/korean-tokenize";

type TitleSegment = { text: string; hit: boolean };

/**
 * 검색 결과 제목에서 강조할 토큰을 만든다.
 * "피아노"·"리액트"처럼 별칭 사전이 영문 토큰으로 치환하는 단어는 채점 토큰엔 없지만,
 * 채점 토큰에 검색어 원문도 더하고 조사를 제거한다.
 * "캐논으로"가 제목의 "캐논"과 만나야 한다. 순수 시각용이라 랭킹 무영향.
 * 호출부가 전달한 채점 토큰이 있으면 재사용한다.
 *
 * @param {string} query
 * @param {ReadonlySet<string>} [scoringTokens]
 * @returns {ReadonlySet<string>}
 */
const highlightTokensFor = (
  query: string,
  scoringTokens: ReadonlySet<string> = tokensFor(query),
): ReadonlySet<string> => {
  const words = query
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .split(/[^\p{L}\p{N}]+/u)
    .map(stripParticles)
    .filter((word) => word.length >= 2);
  return new Set([...scoringTokens, ...words]);
};

/**
 * 제목에서 검색 토큰과 일치하는 구간을 강조 세그먼트로 나눈다.
 * 정렬 근거를 눈에 보이게 하는 용도라 부분·별칭 일치까지 흉내내지 않는다(그건 마크 없이 통과).
 * 토큰이 NFKC+소문자 정규화본이라 제목도 같은 변환본에서 위치를 찾되, 변환으로 길이가
 * 정규화 후 문자열 길이가 달라지면 잘못된 위치를 강조하지 않도록 원문을 반환한다.
 *
 * @param {string} title
 * @param {ReadonlySet<string>} queryTokens
 * @returns {TitleSegment[]}
 */
const splitTitleByMatches = (title: string, queryTokens: ReadonlySet<string>): TitleSegment[] => {
  const whole: TitleSegment[] = [{ text: title, hit: false }];
  const lowered = title.normalize("NFKC").toLocaleLowerCase("ko-KR");
  if (lowered.length !== title.length) return whole;

  const ranges: Array<[number, number]> = [];
  for (const token of queryTokens) {
    for (let from = lowered.indexOf(token); from !== -1; from = lowered.indexOf(token, from + 1)) {
      ranges.push([from, from + token.length]);
    }
  }
  if (ranges.length === 0) return whole;

  // 겹치거나 맞닿은 강조 구간은 하나로 합친다.
  ranges.sort(([a], [b]) => a - b);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  const segments: TitleSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) segments.push({ text: title.slice(cursor, start), hit: false });
    segments.push({ text: title.slice(start, end), hit: true });
    cursor = end;
  }
  if (cursor < title.length) segments.push({ text: title.slice(cursor), hit: false });
  return segments;
};

export { highlightTokensFor, splitTitleByMatches };
export type { TitleSegment };
