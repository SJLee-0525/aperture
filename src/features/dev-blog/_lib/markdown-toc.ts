import type { ArticleDocument } from "@/features/dev-blog/_lib/markdown-nodes";

type ArticleTocEntry = { id: string; text: string };

/** h3 는 바로 앞 h2 아래에 들어간다. h2 보다 먼저 나온 h3 는 자기 자리를 만들어 최상위에 둔다. */
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

  document.blocks.forEach((block) => {
    if (block.type !== "heading" || block.depth > 3) return;
    const entry = { id: block.id, text: block.text };

    const parent = items.at(-1);
    if (block.depth === 3 && parent) parent.children.push(entry);
    else items.push({ ...entry, children: [] });
  });

  return items;
};

export { buildArticleToc };
