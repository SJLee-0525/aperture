const SEARCH_ALIASES: Array<{ pattern: RegExp; expansion: string }> = [
  { pattern: /캐논|\bcanon\b/i, expansion: "Canon camera 카메라 사진 photography" },
  { pattern: /니콘|\bnikon\b/i, expansion: "Nikon camera 카메라 사진 photography" },
  { pattern: /소니|\bsony\b/i, expansion: "Sony camera 카메라 사진 photography" },
  {
    pattern: /후지(?:필름)?|\bfujifilm\b|\bfuji\b/i,
    expansion: "Fujifilm camera 카메라 사진 photography",
  },
  { pattern: /라이카|\bleica\b/i, expansion: "Leica camera lens 카메라 렌즈 사진 photography" },
  {
    pattern: /올림푸스|\bolympus\b|\bom system\b/i,
    expansion: "Olympus OM System camera 카메라 사진 photography",
  },
  {
    pattern: /파나소닉|루믹스|\bpanasonic\b|\blumix\b/i,
    expansion: "Panasonic Lumix camera 카메라 사진 photography",
  },
  { pattern: /시그마|\bsigma\b/i, expansion: "Sigma camera lens 카메라 렌즈 사진 photography" },
  { pattern: /탐론|\btamron\b/i, expansion: "Tamron lens 렌즈 사진 photography" },
  {
    pattern: /호수공원|호수|\blake(?: park)?\b/i,
    expansion: "Lake 호수 호수공원 photo photography 사진",
  },
  {
    pattern: /리액트|\breact(?:\.?js)?\b/i,
    expansion: "React 리액트 developer development project 개발 프로젝트",
  },
  {
    pattern: /피아노|\bpiano\b/i,
    expansion: "Piano 피아노 music performance 음악 연주",
  },
];

const STOP_WORDS = new Set([
  "사진",
  "포토",
  "촬영",
  "찍은",
  "찍힌",
  "으로",
  "로",
  "보여줘",
  "보여",
  "찾아줘",
  "찾아",
  "검색",
  "해줘",
  "어떻게",
  "어떤",
  "어때",
  "무엇",
  "뭐야",
  "뭔가",
  "언제",
  "어디",
  "어디서",
  "누구",
  "누가",
  "혹시",
  "궁금",
  "궁금해",
  "궁금한",
  "알려",
  "알려줘",
  "주세요",
  "있어",
  "있는지",
  "있나요",
  "있을까",
  "없어",
  "없나요",
  "대해",
  "대한",
  "관해",
  "관한",
  "관련",
  "photo",
  "photos",
  "picture",
  "pictures",
  "show",
  "find",
  "taken",
  "with",
  "camera",
]);

// 긴 조사부터 검사한다 — "에서는"을 "는"보다 먼저 떼야 남은 어간이 온전하다.
const KOREAN_PARTICLES = [
  "에서는",
  "에서도",
  "으로는",
  "으로도",
  "께서",
  "에서",
  "에게",
  "한테",
  "으로",
  "이라",
  "이나",
  "부터",
  "까지",
  "처럼",
  "보다",
  "마다",
  "조차",
  "마저",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "과",
  "와",
  "의",
  "도",
  "만",
  "에",
  "로",
  "나",
  "요",
];

const stripParticles = (token: string): string => {
  let stem = token;
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const particle of KOREAN_PARTICLES) {
      // 어간이 2자 미만으로 줄어드는 스트립은 하지 않는다 — "놀이"→"놀" 같은 훼손 방지.
      if (stem.endsWith(particle) && stem.length - particle.length >= 2) {
        stem = stem.slice(0, stem.length - particle.length);
        stripped = true;
        break;
      }
    }
  }
  return stem;
};

const tokensFor = (text: string) => {
  const normalized = text.normalize("NFKC").toLocaleLowerCase("ko-KR");
  const aliases = SEARCH_ALIASES.flatMap(({ pattern, expansion }) =>
    pattern.test(normalized) ? [expansion.split(" ")[0]!.toLowerCase()] : [],
  );
  const words = normalized
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .map(stripParticles)
    .filter((token) => token.length >= 2)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => !SEARCH_ALIASES.some(({ pattern }) => pattern.test(token)));
  return new Set([...aliases, ...words]);
};

const expandRagQuery = (query: string) => {
  const additions = SEARCH_ALIASES.flatMap(({ pattern, expansion }) =>
    pattern.test(query) ? [expansion] : [],
  );
  return additions.length ? `${query} ${[...new Set(additions)].join(" ")}` : query;
};

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

const documentTextFor = (document: string) => [...tokensFor(document)].join(" ");

const matchedTokenRatio = (queryTokens: Set<string>, documentText: string) => {
  if (queryTokens.size === 0) return 0;
  const matched = [...queryTokens]
    .map((token) => (documentText.includes(token) ? 1 : partialTokenCredit(token, documentText)))
    .reduce((sum, credit) => sum + credit, 0);
  return matched / queryTokens.size;
};

const keywordSimilarity = (query: string, document: string) =>
  matchedTokenRatio(tokensFor(query), documentTextFor(document));

/**
 * 청크 순회 전에 질문 쪽 토큰화를 한 번만 수행해두는 채점기.
 * 점수는 분류기 키워드 채점과 로컬 토큰화 채점 중 높은 쪽 —
 * 한쪽 목록이 빗나가도 다른 쪽이 받치고, 합산하지 않아 서로의 분모를 오염시키지 않는다.
 * 분류기 키워드도 로컬과 동일한 tokensFor 파이프라인(별칭 매핑·조사 스트립·불용어)을
 * 거친다 — "사진" 같은 일반어 인플레이션 방지 + "캐논"→canon 한영 별칭 일원화.
 */
const createKeywordScorer = (queryText: string, keywords: string[] = []) => {
  const localTokens = tokensFor(queryText);
  const keywordTokens = tokensFor(keywords.join(" "));
  return (document: string) => {
    const documentText = documentTextFor(document);
    return Math.max(
      matchedTokenRatio(keywordTokens, documentText),
      matchedTokenRatio(localTokens, documentText),
    );
  };
};

const matchesSearchText = (query: string, document: string) =>
  keywordSimilarity(query, document) >= 0.5;

export { createKeywordScorer, expandRagQuery, keywordSimilarity, matchesSearchText };
