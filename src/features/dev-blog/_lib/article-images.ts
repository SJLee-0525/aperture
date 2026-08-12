import type { ArticleBlock, ArticleDocument } from "@/features/dev-blog/_lib/markdown-nodes";

/** 본문 이미지 한 장 — 라이트박스가 순회하는 단위. */
type ArticleImageRef = { src: string; alt: string };

/**
 * 블록을 훑어 이미지를 문서 순서로 모은다. 목록·인용 안에 들어간 이미지도 빠뜨리지 않는다.
 *
 * @param {readonly ArticleBlock[]} blocks 훑을 블록.
 * @param {ArticleImageRef[]} found 채울 결과.
 * @returns {void}
 */
const collect = (blocks: readonly ArticleBlock[], found: ArticleImageRef[]): void => {
  blocks.forEach((block) => {
    if (block.type === "image") {
      found.push({ src: block.src, alt: block.alt });
      return;
    }
    if (block.type === "blockquote") collect(block.children, found);
    if (block.type === "list") block.items.forEach((item) => collect(item.children, found));
  });
};

/**
 * 본문에 실린 이미지를 문서 순서로 모은다.
 *
 * 라이트박스가 앞뒤로 넘길 목록이자 인덱스의 출처다. 순서가 화면에 보이는 순서와 같아야
 * `›` 를 눌렀을 때 아래에 있던 이미지가 나온다.
 *
 * @param {ArticleDocument} document 정규화된 본문.
 * @returns {ArticleImageRef[]} 문서 순서의 이미지 목록. 이미지가 없으면 빈 배열.
 */
const collectArticleImages = (document: ArticleDocument): ArticleImageRef[] => {
  const found: ArticleImageRef[] = [];
  collect(document.blocks, found);
  return found;
};

export { collectArticleImages };
