const baseUrl = process.env.CHAT_EVAL_BASE_URL ?? "http://127.0.0.1:3000";

const CASES = [
  {
    id: "greeting-ko",
    lang: "ko",
    messages: [{ role: "user", content: "안녕하세요" }],
    expectsLookup: false,
  },
  {
    id: "ambiguous-ko",
    lang: "ko",
    messages: [{ role: "user", content: "4242" }],
    expectsLookup: false,
  },
  {
    id: "development-ko",
    lang: "ko",
    messages: [{ role: "user", content: "대표 개발 프로젝트 두 개를 소개해 줘" }],
    expectsLookup: true,
    referenceType: "project",
  },
  {
    id: "photography-ko",
    lang: "ko",
    messages: [{ role: "user", content: "도쿄에서 촬영한 사진을 보여줘" }],
    expectsLookup: true,
    referenceType: "photo",
  },
  {
    id: "photo-equipment-ko",
    lang: "ko",
    messages: [{ role: "user", content: "소니 35mm GM 렌즈로 찍은 사진 보여줘" }],
    expectsLookup: true,
    referenceType: "photo",
    extended: true,
  },
  {
    id: "photography-implicit-ko",
    lang: "ko",
    messages: [{ role: "user", content: "이성준이 찍은 바다 몇 개 추천해줘" }],
    expectsLookup: true,
    referenceType: "photo",
  },
  {
    id: "private-location-ko",
    lang: "ko",
    messages: [{ role: "user", content: "이성준이 사는 곳의 시간은 지금 몇 시야?" }],
    expectsLookup: true,
  },
  {
    id: "music-follow-up-en",
    lang: "en",
    messages: [
      { role: "user", content: "Tell me about Sungjoon's piano performances." },
      { role: "assistant", content: "I can introduce the public performance records." },
      { role: "user", content: "Show me two of them." },
    ],
    expectsLookup: true,
    referenceType: "music",
  },
];

const parseStream = async (response, onEvent) => {
  if (!response.body) throw new Error("Response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
    if (done) break;
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer));
};

const evaluateCase = async (fixture, index) => {
  const startedAt = performance.now();
  let firstTokenMs = null;
  let lookupSeen = false;
  let message = null;
  let streamError = null;
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson",
      "Content-Type": "application/json",
      ...(process.env.CHAT_EVAL_ISOLATE_CLIENTS === "1"
        ? { "x-real-ip": `192.0.2.${index + 1}` }
        : {}),
    },
    body: JSON.stringify({ lang: fixture.lang, messages: fixture.messages }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

  await parseStream(response, (event) => {
    if (event.type === "status" && event.status === "portfolio-search") lookupSeen = true;
    if (event.type === "delta" && firstTokenMs === null) {
      firstTokenMs = performance.now() - startedAt;
    }
    if (event.type === "done") message = event.message;
    if (event.type === "error") streamError = event.message;
  });
  const totalMs = performance.now() - startedAt;
  if (streamError) throw new Error(streamError);
  if (!message?.content?.trim()) throw new Error("Completed without answer text");

  const failures = [];
  if (lookupSeen !== fixture.expectsLookup) {
    failures.push(`lookup=${lookupSeen}, expected=${fixture.expectsLookup}`);
  }
  if (fixture.referenceType) {
    const references = message.references ?? [];
    if (!references.some((reference) => reference.type === fixture.referenceType)) {
      failures.push(`missing ${fixture.referenceType} reference`);
    }
  }
  if (/공식 포트폴리오의 각 섹션을 참고|official portfolio sections/i.test(message.content)) {
    failures.push("generic rejection fallback returned");
  }

  return {
    id: fixture.id,
    passed: failures.length === 0,
    firstTokenMs: Math.round(firstTokenMs ?? totalMs),
    totalMs: Math.round(totalMs),
    lookupSeen,
    referenceCount: message.references?.length ?? 0,
    answer: message.content,
    failures,
  };
};

const selectedCase = process.env.CHAT_EVAL_CASE;
const fixtures = selectedCase
  ? CASES.filter(({ id }) => id === selectedCase)
  : CASES.filter(({ extended }) => !extended);
if (selectedCase && fixtures.length === 0)
  throw new Error(`Unknown CHAT_EVAL_CASE: ${selectedCase}`);

const results = [];
for (const [index, fixture] of fixtures.entries()) {
  try {
    results.push(await evaluateCase(fixture, index));
  } catch (error) {
    results.push({ id: fixture.id, passed: false, error: error.message });
  }
}

for (const result of results) {
  const timing =
    result.firstTokenMs === undefined
      ? ""
      : ` TTFT=${result.firstTokenMs}ms total=${result.totalMs}ms`;
  console.log(`\n${result.passed ? "PASS" : "FAIL"} ${result.id}${timing}`);
  if (result.answer) console.log(`  ${result.answer.replaceAll("\n", " ")}`);
  if (result.failures?.length) console.log(`  ${result.failures.join("; ")}`);
  if (result.error) console.log(`  ${result.error}`);
}

const passed = results.filter((result) => result.passed).length;
const measured = results.filter((result) => result.firstTokenMs !== undefined);
const average = (key) =>
  measured.length
    ? Math.round(measured.reduce((sum, result) => sum + result[key], 0) / measured.length)
    : 0;
console.log(
  `\nSummary: ${passed}/${results.length} passed, avg TTFT=${average("firstTokenMs")}ms, avg total=${average("totalMs")}ms`,
);
if (passed !== results.length) process.exitCode = 1;
