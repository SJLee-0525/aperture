import type { PhrasingContent, Root, RootContent } from "mdast";

import { normalizeCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";
import { resolveArticleDirective } from "@/features/dev-blog/_lib/markdown-directives";
import { createHeadingIdFactory } from "@/features/dev-blog/_lib/markdown-heading-id";
import type {
  ArticleBlock,
  ArticleDocument,
  ArticleInline,
  ArticleMarkdownIssue,
  ArticleMarkdownIssueCode,
  ArticleSourcePoint,
} from "@/features/dev-blog/_lib/markdown-nodes";
import {
  resolveArticleImageSource,
  resolveArticleLink,
} from "@/features/dev-blog/_lib/markdown-url-policy";

/** 본문 heading 의 허용 범위. 글 제목이 페이지 h1 이라 본문은 h2 부터 시작한다. */
const MIN_HEADING_DEPTH = 2;
const MAX_HEADING_DEPTH = 4;

type NormalizeContext = {
  issues: ArticleMarkdownIssue[];
  headingId: (text: string) => string;
};

/** 위치를 모르는 노드도 있어(합성 노드) 1:1 로 떨어뜨린다. */
const pointOf = (node: { position?: { start: { line: number; column: number } } }) =>
  ({
    line: node.position?.start.line ?? 1,
    column: node.position?.start.column ?? 1,
  }) satisfies ArticleSourcePoint;

const report = (
  context: NormalizeContext,
  code: ArticleMarkdownIssueCode,
  node: Parameters<typeof pointOf>[0],
  detail?: string,
) => {
  context.issues.push({ code, point: pointOf(node), ...(detail ? { detail } : {}) });
};

/** heading 라벨과 지시자 인자를 읽기 위한 평문화. 서식은 버리고 글자만 잇는다. */
const toPlainText = (nodes: PhrasingContent[]): string =>
  nodes
    .map((node) => {
      if (node.type === "text" || node.type === "inlineCode") return node.value;
      return "children" in node ? toPlainText(node.children) : "";
    })
    .join("");

/**
 * 인라인 노드를 허용 목록으로 옮긴다.
 *
 * 허용하지 않은 링크는 링크만 벗기고 글자는 남긴다 — 문장 한가운데가 통째로 사라지면
 * 관리자가 원문의 어디를 고쳐야 하는지 미리보기에서 알아보기 어렵다.
 *
 * @param {PhrasingContent[]} nodes mdast 인라인 노드.
 * @param {NormalizeContext} context issue 수집기.
 * @returns {ArticleInline[]} 렌더 가능한 인라인 노드.
 */
const toInlines = (nodes: PhrasingContent[], context: NormalizeContext): ArticleInline[] =>
  nodes.flatMap((node): ArticleInline[] => {
    switch (node.type) {
      case "text":
        return [{ type: "text", value: node.value }];
      case "strong":
        return [{ type: "strong", children: toInlines(node.children, context) }];
      case "emphasis":
        return [{ type: "emphasis", children: toInlines(node.children, context) }];
      case "inlineCode":
        return [{ type: "inlineCode", value: node.value }];
      case "break":
        return [{ type: "break" }];
      case "link": {
        const link = resolveArticleLink(node.url);
        if (!link) {
          report(context, "link-not-allowed", node, node.url);
          return toInlines(node.children, context);
        }
        return [{ ...link, type: "link", children: toInlines(node.children, context) }];
      }
      case "image":
        report(context, "inline-image", node, node.url);
        return [];
      default:
        report(context, "unsupported-node", node, node.type);
        return [];
    }
  });

/**
 * 문단이 이미지 하나만 담고 있는지 본다.
 * Markdown 에서 이미지 한 줄은 문단으로 감싸이므로, 이 모양일 때만 이미지 블록으로 승격한다.
 *
 * @param {PhrasingContent[]} children 문단의 자식.
 * @returns {PhrasingContent | null} 단독 이미지 노드, 아니면 null.
 */
const standaloneImage = (children: PhrasingContent[]): PhrasingContent | null => {
  const meaningful = children.filter((node) => !(node.type === "text" && !node.value.trim()));
  const [first] = meaningful;
  return meaningful.length === 1 && first?.type === "image" ? first : null;
};

/**
 * `::caption` 을 바로 앞 이미지에 붙인다.
 *
 * @param {ArticleBlock[]} blocks 지금까지 만든 블록.
 * @param {string} text 캡션 평문.
 * @returns {boolean} 붙였으면 true, 앞이 이미지가 아니면 false.
 */
const attachCaption = (blocks: ArticleBlock[], text: string): boolean => {
  const previous = blocks.at(-1);
  if (previous?.type !== "image" || previous.caption !== null) return false;
  previous.caption = text;
  return true;
};

const toBlocks = (nodes: RootContent[], context: NormalizeContext): ArticleBlock[] => {
  const blocks: ArticleBlock[] = [];

  nodes.forEach((node) => {
    switch (node.type) {
      case "heading": {
        // 허용 범위를 벗어난 제목은 가장 가까운 깊이로 당겨 렌더하고 issue 로 남긴다.
        // 통째로 버리면 미리보기에서 문장이 사라져 무엇을 고쳐야 하는지 보이지 않는다.
        if (node.depth < MIN_HEADING_DEPTH || node.depth > MAX_HEADING_DEPTH) {
          report(context, "heading-level", node, `h${node.depth}`);
        }
        const depth = Math.min(Math.max(node.depth, MIN_HEADING_DEPTH), MAX_HEADING_DEPTH) as
          2 | 3 | 4;
        const text = toPlainText(node.children);
        blocks.push({
          type: "heading",
          depth,
          id: context.headingId(text),
          text,
          children: toInlines(node.children, context),
        });
        return;
      }

      case "paragraph": {
        const image = standaloneImage(node.children);
        if (image?.type === "image") {
          const src = resolveArticleImageSource(image.url);
          if (!src) {
            report(context, "image-source-not-allowed", image, image.url);
            return;
          }
          const alt = (image.alt ?? "").trim();
          if (!alt) report(context, "image-alt-missing", image, image.url);
          blocks.push({ type: "image", src, alt, caption: null });
          return;
        }
        const children = toInlines(node.children, context);
        if (children.length > 0) blocks.push({ type: "paragraph", children });
        return;
      }

      case "list":
        blocks.push({
          type: "list",
          ordered: node.ordered ?? false,
          items: node.children.map((item) => ({ children: toBlocks(item.children, context) })),
        });
        return;

      case "blockquote":
        blocks.push({ type: "blockquote", children: toBlocks(node.children, context) });
        return;

      case "thematicBreak":
        blocks.push({ type: "thematicBreak" });
        return;

      case "code": {
        const rawLanguage = (node.lang ?? "").trim();
        blocks.push({
          type: "code",
          language: normalizeCodeLanguage(rawLanguage),
          rawLanguage,
          value: node.value,
        });
        return;
      }

      case "table": {
        const [header, ...rows] = node.children;
        if (!header) return;
        blocks.push({
          type: "table",
          align: [...(node.align ?? [])],
          header: header.children.map((cell) => toInlines(cell.children, context)),
          rows: rows.map((row) => row.children.map((cell) => toInlines(cell.children, context))),
        });
        return;
      }

      case "leafDirective": {
        const result = resolveArticleDirective(
          node.name,
          toPlainText(node.children),
          node.attributes ?? {},
        );
        if (result.kind === "issue") {
          report(context, result.code, node, result.detail);
          return;
        }
        if (result.kind === "caption") {
          if (!attachCaption(blocks, result.text)) report(context, "caption-without-image", node);
          return;
        }
        blocks.push({
          type: "youtube",
          videoId: result.videoId,
          title: result.title,
          source: result.source,
        });
        return;
      }

      default:
        report(context, "unsupported-node", node, node.type);
    }
  });

  return blocks;
};

/**
 * mdast 트리를 렌더 계약(`markdown-nodes`)으로 옮긴다.
 *
 * mdast 가 이 함수 밖으로 나가지 않는 것이 이 모듈의 존재 이유다. 화면은 여기서 만든
 * 노드만 보므로, 허용 목록에 없는 요소는 렌더 대상이 될 수 없고 발행을 막는 issue 로만 남는다.
 * heading id 는 문서마다 새로 발급해 목차·본문·URL fragment 가 같은 값을 쓰게 한다.
 *
 * @param {Root} root `mdast-util-from-markdown` 이 만든 트리.
 * @returns {{ document: ArticleDocument; issues: ArticleMarkdownIssue[] }} 렌더 트리와 발행 차단 사유.
 */
const normalizeArticleTree = (
  root: Root,
): { document: ArticleDocument; issues: ArticleMarkdownIssue[] } => {
  const context: NormalizeContext = { issues: [], headingId: createHeadingIdFactory() };
  const blocks = toBlocks(root.children, context);
  return { document: { blocks }, issues: context.issues };
};

export { normalizeArticleTree };
