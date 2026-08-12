import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 블로그 태그 사전 mock — Firebase 미설정(로컬 dev·자동화 테스트)에서만 폴백으로 쓴다.
 * 실운영 사전은 B5 에서 관리자 CMS 가 별도 컬렉션에 기록한다.
 *
 * 기술명은 번역 대상이 아니라 ko·en 이 같고, 서술형 태그만 언어별 라벨을 갖는다.
 */
const MOCK_DEV_ARTICLE_TAGS: DevArticleTag[] = [
  { id: "nextjs", ko: "Next.js", en: "Next.js" },
  { id: "typescript", ko: "TypeScript", en: "TypeScript" },
  { id: "firebase", ko: "Firebase", en: "Firebase" },
  { id: "css", ko: "CSS", en: "CSS" },
  { id: "architecture", ko: "아키텍처", en: "Architecture" },
  { id: "testing", ko: "테스트", en: "Testing" },
  { id: "accessibility", ko: "접근성", en: "Accessibility" },
  { id: "retrospective", ko: "회고", en: "Retrospective" },
];

export { MOCK_DEV_ARTICLE_TAGS };
