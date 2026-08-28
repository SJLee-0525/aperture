import { describe, expect, it } from "vitest";

import {
  ARTICLE_CHUNK_MAX_CHARS,
  articleRagChunks,
} from "@/features/dev-blog/_lib/article-rag-chunks";

import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

import type { DevArticle } from "@/types/dev-article";

const articleWith = (overrides: Partial<DevArticle>): DevArticle => ({
  ...MOCK_DEV_ARTICLES[0],
  id: "a1",
  slug: "chunking",
  published: true,
  ...overrides,
});

describe("articleRagChunks", () => {
  it("초안은 청크를 만들지 않는다", () => {
    expect(articleRagChunks(articleWith({ published: false }), [])).toEqual([]);
  });

  it("meta 청크에 slug 와 상세 경로를 담는다", () => {
    const [meta] = articleRagChunks(articleWith({ body: "본문" }), ["nextjs", "Next.js"]);

    expect(meta.chunkKey).toBe("meta");
    expect(meta.sourceType).toBe("article");
    expect(meta.sourceId).toBe("a1");
    expect(meta.section).toBe("development");
    expect(meta.text).toContain("slug: chunking");
    expect(meta.text).toContain("/dev/articles/chunking");
    expect(meta.text).toContain("nextjs, Next.js");
  });

  it("h2 마다 구간을 나누고 서두는 첫 구간에 둔다", () => {
    const chunks = articleRagChunks(
      articleWith({
        body: ["머리말", "", "## 첫 절", "", "가", "", "## 둘째 절", "", "나"].join("\n"),
      }),
      [],
    );

    expect(chunks.map(({ chunkKey }) => chunkKey)).toEqual(["meta", "h-0-0", "h-1-0", "h-2-0"]);
    expect(chunks[1].text).toBe("머리말");
    expect(chunks[2].text).toBe(["첫 절", "가"].join("\n"));
  });

  it("긴 구간은 잘라 버리지 않고 다음 part 로 이어 간다", () => {
    const paragraph = `${"가".repeat(600)}.`;
    const chunks = articleRagChunks(
      articleWith({
        body: ["## 긴 절", "", paragraph, "", paragraph, "", "마지막 문장"].join("\n"),
      }),
      [],
    );
    const body = chunks.filter(({ chunkKey }) => chunkKey.startsWith("h-"));

    expect(body.length).toBeGreaterThan(1);
    // 상한을 넘긴 뒷부분이 사라지지 않는다.
    expect(body.map(({ text }) => text).join("\n")).toContain("마지막 문장");
    // 두 번째 part 부터는 구간 제목을 다시 붙여 어느 절인지 알 수 있다.
    expect(body[1].text.startsWith("긴 절")).toBe(true);
  });

  it("긴 소제목이 첫 part 의 예산을 깎지 않는다", () => {
    // 제목 120자를 뺀 상한(1,079자)은 넘고 본래 상한(1,200자)에는 들어가는 구간.
    const heading = "제".repeat(200);
    const paragraph = "가".repeat(880);
    const chunks = articleRagChunks(
      articleWith({ body: [`## ${heading}`, "", paragraph].join("\n") }),
      [],
    );
    const body = chunks.filter(({ chunkKey }) => chunkKey.startsWith("h-"));

    expect(body).toHaveLength(1);
    expect(body[0].text.length).toBeLessThanOrEqual(ARTICLE_CHUNK_MAX_CHARS);
    // 제목만큼 깎인 상한이면 둘로 나뉘었을 길이여야 이 테스트가 의미를 갖는다.
    expect(body[0].text.length).toBeGreaterThan(ARTICLE_CHUNK_MAX_CHARS - 121);
  });

  it("공백이 없는 한 블록도 상한 안으로 나눈다", () => {
    const chunks = articleRagChunks(
      articleWith({ body: ["## 절", "", "x".repeat(3_000)].join("\n") }),
      [],
    );

    expect(chunks.every(({ text }) => text.length <= ARTICLE_CHUNK_MAX_CHARS)).toBe(true);
  });

  it("소제목이 청크 상한보다 길어도 분할이 끝난다", () => {
    const heading = "제".repeat(1_300);
    const paragraph = `${"가".repeat(600)}.`;
    const chunks = articleRagChunks(
      articleWith({ body: [`## ${heading}`, "", paragraph, "", paragraph].join("\n") }),
      [],
    );
    const body = chunks.filter(({ chunkKey }) => chunkKey.startsWith("h-"));

    expect(body.length).toBeGreaterThan(1);
    expect(chunks.every(({ text }) => text.length <= ARTICLE_CHUNK_MAX_CHARS)).toBe(true);
    // 다시 붙는 구간 제목은 잘린 앞부분이라 본문 예산이 남는다.
    expect(body[1].text.startsWith("제".repeat(120))).toBe(true);
    expect(body[1].text.length).toBeGreaterThan(200);
  });

  it("모든 청크가 상한 이하이고 ID 가 겹치지 않는다", () => {
    const chunks = MOCK_DEV_ARTICLES.filter(({ published }) => published).flatMap((article) =>
      articleRagChunks(article, article.tags),
    );

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(({ text }) => text.length <= ARTICLE_CHUNK_MAX_CHARS)).toBe(true);
    expect(new Set(chunks.map(({ id }) => id)).size).toBe(chunks.length);
  });

  it("이미지 주소와 YouTube 영상 ID 는 청크에 담지 않는다", () => {
    const chunks = articleRagChunks(MOCK_DEV_ARTICLES[0], []);
    const text = chunks.map(({ text: value }) => value).join("\n");

    expect(text).not.toContain("mock-storage");
    expect(text).not.toContain("youtube.com");
  });

  it("이미지 크기는 청크에 담지 않는다 — 검색 의미가 없다", () => {
    const chunks = articleRagChunks(
      articleWith({
        body: [
          "## 절",
          "",
          `![구조도](https://mock-storage.aperture.invalid/a.webp "2048x1365")`,
        ].join("\n"),
      }),
      [],
    );

    const text = chunks.map(({ text: value }) => value).join("\n");
    expect(text).toContain("구조도");
    expect(text).not.toContain("2048");
    expect(text).not.toContain("1365");
  });
});
