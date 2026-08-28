import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 블로그 태그 사전 mock — Supabase 미설정(로컬 dev·자동화 테스트)에서만 폴백으로 쓴다.
 * 실운영 사전은 관리자 CMS 가 `devArticleTags` 컬렉션에 기록한다.
 *
 * 기술명은 번역 대상이 아니라 ko·en 이 같고, 서술형 태그만 언어별 라벨을 갖는다.
 * 순서 계약은 id 사전순이다 — live 가 문서 ID(`__name__`) 오름차순으로 읽으므로
 * mock 배열도 같은 순서로 두어 두 소스의 화면 순서를 일치시킨다.
 */
const MOCK_DEV_ARTICLE_TAGS: DevArticleTag[] = [
  { id: "accessibility", ko: "접근성", en: "Accessibility" },
  { id: "architecture", ko: "아키텍처", en: "Architecture" },
  { id: "css", ko: "CSS", en: "CSS" },
  { id: "firebase", ko: "Firebase", en: "Firebase" },
  { id: "nextjs", ko: "Next.js", en: "Next.js" },
  { id: "retrospective", ko: "회고", en: "Retrospective" },
  { id: "testing", ko: "테스트", en: "Testing" },
  { id: "typescript", ko: "TypeScript", en: "TypeScript" },
];

export { MOCK_DEV_ARTICLE_TAGS };
