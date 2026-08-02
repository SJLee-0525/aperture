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

const tokensFor = (text: string) => {
  const normalized = text.normalize("NFKC").toLocaleLowerCase("ko-KR");
  const aliases = SEARCH_ALIASES.flatMap(({ pattern, expansion }) =>
    pattern.test(normalized) ? [expansion.split(" ")[0]!.toLowerCase()] : [],
  );
  const words = normalized
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
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

const keywordSimilarity = (query: string, document: string) => {
  const queryTokens = tokensFor(query);
  if (queryTokens.size === 0) return 0;
  const documentTokens = tokensFor(document);
  const documentText = [...documentTokens].join(" ");
  const matched = [...queryTokens].filter((token) => documentText.includes(token)).length;
  return matched / queryTokens.size;
};

const matchesSearchText = (query: string, document: string) =>
  keywordSimilarity(query, document) >= 0.5;

export { expandRagQuery, keywordSimilarity, matchesSearchText };
