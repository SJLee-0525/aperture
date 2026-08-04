// 정규화된 문서 문자열(normalizeForSearch 결과)에 질의 토큰이 얼마나 담겼는지 0~1로 잰다.
// 토큰화(korean-tokenize)와 분리된 순수 대조 계층 — RAG 채점과 통합 검색 랭킹이 공유한다.

// 한국어 합성어 대응 — "수상내역"이 문서의 "우수상"과 만나려면 접두/접미 부분 문자열
// 일치가 필요하다. 3자 이상 조각은 강한 신호(1점), 2자 조각은 "프로"⊂"프로필" 같은
// 공통 접두 오탐이 흔해 0.5점만 준다. 짧은 토큰(3자 이하)은 완전 포함만 허용하고,
// 라틴 토큰은 2자 조각("on"⊂"canon")의 오탐이 커서 한글 토큰에만 적용한다.
const partialTokenCredit = (token: string, documentText: string): number => {
  if (token.length < 4 || !/^\p{Script=Hangul}+$/u.test(token)) return 0;
  for (let size = token.length - 1; size >= 2; size -= 1) {
    if (
      documentText.includes(token.slice(0, size)) ||
      documentText.includes(token.slice(token.length - size))
    ) {
      return size >= 3 ? 1 : 0.5;
    }
  }
  return 0;
};

const matchedTokenRatio = (queryTokens: ReadonlySet<string>, documentText: string): number => {
  if (queryTokens.size === 0) return 0;
  const matched = [...queryTokens]
    .map((token) => (documentText.includes(token) ? 1 : partialTokenCredit(token, documentText)))
    .reduce((sum, credit) => sum + credit, 0);
  return matched / queryTokens.size;
};

export { matchedTokenRatio };
