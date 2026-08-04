// 한국어 질의·문서 토큰화 파이프라인 — RAG 채점(lib/ai)과 통합 검색(features/search)이
// 같은 사전(별칭·불용어·조사)을 공유한다. 채점 정책은 각 소비자가 갖고, 여기는 토큰화만.

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

const tokensFor = (text: string): Set<string> => {
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

/** 문서 텍스트를 질의와 같은 토큰 파이프라인으로 정규화한 대조용 문자열로 만든다. */
const normalizeForSearch = (text: string): string => [...tokensFor(text)].join(" ");

export { SEARCH_ALIASES, normalizeForSearch, stripParticles, tokensFor };
