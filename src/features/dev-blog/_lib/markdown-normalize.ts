import { normalizeCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";
import { resolveArticleDirective } from "@/features/dev-blog/_lib/markdown-directives";
import { createHeadingIdFactory } from "@/features/dev-blog/_lib/markdown-heading-id";
import {
  resolveArticleImageSource,
  resolveArticleLink,
} from "@/features/dev-blog/_lib/markdown-url-policy";

import type {
  ArticleBlock,
  ArticleDocument,
  ArticleInline,
  ArticleMarkdownIssue,
  ArticleMarkdownIssueCode,
  ArticleSourcePoint,
} from "@/features/dev-blog/_lib/markdown-nodes";
import type { PhrasingContent, Root, RootContent } from "mdast";

/** 본문 heading 의 허용 범위. 글 제목이 페이지 h1 이라 본문은 h2 부터 시작한다. */
const MIN_HEADING_DEPTH = 2;
const MAX_HEADING_DEPTH = 4;

/**
 * 중첩을 따라 들어갈 수 있는 최대 단계.
 *
 * 이 트리는 재귀로 훑으므로 깊이가 곧 호출 스택 깊이다. 상한이 없으면 `">".repeat(2000)`
 * 정도의 2KB 입력이 `RangeError` 를 내고, 그 예외를 잡는 곳이 없어 공개 지면 생성이 통째로
 * 멈춘다. 사람이 쓴 글은 인용·목록을 겹쳐도 열 단계를 넘기지 않아 32 는 넉넉한 여유다.
 */
const MAX_NESTING_DEPTH = 32;

type NormalizeContext = {
  issues: ArticleMarkdownIssue[];
  headingId: (text: string) => string;
  /** 깊이 초과는 문서마다 한 번만 알린다. 넘어선 지점마다 쌓으면 목록이 같은 사유로 뒤덮인다. */
  depthReported: boolean;
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

/**
 * 깊이 상한을 넘었는지 본다. 넘었으면 문서에서 처음 한 번만 issue 로 남긴다.
 *
 * @param {NormalizeContext} context issue 수집기.
 * @param {Parameters<typeof pointOf>[0]} node 상한을 넘어선 지점의 노드.
 * @param {number} depth 지금 들어와 있는 단계.
 * @returns {boolean} 상한을 넘었으면 true — 호출부는 더 내려가지 않는다.
 */
const exceedsDepth = (
  context: NormalizeContext,
  node: Parameters<typeof pointOf>[0],
  depth: number,
): boolean => {
  if (depth <= MAX_NESTING_DEPTH) return false;
  if (!context.depthReported) {
    context.depthReported = true;
    report(context, "nesting-too-deep", node, `${MAX_NESTING_DEPTH}단계`);
  }
  return true;
};

/**
 * heading 라벨과 지시자 인자를 읽기 위한 평문화. 서식은 버리고 글자만 잇는다.
 *
 * 블록·인라인과 같은 깊이 계약을 쓴다. 이 경로에도 중첩이 들어오기 때문이다 —
 * 제목 안의 강조, 지시자 인자 안의 링크가 모두 여기로 내려온다.
 *
 * @param {PhrasingContent[]} nodes 평문으로 바꿀 인라인 노드.
 * @param {NormalizeContext} context issue 수집기.
 * @param {number} depth 지금 들어와 있는 단계.
 * @returns {string} 서식을 뗀 글자. 상한을 넘은 가지는 빈 문자열이 된다.
 */
const toPlainText = (nodes: PhrasingContent[], context: NormalizeContext, depth: number): string =>
  nodes
    .map((node) => {
      if (node.type === "text" || node.type === "inlineCode") return node.value;
      if (!("children" in node)) return "";
      if (exceedsDepth(context, node, depth + 1)) return "";
      return toPlainText(node.children, context, depth + 1);
    })
    .join("");

/**
 * 인라인 노드를 허용 목록으로 옮긴다.
 *
 * 허용하지 않은 링크는 링크만 벗기고 글자는 남긴다 — 문장 한가운데가 통째로 사라지면
 * 관리자가 원문의 어디를 고쳐야 하는지 미리보기에서 알아보기 어렵다.
 *
 * 참조 문법(`[글자][라벨]`)도 같은 규칙을 따른다. 주소는 버리되 글자는 남긴다.
 *
 * @param {PhrasingContent[]} nodes mdast 인라인 노드.
 * @param {NormalizeContext} context issue 수집기.
 * @param {number} depth 지금 들어와 있는 단계. 자식으로 내려갈 때만 오른다.
 * @returns {ArticleInline[]} 렌더 가능한 인라인 노드.
 */
const toInlines = (
  nodes: PhrasingContent[],
  context: NormalizeContext,
  depth: number,
): ArticleInline[] =>
  nodes.flatMap((node): ArticleInline[] => {
    switch (node.type) {
      case "text":
        return [{ type: "text", value: node.value }];
      case "strong":
        return exceedsDepth(context, node, depth + 1)
          ? []
          : [{ type: "strong", children: toInlines(node.children, context, depth + 1) }];
      case "emphasis":
        return exceedsDepth(context, node, depth + 1)
          ? []
          : [{ type: "emphasis", children: toInlines(node.children, context, depth + 1) }];
      case "inlineCode":
        return [{ type: "inlineCode", value: node.value }];
      case "break":
        return [{ type: "break" }];
      case "link": {
        if (exceedsDepth(context, node, depth + 1)) return [];
        const link = resolveArticleLink(node.url);
        if (!link) {
          report(context, "link-not-allowed", node, node.url);
          return toInlines(node.children, context, depth + 1);
        }
        return [{ ...link, type: "link", children: toInlines(node.children, context, depth + 1) }];
      }
      case "linkReference":
        report(context, "reference-not-supported", node, node.label ?? node.identifier);
        return exceedsDepth(context, node, depth + 1)
          ? []
          : toInlines(node.children, context, depth + 1);
      case "imageReference":
        // 이미지는 주소가 정해져야 뜻이 생긴다. 글자만 남겨 봐야 문장에 섞인 라벨이 될 뿐이다.
        report(context, "reference-not-supported", node, node.label ?? node.identifier);
        return [];
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

/** `::caption` 을 붙이려다 만난 상황. 실패 사유가 둘이라 boolean 으로는 구분할 수 없다. */
type CaptionAttachment = "attached" | "no-image" | "already-captioned";

/**
 * `::caption` 을 바로 앞 이미지에 붙인다.
 *
 * 실패를 두 갈래로 나눠 돌려준다. 둘을 뭉뚱그리면 이미지에 캡션을 두 번 단 글에도
 * "앞에 이미지가 없다" 는 사실과 다른 사유가 붙고, 그 문장을 보고는 고칠 데를 찾을 수 없다.
 *
 * @param {ArticleBlock[]} blocks 지금까지 만든 블록.
 * @param {string} text 캡션 평문.
 * @returns {CaptionAttachment} 붙였으면 `attached`, 아니면 실패 사유.
 */
const attachCaption = (blocks: ArticleBlock[], text: string): CaptionAttachment => {
  const previous = blocks.at(-1);
  if (previous?.type !== "image") return "no-image";
  if (previous.caption !== null) return "already-captioned";
  previous.caption = text;
  return "attached";
};

/**
 * 블록 노드를 허용 목록으로 옮긴다.
 *
 * @param {RootContent[]} nodes mdast 블록 노드.
 * @param {NormalizeContext} context issue 수집기.
 * @param {number} depth 지금 들어와 있는 단계. 목록 항목과 인용 안으로 내려갈 때만 오른다.
 * @returns {ArticleBlock[]} 렌더 가능한 블록.
 */
const toBlocks = (
  nodes: RootContent[],
  context: NormalizeContext,
  depth: number,
): ArticleBlock[] => {
  const blocks: ArticleBlock[] = [];

  nodes.forEach((node) => {
    switch (node.type) {
      case "heading": {
        // 허용 범위를 벗어난 제목은 가장 가까운 깊이로 당겨 렌더하고 issue 로 남긴다.
        // 통째로 버리면 미리보기에서 문장이 사라져 무엇을 고쳐야 하는지 보이지 않는다.
        if (node.depth < MIN_HEADING_DEPTH || node.depth > MAX_HEADING_DEPTH) {
          report(context, "heading-level", node, `h${node.depth}`);
        }
        const headingDepth = Math.min(
          Math.max(node.depth, MIN_HEADING_DEPTH),
          MAX_HEADING_DEPTH,
        ) as 2 | 3 | 4;
        const text = toPlainText(node.children, context, depth + 1);
        blocks.push({
          type: "heading",
          depth: headingDepth,
          id: context.headingId(text),
          text,
          children: toInlines(node.children, context, depth + 1),
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
        const children = toInlines(node.children, context, depth + 1);
        if (children.length > 0) blocks.push({ type: "paragraph", children });
        return;
      }

      case "list": {
        if (exceedsDepth(context, node, depth + 1)) return;
        blocks.push({
          type: "list",
          ordered: node.ordered ?? false,
          items: node.children.map((item) => ({
            children: toBlocks(item.children, context, depth + 1),
          })),
        });
        return;
      }

      case "blockquote":
        if (exceedsDepth(context, node, depth + 1)) return;
        blocks.push({ type: "blockquote", children: toBlocks(node.children, context, depth + 1) });
        return;

      case "definition":
        // 참조 정의 줄. 화면에 남는 것은 없지만 사유를 알려야 본문의 `[글자][라벨]` 과 함께 고친다.
        report(context, "reference-not-supported", node, node.label ?? node.identifier);
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
          header: header.children.map((cell) => toInlines(cell.children, context, depth + 1)),
          rows: rows.map((row) =>
            row.children.map((cell) => toInlines(cell.children, context, depth + 1)),
          ),
        });
        return;
      }

      case "leafDirective": {
        const result = resolveArticleDirective(
          node.name,
          toPlainText(node.children, context, depth + 1),
          node.attributes ?? {},
        );
        if (result.kind === "issue") {
          report(context, result.code, node, result.detail);
          return;
        }
        if (result.kind === "caption") {
          const attachment = attachCaption(blocks, result.text);
          if (attachment === "no-image") report(context, "caption-without-image", node);
          else if (attachment === "already-captioned") report(context, "caption-duplicated", node);
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
  const context: NormalizeContext = {
    issues: [],
    headingId: createHeadingIdFactory(),
    depthReported: false,
  };
  const blocks = toBlocks(root.children, context, 0);
  return { document: { blocks }, issues: context.issues };
};

export { normalizeArticleTree };
