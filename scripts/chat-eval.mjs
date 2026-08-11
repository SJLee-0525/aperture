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
  // 화면 문맥(§1) — 열린 모달을 가리키는 지시어 질문. id는 mock 데이터 기준.
  {
    id: "screen-photo-ko",
    lang: "ko",
    messages: [{ role: "user", content: "이 사진 어디서 찍었어?" }],
    context: { pathname: "/ko/photo", openTarget: { type: "photo", id: "p01" } },
    expectsLookup: true,
  },
  {
    id: "screen-work-en",
    lang: "en",
    messages: [
      { role: "user", content: "Tell me the program of the performance I am looking at." },
    ],
    context: { pathname: "/en/music", openTarget: { type: "work", id: "winterreise" } },
    expectsLookup: true,
    extended: true,
  },
  {
    id: "screen-award-ko",
    lang: "ko",
    messages: [{ role: "user", content: "지금 보고 있는 이 수상 내역 알려줘" }],
    context: { pathname: "/ko/music/career", openTarget: { type: "award", id: "geneva-2024" } },
    expectsLookup: true,
    extended: true,
  },
  {
    id: "screen-project-ko",
    lang: "ko",
    messages: [{ role: "user", content: "이 프로젝트 기술 스택이 뭐야?" }],
    context: { pathname: "/ko/dev/projects", openTarget: { type: "project", id: "portfolio" } },
    expectsLookup: true,
    extended: true,
  },
  // 사진 필터 링크(§2) — 조건 질문에 모델이 검증 가능한 필터 URL을 생성해야 한다.
  {
    id: "filter-link-focal-ko",
    lang: "ko",
    messages: [{ role: "user", content: "35mm에서 85mm 사이에서 찍은 사진들을 보고 싶어" }],
    expectsLookup: true,
    expectsLinkContaining: "focalMin=35&focalMax=85",
    extended: true,
  },
  {
    id: "filter-link-tag-camera-ko",
    lang: "ko",
    messages: [{ role: "user", content: "Leica로 찍은 야경 사진 보여줘" }],
    expectsLookup: true,
    expectsLinkContaining: "tag=night&camera=Leica",
    extended: true,
  },
  // 연락 초안(§3) — 대화에 실제 내용이 있을 때만 contactDraft가 채워져야 한다.
  {
    id: "contact-draft-ko",
    lang: "ko",
    messages: [
      { role: "user", content: "촬영 의뢰를 하고 싶은데 대신 전달해 줄 수 있어?" },
      { role: "assistant", content: "네, 성함과 연락받을 이메일, 문의 내용을 알려주세요." },
      {
        role: "user",
        content:
          "이름은 박도현이고 이메일은 dh.park@example.com이야. 10월 셋째 주에 제품 촬영을 의뢰하고 싶다고 전해줘.",
      },
    ],
    expectsLookup: false,
    expectsContactDraft: true,
    extended: true,
  },
  {
    id: "no-contact-draft-ko",
    lang: "ko",
    messages: [{ role: "user", content: "연락은 어떻게 해?" }],
    expectsContactDraft: false,
    expectsLookup: true,
    extended: true,
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
    body: JSON.stringify({
      lang: fixture.lang,
      messages: fixture.messages,
      ...(fixture.context ? { context: fixture.context } : {}),
    }),
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
  if (fixture.expectsContactDraft !== undefined) {
    const hasDraft = Boolean(message.contactDraft?.message?.trim());
    if (hasDraft !== fixture.expectsContactDraft) {
      failures.push(`contactDraft=${hasDraft}, expected=${fixture.expectsContactDraft}`);
    }
  }
  if (fixture.expectsLinkContaining) {
    const links = message.links ?? [];
    if (!links.some((link) => link.href.includes(fixture.expectsLinkContaining))) {
      failures.push(
        `missing link containing "${fixture.expectsLinkContaining}" (got: ${links.map(({ href }) => href).join(", ") || "none"})`,
      );
    }
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
