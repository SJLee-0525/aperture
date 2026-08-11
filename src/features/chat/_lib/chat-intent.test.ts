import { describe, expect, it, vi } from "vitest";

import {
  buildRagQueryText,
  needsProfileContext,
  selectChatIntentWithClassifier,
  selectProfileSections,
} from "@/features/chat/_lib/chat-intent";

describe("needsProfileContext", () => {
  it.each([
    "이성준의 개발 프로젝트를 알려줘",
    "도쿄에서 찍은 사진 보여줘",
    "이성준이 찍은 바다 몇 개 추천해줘",
    "멋진 노을 풍경 보여줘",
    "피아노 연주 경력이 궁금해",
    "How can I contact Sungjoon?",
  ])("포트폴리오 정보 질문을 조회 대상으로 분류한다: %s", (content) => {
    expect(needsProfileContext([{ role: "user", content }])).toBe(true);
  });

  it.each(["안녕하세요", "4242", "오늘 기분은 어때?", "hello"])(
    "일반 대화나 불명확한 입력은 조회하지 않는다: %s",
    (content) => {
      expect(needsProfileContext([{ role: "user", content }])).toBe(false);
    },
  );

  it.each(["I am happy today", "What happened yesterday?"])(
    "영문 키워드의 부분 문자열만으로 포트폴리오 질문으로 오분류하지 않는다: %s",
    (content) => {
      expect(needsProfileContext([{ role: "user", content }])).toBe(false);
    },
  );

  it("포트폴리오 대화 직후의 짧은 후속 질문은 문맥 조회를 유지한다", () => {
    expect(
      needsProfileContext([
        { role: "user", content: "개발 프로젝트를 알려줘" },
        { role: "assistant", content: "프로젝트를 소개할게요." },
        { role: "user", content: "그건 언제 했어?" },
      ]),
    ).toBe(true);
  });

  it.each([
    ["사진 작업 보여줘", ["profile", "photography"]],
    ["캐논으로 찍은 것 보여줘", ["profile", "photography"]],
    ["lake에서 찍은 작업", ["profile", "photography"]],
    ["React 프로젝트가 궁금해", ["profile", "development"]],
    ["리액트로 만든 작업", ["profile", "development"]],
    ["피아노 연주와 수상 경력 알려줘", ["profile", "music"]],
    ["piano 작업을 알려줘", ["profile", "music"]],
    ["수상 경력을 알려줘", ["profile", "development", "music"]],
    ["연락 방법을 알려줘", ["profile"]],
    ["포트폴리오를 소개해 줘", ["profile", "development", "music", "photography"]],
  ])("질문에 필요한 섹션만 선택한다: %s", (content, sections) => {
    expect(selectProfileSections([{ role: "user", content }])).toEqual(sections);
  });

  it("후속 질문은 직전 포트폴리오 섹션을 이어받는다", () => {
    expect(
      selectProfileSections([
        { role: "user", content: "사진 작업 보여줘" },
        { role: "assistant", content: "사진을 소개할게요." },
        { role: "user", content: "그중 도쿄에서 찍은 건?" },
      ]),
    ).toEqual(["profile", "photography"]);

    expect(
      selectProfileSections([
        { role: "user", content: "Tell me about Sungjoon's piano performances." },
        { role: "assistant", content: "I can introduce the public performance records." },
        { role: "user", content: "Show me two of them." },
      ]),
    ).toEqual(["profile", "music"]);

    expect(
      selectProfileSections([
        { role: "user", content: "개발 프로젝트를 보여줘" },
        { role: "assistant", content: "대표 프로젝트를 소개할게요." },
        { role: "user", content: "두 개 더 보여줘" },
      ]),
    ).toEqual(["profile", "development"]);
  });

  it("assistant가 언급한 섹션만으로 후속 질문 의도를 결정하지 않는다", () => {
    expect(
      selectProfileSections([
        { role: "user", content: "안녕하세요" },
        { role: "assistant", content: "개발 프로젝트도 소개할 수 있어요." },
        { role: "user", content: "그건 말고 다른 거 보여줘" },
      ]),
    ).toEqual([]);
  });
});

