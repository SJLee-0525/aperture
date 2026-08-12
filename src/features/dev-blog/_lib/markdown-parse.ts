import { directiveFromMarkdown } from "mdast-util-directive";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { directive } from "micromark-extension-directive";
import { gfmTable } from "micromark-extension-gfm-table";

import { normalizeArticleTree } from "@/features/dev-blog/_lib/markdown-normalize";
import type {
  ArticleDocument,
  ArticleMarkdownIssue,
} from "@/features/dev-blog/_lib/markdown-nodes";

/**
 * 문법 확장은 여기서만 구성한다.
 *
 * GFM 중 표만 넣는다. 취소선·작업 목록·각주·자동 링크는 본문 계약에 없고,
 * 켜 두면 관리자 도움말에 적힌 것보다 넓은 문법이 조용히 통과한다.
 * directive 는 `::caption` 과 `::youtube` 두 전용 문법의 문법적 기반이다.
 */
const MICROMARK_EXTENSIONS = [gfmTable(), directive()];
const MDAST_EXTENSIONS = [gfmTableFromMarkdown(), directiveFromMarkdown()];

type ArticleParseResult = {
  document: ArticleDocument;
  /** 비어 있지 않으면 발행을 막는다. 초안 저장은 issue 가 있어도 허용한다. */
  issues: ArticleMarkdownIssue[];
};

/**
 * 한국어 Markdown 본문을 렌더 트리로 바꾼다. 공개 상세와 관리자 미리보기의 공통 진입점이다.
 *
 * 중간 산출물인 mdast 는 밖으로 내보내지 않는다 — 화면에 닿는 것은 허용 목록을 통과한
 * 노드뿐이라는 보장이 이 계약의 핵심이고, 그래서 HTML 문자열 단계도 sanitizer 도 없다.
 * 순수 함수라 같은 입력에는 항상 같은 결과가 나오며 코드 색칠은 여기서 하지 않는다
 * (문법 데이터를 클라이언트로 보내지 않으려고 서버 전용 단계로 분리했다).
 *
 * @param {string} markdown 관리자가 저장한 한국어 원문.
 * @returns {ArticleParseResult} 렌더 트리와 발행을 막을 사유 목록.
 */
const parseArticleMarkdown = (markdown: string): ArticleParseResult =>
  normalizeArticleTree(
    fromMarkdown(markdown, {
      extensions: MICROMARK_EXTENSIONS,
      mdastExtensions: MDAST_EXTENSIONS,
    }),
  );

export { parseArticleMarkdown };
