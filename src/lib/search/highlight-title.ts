import { stripParticles, tokensFor } from "@/lib/text/korean-tokenize";

type TitleSegment = { text: string; hit: boolean };

/**
 * 하이라이트 대조용 토큰 — 채점 토큰(tokensFor)에 질의 원어를 더한다.
 * "피아노"·"리액트"처럼 별칭 사전이 영문 토큰으로 치환하는 단어는 채점 토큰엔 없지만,
 * 제목에 그대로 있으면 사용자가 친 글자이니 시각 근거로 표시한다. 원어도 조사는 뗀다 —
 * "캐논으로"가 제목의 "캐논"과 만나야 한다. 순수 시각용이라 랭킹 무영향.
 * scoringTokens는 호출부가 이미 토큰화해뒀으면 재사용(채점기와 공유) — 없으면 여기서 생성.
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
 * 표시 제목에서 질의 토큰이 직접 포함된 구간을 하이라이트 세그먼트로 분해한다 —
 * 정렬 근거를 눈에 보이게 하는 용도라 부분·별칭 일치까지 흉내내지 않는다(그건 마크 없이 통과).
 * 토큰이 NFKC+소문자 정규화본이라 제목도 같은 변환본에서 위치를 찾되, 변환으로 길이가
 * 달라지는 예외 문자(합자·NFD 등)를 만나면 오프셋이 어긋나므로 하이라이트를 포기하고 원문 그대로 낸다.
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

  // 겹치거나 맞닿은 구간은 하나로 — "호수"+"호수공원" 이중 매치가 마크 둘로 쪼개지지 않게.
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