describe("selectChatIntentWithClassifier", () => {
  const messages = [
    { role: "user" as const, content: "오 시원한 바다 사진 어때?" },
    { role: "assistant" as const, content: "울릉군에서 촬영한 바다 풍경 사진들이 있어요." },
    { role: "user" as const, content: "오 울릉도 갔나보네, 그럼 독도도 있어?" },
  ];

  it("최근 대화의 암시된 사진 의도와 검색어를 LLM 분류 결과로 이어간다", async () => {
    const classifier = vi.fn().mockResolvedValue({
      sections: ["profile", "photography"],
      searchQuery: "독도 사진",
      searchKeywords: ["독도", "Dokdo"],
    });

    await expect(
      selectChatIntentWithClassifier(messages, new AbortController().signal, classifier),
    ).resolves.toEqual({
      sections: ["profile", "photography"],
      searchQuery: "독도 사진",
      searchKeywords: ["독도", "Dokdo"],
    });
    expect(classifier).toHaveBeenCalledWith(messages, expect.any(AbortSignal));
  });

  it.each(["안녕하세요", "안녕!", "hello", "???"])(
    "명백한 비조회 입력은 LLM 분류기를 호출하지 않는다: %s",
    async (content) => {
      const classifier = vi.fn().mockResolvedValue({
        sections: ["profile"],
        searchQuery: content,
        searchKeywords: [content],
      });

      await expect(
        selectChatIntentWithClassifier(
          [{ role: "user", content }],
          new AbortController().signal,
          classifier,
        ),
      ).resolves.toEqual({ sections: [] });
      expect(classifier).not.toHaveBeenCalled();
    },
  );

  it("인사 뒤에 질문이 이어지면 LLM 분류기에 전달한다", async () => {
    const messages = [{ role: "user" as const, content: "안녕, 이 사람은 뭐 하는 사람이야?" }];
    const classified = {
      sections: ["profile" as const],
      searchQuery: "이성준 소개",
      searchKeywords: ["이성준", "Sungjoon Lee"],
    };
    const classifier = vi.fn().mockResolvedValue(classified);

    await expect(
      selectChatIntentWithClassifier(messages, new AbortController().signal, classifier),
    ).resolves.toEqual(classified);
    expect(classifier).toHaveBeenCalledWith(messages, expect.any(AbortSignal));
  });

  it.each(["4242", "2024", "35"])("단독 숫자 입력은 LLM 분류기에 전달한다: %s", async (content) => {
    const messages = [{ role: "user" as const, content }];
    const classifier = vi.fn().mockResolvedValue({ sections: [] });

    await expect(
      selectChatIntentWithClassifier(messages, new AbortController().signal, classifier),
    ).resolves.toEqual({ sections: [] });
    expect(classifier).toHaveBeenCalledWith(messages, expect.any(AbortSignal));
  });

  it("대화 중 숫자 입력은 앞 문맥을 해석하도록 LLM 분류기에 전달한다", async () => {
    const conversation = [
      { role: "user" as const, content: "수상 연도를 알려줘" },
      { role: "assistant" as const, content: "어느 수상을 찾으시나요?" },
      { role: "user" as const, content: "2024" },
    ];
    const classified = {
      sections: ["profile", "music"] as const,
      searchQuery: "2024년 음악 수상",
      searchKeywords: ["2024", "수상"],
    };
    const classifier = vi.fn().mockResolvedValue(classified);

    await expect(
      selectChatIntentWithClassifier(conversation, new AbortController().signal, classifier),
    ).resolves.toEqual(classified);
    expect(classifier).toHaveBeenCalledWith(conversation, expect.any(AbortSignal));
  });

  it.each(["none", "failure"])("LLM %s 시 기존 정규식 결과로 폴백한다", async (mode) => {
    const directMessages = [{ role: "user" as const, content: "독도 사진 없어 정말?" }];
    const classifier =
      mode === "none"
        ? vi.fn().mockResolvedValue({ sections: [] })
        : vi.fn().mockRejectedValue(new Error("classifier unavailable"));

    await expect(
      selectChatIntentWithClassifier(directMessages, new AbortController().signal, classifier),
    ).resolves.toEqual({ sections: ["profile", "photography"] });
  });
});

describe("buildRagQueryText", () => {
  it("독립적인 질문은 그대로 검색어로 사용한다", () => {
    expect(buildRagQueryText([{ role: "user", content: "수상 경력을 알려줘" }])).toBe(
      "수상 경력을 알려줘",
    );
  });

  it("후속 질문은 직전 사용자 메시지를 이어붙여 맥락을 복원한다", () => {
    expect(
      buildRagQueryText([
        { role: "user", content: "개발 프로젝트를 알려줘" },
        { role: "assistant", content: "대표 프로젝트를 소개할게요." },
        { role: "user", content: "그건 언제 했어?" },
      ]),
    ).toBe("개발 프로젝트를 알려줘\n그건 언제 했어?");
  });
});
