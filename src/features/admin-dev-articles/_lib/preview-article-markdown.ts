"use server";

import { highlightArticleDocument } from "@/features/dev-blog/_lib/markdown-highlight";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

import { isTestAdminSessionEnabled } from "@/lib/auth/test-admin-session";
import { verifyAdminIdToken } from "@/lib/auth/verify-admin-id-token";

import type { ArticleCodeHighlights } from "@/features/dev-blog/_lib/markdown-highlight-map";
import type {
  ArticleDocument,
  ArticleMarkdownIssue,
} from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 미리보기가 한 번에 처리할 본문 길이 상한. 색칠은 문법 하나당 wasm 을 돌리므로 비용이
 * 본문 길이를 따라 늘어난다. 글 하나가 이 길이를 넘을 일이 없고, 넘으면 요청이 잘못된 것이다.
 */
const PREVIEW_MAX_BODY_LENGTH = 200_000;

/** 미리보기 결과. 전부 JSON 으로 옮길 수 있는 값이라 브라우저가 그대로 렌더한다. */
type ArticlePreviewResult = {
  document: ArticleDocument;
  issues: ArticleMarkdownIssue[];
  highlights: ArticleCodeHighlights;
};

/**
 * 저장 전 본문을 서버 renderer 로 돌려 본다.
 *
 * 공개 상세와 같은 파서·색칠기를 쓰는 것이 요점이다. 브라우저에 문법 번들을 복제하지 않고
 * (계획 §5), 미리보기에서 통과한 본문이 공개 화면에서 다르게 보이는 일도 없다.
 * 결과는 저장하지 않는다 — 저장은 관리자가 `저장` 을 눌렀을 때만 일어난다.
 *
 * 관리자만 호출할 수 있게 막는다. 렌더 결과에 비공개 데이터가 담기지는 않지만, 공개 호출자가
 * 임의의 긴 본문으로 색칠을 반복시키는 비용 공격을 막아야 한다.
 *
 * @param {string} idToken 브라우저가 보낸 Firebase ID token.
 * @param {string} markdown 저장 전 본문 원문.
 * @returns {Promise<ArticlePreviewResult>} 렌더 트리·검증 결과·색칠 결과.
 * @throws {Error} 관리자가 아니거나 본문이 상한을 넘을 때.
 */
const previewArticleMarkdown = async (
  idToken: string,
  markdown: string,
): Promise<ArticlePreviewResult> => {
  const allowed = isTestAdminSessionEnabled() || (await verifyAdminIdToken(idToken));
  if (!allowed) throw new Error("Unauthorized article preview");
  if (markdown.length > PREVIEW_MAX_BODY_LENGTH) {
    throw new Error("본문이 너무 깁니다. 글을 나눠 주세요.");
  }

  const { document, issues } = parseArticleMarkdown(markdown);
  return { document, issues, highlights: await highlightArticleDocument(document) };
};

export { previewArticleMarkdown };
export type { ArticlePreviewResult };
