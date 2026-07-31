import type { Lang } from "@/types/lang";
import type { ChatLink, ChatMessage } from "@/types/chat";

type MockReply = {
  content: string;
  link?: ChatLink;
};

const INITIAL_MESSAGE: Record<Lang, string> = {
  ko: "안녕하세요. 사진, 음악, 개발 작업에 관해 무엇이든 물어보세요.",
  en: "Hello. Ask me anything about the photography, music, or development work.",
};

const REPLIES: Record<Lang, { test: RegExp; reply: MockReply }[]> = {
  ko: [
    {
      test: /개발|프로젝트|react|프론트|코드/i,
      reply: {
        content:
          "웹과 모바일 제품을 설계하고 개발한 프로젝트를 정리해 두었어요. 프로젝트별 역할과 기술, 문제 해결 과정을 확인할 수 있습니다.",
        link: { href: "/dev/projects", label: "개발 프로젝트 보기" },
      },
    },
    {
      test: /음악|피아노|연주|수상|공연/i,
      reply: {
        content:
          "피아노 연주와 음악 활동, 경력 및 수상 기록을 살펴볼 수 있어요. 먼저 음악 작업부터 둘러보세요.",
        link: { href: "/music", label: "음악 작업 보기" },
      },
    },
    {
      test: /사진|앨범|촬영|카메라/i,
      reply: {
        content:
          "장소와 시선에 따라 기록한 사진 작업을 모아 두었어요. 전체 작업과 앨범을 탐색할 수 있습니다.",
        link: { href: "/photo", label: "사진 작업 보기" },
      },
    },
    {
      test: /연락|문의|메일|이메일/i,
      reply: {
        content: "협업이나 작업 문의는 연락 페이지에서 메시지를 남겨 주세요.",
        link: { href: "/contact", label: "문의하기" },
      },
    },
  ],
  en: [
    {
      test: /develop|project|react|front.?end|code/i,
      reply: {
        content:
          "You can explore web and mobile product work, including the role, technology, and problem-solving process behind each project.",
        link: { href: "/dev/projects", label: "View development projects" },
      },
    },
    {
      test: /music|piano|performance|award|concert/i,
      reply: {
        content:
          "Explore piano performances, music work, career highlights, and awards in the music section.",
        link: { href: "/music", label: "View music work" },
      },
    },
    {
      test: /photo|album|camera|shoot/i,
      reply: {
        content:
          "The photography archive collects observations of places and moments. Browse individual work or curated albums.",
        link: { href: "/photo", label: "View photography" },
      },
    },
    {
      test: /contact|email|message|collaborat/i,
      reply: {
        content: "For collaborations or project inquiries, leave a message on the contact page.",
        link: { href: "/contact", label: "Get in touch" },
      },
    },
  ],
};

const FALLBACK: Record<Lang, MockReply> = {
  ko: {
    content:
      "현재는 목데이터로 답변하고 있어 정확한 내용을 찾지 못했어요. 사진, 음악, 개발 프로젝트 또는 연락 방법을 물어보세요.",
  },
  en: {
    content:
      "This prototype currently uses mock responses. Try asking about photography, music, development projects, or contact details.",
  },
};

const createInitialMessage = (lang: Lang): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  content: INITIAL_MESSAGE[lang],
});

const getMockReply = (question: string, lang: Lang): MockReply =>
  REPLIES[lang].find(({ test }) => test.test(question))?.reply ?? FALLBACK[lang];

export { createInitialMessage, getMockReply };
