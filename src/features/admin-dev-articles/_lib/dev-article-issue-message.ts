import type { DevArticlePublishIssue } from "@/features/admin-dev-articles/_lib/dev-article-publish-check";
import type { ArticleMarkdownIssue } from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 발행을 막는 사유의 한국어 문구 단일 출처.
 *
 * Markdown 검증은 결과를 코드로만 돌려준다. 미리보기 패널과 발행 버튼 안내가 같은
 * 문장을 써야 해서 문구는 여기 한 곳에 모은다.
 * 관리자 화면은 한국어 전용이라 사전(ko/en)을 거치지 않는다 — 기존 `/admin/*` 화면과 같다.
 *
 * 각 문장은 무엇이 잘못됐는지와 무엇을 하면 되는지를 함께 적는다. 원인만 적으면
 * 발행 버튼 앞에서 다음 행동을 다시 찾아야 한다.
 */
const MARKDOWN_ISSUE_MESSAGES = {
  "unsupported-node": "지원하지 않는 문법입니다. 지원 범위는 Markdown 도움말을 보세요.",
  "heading-level": "본문 제목은 ##~#### 만 씁니다. 글 제목이 이미 페이지의 첫 제목입니다.",
  "inline-image": "이미지는 문장 안이 아니라 빈 줄로 띄운 한 줄에 두세요.",
  "image-alt-missing": "이미지에 대체 텍스트를 넣으세요. `![설명](주소)` 형식입니다.",
  "image-source-not-allowed": "허용하지 않은 이미지 주소입니다. 편집기의 이미지 버튼으로 올리세요.",
  "link-not-allowed": "링크는 https 주소, 메일 주소, 사이트 내부 경로만 넣을 수 있습니다.",
  "caption-without-image": "캡션 바로 앞 줄에 이미지가 없습니다. 이미지 다음 줄로 옮기세요.",
  "caption-duplicated": "앞 이미지에 캡션이 이미 붙어 있습니다. 남길 한 줄만 두세요.",
  "caption-empty": "캡션 내용이 비어 있습니다. 설명을 넣거나 줄을 지우세요.",
  "youtube-url-invalid":
    "영상 주소에서 ID를 찾지 못했습니다. youtube.com 또는 youtu.be 주소를 넣으세요.",
  "youtube-title-missing": "영상 제목을 넣으세요. 화면 낭독기가 읽을 이름입니다.",
  "unknown-directive": "모르는 전용 문법입니다. `::caption` 과 `::youtube` 만 씁니다.",
  "reference-not-supported": "참조 링크는 쓸 수 없습니다. 주소를 `[글자](주소)` 로 직접 넣으세요.",
  "nesting-too-deep": "인용·목록·강조가 너무 깊게 겹쳤습니다. 겹친 단계를 줄이세요.",
} as const satisfies Record<ArticleMarkdownIssue["code"], string>;

const PUBLISH_ISSUE_MESSAGES = {
  "title-missing": "한국어와 영어 제목을 모두 입력하세요.",
  "summary-missing": "한국어와 영어 요약을 모두 입력하세요.",
  "slug-missing": "주소(slug)를 입력하세요. 영문·숫자·하이픈만 남습니다.",
  "slug-duplicated": "다른 글이 이미 쓰는 주소입니다. 다른 값으로 바꾸세요.",
  "body-missing": "본문을 입력하세요.",
  "published-at-missing": "발행일을 지정하세요. 목록 정렬 기준입니다.",
  "cover-alt-missing": "대표 이미지의 대체 텍스트를 한국어와 영어로 입력하세요.",
  "markdown-blocked": "본문에 고쳐야 할 곳이 있습니다. 미리보기에서 위치를 확인하세요.",
  "tag-unknown": "사전에 없는 태그입니다. 목록에서 다시 고르세요.",
  "related-project-unavailable":
    "공개할 수 없는 프로젝트입니다. 연관에서 빼거나 프로젝트를 공개하세요.",
} as const satisfies Record<DevArticlePublishIssue["code"], string>;

/**
 * Markdown 검증 결과 한 건을 원문 위치와 함께 읽을 수 있는 문장으로 만든다.
 *
 * @param {ArticleMarkdownIssue} issue 검증 결과.
 * @returns {string} `12번째 줄 — …` 형태의 안내. detail 이 있으면 괄호로 덧붙인다.
 */
const markdownIssueMessage = (issue: ArticleMarkdownIssue): string => {
  const detail = issue.detail ? ` (${issue.detail})` : "";
  return `${issue.point.line}번째 줄 — ${MARKDOWN_ISSUE_MESSAGES[issue.code]}${detail}`;
};

/**
 * 발행 조건 한 건을 문장으로 만든다.
 *
 * @param {DevArticlePublishIssue} issue 발행 조건 검사 결과.
 * @returns {string} 안내 문장. detail 이 있으면 괄호로 덧붙인다.
 */
const publishIssueMessage = (issue: DevArticlePublishIssue): string =>
  `${PUBLISH_ISSUE_MESSAGES[issue.code]}${issue.detail ? ` (${issue.detail})` : ""}`;

export { markdownIssueMessage, publishIssueMessage };
