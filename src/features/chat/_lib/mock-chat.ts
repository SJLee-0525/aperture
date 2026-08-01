import { devProjectRoute, ROUTES } from "@/constants/routes";
import { pickText } from "@/lib/i18n/pick-text";
import { MOCK_DEV_PROJECTS } from "@/mocks/dev";
import { MOCK_MUSIC_WORKS } from "@/mocks/music";
import { MOCK_PHOTOS } from "@/mocks/photos";
import type { ChatLink, ChatReference } from "@/types/chat";
import type { ImageMeta } from "@/types/image";
import type { Lang } from "@/types/lang";

type MockReply = {
  content: string;
  link?: ChatLink;
  references?: ChatReference[];
};

const preview = (image: ImageMeta | null) => {
  const source = image?.thumbnail ?? image?.preview ?? image;
  return source?.url ? { url: source.url, width: source.w, height: source.h } : null;
};

const mockReferences = (lang: Lang) => ({
  projects: MOCK_DEV_PROJECTS.slice(0, 2).map((project): ChatReference => ({
    type: "project",
    id: project.id,
    title: pickText(project.title, lang),
    subtitle: pickText(project.summary, lang),
    href: devProjectRoute(project.id),
    image: preview(project.cover),
  })),
  music: MOCK_MUSIC_WORKS.slice(0, 2).map((work): ChatReference => ({
    type: "music",
    id: work.id,
    title: pickText(work.title, lang),
    subtitle: pickText(work.venue, lang),
    href: `${ROUTES.MUSIC}?work=${encodeURIComponent(work.id)}`,
    image: preview(work.poster),
  })),
  photos: MOCK_PHOTOS.slice(0, 3).map((photo): ChatReference => ({
    type: "photo",
    id: photo.id,
    title: pickText(photo.title, lang),
    subtitle: pickText(photo.place, lang),
    href: `${ROUTES.PHOTO}?photo=${encodeURIComponent(photo.id)}`,
    image: preview(photo.image),
  })),
});

const REFERENCES = { ko: mockReferences("ko"), en: mockReferences("en") } as const;

const REPLIES: Record<Lang, { test: RegExp; reply: MockReply }[]> = {
  ko: [
    {
      test: /^(안녕|안녕하세요|반가워|하이|hello)[!?.\s]*$/i,
      reply: {
        content: "안녕하세요! 이성준의 사진, 음악, 개발 작업에 관해 궁금한 점을 물어보세요.",
      },
    },
    {
      test: /(?:사는 곳|거주|활동 지역).*(?:시간|몇 시)|(?:시간|몇 시).*(?:사는 곳|거주|활동 지역)/i,
      reply: {
        content:
          "공개된 포트폴리오에는 현재 거주 지역이 나와 있지 않아 정확한 현지 시간은 알 수 없어요. 궁금한 도시를 알려주시면 그 지역을 기준으로 안내해 드릴게요.",
      },
    },
    {
      test: /개발|프로젝트|react|프론트|코드/i,
      reply: {
        content:
          "웹과 모바일 제품을 설계하고 개발한 프로젝트를 정리해 두었어요. 프로젝트별 역할과 기술, 문제 해결 과정을 확인할 수 있습니다.",
        link: { href: "/dev/projects", label: "개발 프로젝트 보기" },
        references: REFERENCES.ko.projects,
      },
    },
    {
      test: /음악|피아노|연주|수상|공연/i,
      reply: {
        content:
          "피아노 연주와 음악 활동, 경력 및 수상 기록을 살펴볼 수 있어요. 먼저 음악 작업부터 둘러보세요.",
        link: { href: "/music", label: "음악 작업 보기" },
        references: REFERENCES.ko.music,
      },
    },
    {
      test: /사진|앨범|촬영|카메라/i,
      reply: {
        content:
          "장소와 시선에 따라 기록한 사진 작업을 모아 두었어요. 전체 작업과 앨범을 탐색할 수 있습니다.",
        link: { href: "/photo", label: "사진 작업 보기" },
        references: REFERENCES.ko.photos,
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
      test: /^(hello|hi|hey|good (?:morning|afternoon|evening))[!?.\s]*$/i,
      reply: {
        content: "Hello! Ask me anything about Sungjoon’s photography, music, or development work.",
      },
    },
    {
      test: /(?:live|residen|location).*(?:time|clock)|(?:time|clock).*(?:live|residen|location)/i,
      reply: {
        content:
          "The public portfolio does not include a current place of residence, so I can’t determine the local time accurately. Tell me a city and I can help with that location instead.",
      },
    },
    {
      test: /develop|project|react|front.?end|code/i,
      reply: {
        content:
          "You can explore web and mobile product work, including the role, technology, and problem-solving process behind each project.",
        link: { href: "/dev/projects", label: "View development projects" },
        references: REFERENCES.en.projects,
      },
    },
    {
      test: /music|piano|performance|award|concert/i,
      reply: {
        content:
          "Explore piano performances, music work, career highlights, and awards in the music section.",
        link: { href: "/music", label: "View music work" },
        references: REFERENCES.en.music,
      },
    },
    {
      test: /photo|album|camera|shoot/i,
      reply: {
        content:
          "The photography archive collects observations of places and moments. Browse individual work or curated albums.",
        link: { href: "/photo", label: "View photography" },
        references: REFERENCES.en.photos,
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
      "무엇을 찾고 계신지 조금만 더 알려주실래요? 사진, 음악, 개발 작업에 관한 질문이라면 함께 찾아볼게요.",
  },
  en: {
    content:
      "Could you tell me a little more about what you’re looking for? I can help you explore the photography, music, or development work.",
  },
};

const getMockReply = (question: string, lang: Lang): MockReply =>
  REPLIES[lang].find(({ test }) => test.test(question))?.reply ?? FALLBACK[lang];

export { getMockReply };
