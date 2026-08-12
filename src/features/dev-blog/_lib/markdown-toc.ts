import type { ArticleDocument } from "@/features/dev-blog/_lib/markdown-nodes";

type ArticleTocEntry = { id: string; text: string };

/**
 * h3 는 바로 앞 h2 아래에 들어간다. 앞선 h2 가 없는 h3 는 각자 최상위 항목이 된다 —
 * 서로 형제인 h3 를 먼저 나온 쪽 아래에 묶으면 원문에 없는 계층을 만들어 낸다.
 */
type ArticleTocItem = ArticleTocEntry & { children: ArticleTocEntry[] };

/**
 * 본문에서 목차를 만든다. `h2`, `h3` 만 쓰고 `h4` 는 넣지 않는다 —
 * 세 단계까지 늘리면 축소 인디케이터의 선 길이로 계층을 구분할 수 없다.
 *
 * id 는 여기서 새로 만들지 않고 정규화 단계가 붙인 값을 그대로 쓴다.
 * 목차·본문 heading·URL fragment 가 어긋나면 목차를 눌러도 엉뚱한 곳으로 간다.
 *
 * @param {ArticleDocument} document 정규화된 본문.
 * @returns {ArticleTocItem[]} 문서 순서를 유지한 두 단계 목차. heading 이 없으면 빈 배열.
 */
const buildArticleToc = (document: ArticleDocument): ArticleTocItem[] => {
  const items: ArticleTocItem[] = [];
  // 마지막 최상위 항목이 아니라 **마지막 h2** 를 들고 있어야 한다. `items.at(-1)` 을 쓰면
  // h2 없이 시작한 문서에서 두 번째 h3 가 첫 h3 의 자식이 되어, 문서에 없는 계층이 생긴다.
  let lastHeadingTwo: ArticleTocItem | null = null;

  document.blocks.forEach((block) => {
    if (block.type !== "heading" || block.depth > 3) return;
    const entry = { id: block.id, text: block.text };

    const parent = lastHeadingTwo;
    if (block.depth === 3 && parent) {
      parent.children.push(entry);
      return;
    }

    const item: ArticleTocItem = { ...entry, children: [] };
    items.push(item);
    // 앞선 h2 가 없는 h3 는 자기 자리를 만들어 최상위에 서되, 뒤따르는 h3 를 품지는 않는다.
    if (block.depth === 2) lastHeadingTwo = item;
  });

  return items;
};

export { buildArticleToc };
export type { ArticleTocItem };
