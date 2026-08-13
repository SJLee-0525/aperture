import { beforeEach, describe, expect, it } from "vitest";

import { createLocalDevArticleRepository } from "@/features/admin-dev-articles/_lib/local-dev-article-repository";
import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

/** 테스트마다 새로 만드는 메모리 저장소. 실제 localStorage 를 건드리지 않는다. */
const createMemoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => map.delete(key),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};

const NOW = new Date("2026-08-12T09:00:00.000Z");

const input = (overrides: Partial<DevArticleInput> = {}): DevArticleInput => ({
  slug: "new-note",
  title: { ko: "새 글", en: "New note" },
  summary: { ko: "요약", en: "Summary" },
  body: "본문",
  cover: null,
  coverAlt: null,
  tags: [],
  relatedProjectIds: [],
  published: false,
  publishedAt: null,
  firstPublishedAt: null,
  ...overrides,
});

let storage: Storage;
const repository = () =>
  createLocalDevArticleRepository(
    () => storage,
    () => NOW,
  );

beforeEach(() => {
  storage = createMemoryStorage();
});

describe("createLocalDevArticleRepository", () => {
  it("처음 읽을 때 mock 글로 저장소를 채운다", async () => {
    const items = await repository().list();

    expect(items).toHaveLength(MOCK_DEV_ARTICLES.length);
    expect(items.map((item) => item.id).sort()).toEqual(
      MOCK_DEV_ARTICLES.map((article) => article.id).sort(),
    );
  });

  it("목록은 본문을 내려주지 않는다", async () => {
    const [item] = await repository().list();

    expect(Object.keys(item).sort()).toEqual(
      ["id", "published", "publishedAt", "slug", "tags", "title", "updatedAt"].sort(),
    );
  });

  it("본문은 문서 한 건을 읽을 때만 온다", async () => {
    const repo = repository();
    const [first] = await repo.list();

    await expect(repo.get(first.id)).resolves.toMatchObject({ id: first.id });
    expect((await repo.get(first.id))?.body.length).toBeGreaterThan(0);
  });

  it("없는 글은 null 이다", async () => {
    await expect(repository().get("없는-id")).resolves.toBeNull();
  });

  it("새 글을 만들고 생성·수정 시각을 남긴다", async () => {
    const repo = repository();
    await repo.create("fresh", input());

    const created = await repo.get("fresh");
    expect(created?.createdAt).toEqual(NOW);
    expect(created?.updatedAt).toEqual(NOW);
    expect(created?.firstPublishedAt).toBeNull();
  });

  it("같은 ID로 두 번 만들지 않는다", async () => {
    const repo = repository();
    await repo.create("fresh", input());

    await expect(repo.create("fresh", input())).rejects.toThrow();
  });

  it("최초 발행에만 firstPublishedAt 을 찍는다", async () => {
    const repo = repository();
    const earlier = new Date("2026-08-01T00:00:00.000Z");
    await repo.create("fresh", input({ published: true, publishedAt: earlier }));

    const published = await repo.get("fresh");
    expect(published?.firstPublishedAt).toEqual(NOW);

    // 발행을 내렸다가 다시 올려도 최초 시각은 그대로다.
    await repo.setPublished("fresh", false);
    await repo.setPublished("fresh", true);
    expect((await repo.get("fresh"))?.firstPublishedAt).toEqual(NOW);
  });

  it("초안 저장은 firstPublishedAt 을 남기지 않는다", async () => {
    const repo = repository();
    await repo.create("fresh", input());
    await repo.update("fresh", input({ body: "고친 본문" }));

    expect((await repo.get("fresh"))?.firstPublishedAt).toBeNull();
    expect((await repo.get("fresh"))?.body).toBe("고친 본문");
  });

  it("목록 토글로 발행해도 최초 발행 시각을 남긴다", async () => {
    const repo = repository();
    await repo.create("fresh", input({ publishedAt: NOW }));
    await repo.setPublished("fresh", true);

    const toggled = await repo.get("fresh");
    expect(toggled?.published).toBe(true);
    expect(toggled?.firstPublishedAt).toEqual(NOW);
  });

  it("발행 조건을 만족하지 않는 초안은 목록 토글로도 발행되지 않는다", async () => {
    // 이 검사가 없으면 발행일 없는 글이 `published: true` · `publishedAt: null` 로 남는다.
    // 폼에서는 막히는 상태이고, 공개 목록은 그 글의 날짜를 작성일로 대신 보여 준다.
    const repo = repository();
    await repo.create("fresh", input());

    await expect(repo.setPublished("fresh", true)).rejects.toThrow("발행 조건을 만족하지 않습니다");
    expect((await repo.get("fresh"))?.published).toBe(false);
  });

  it("발행 상태의 저장도 폼을 거치지 않은 slug 중복을 거부한다", async () => {
    // 폼의 중복 검사는 다른 글 목록이 아직 로드 중이면 지나칠 수 있다. 저장소가 최종 방어선이다.
    const repo = repository();
    const [existing] = await repo.list();

    await expect(
      repo.create("fresh", input({ slug: existing.slug, published: true, publishedAt: NOW })),
    ).rejects.toThrow("발행 조건을 만족하지 않습니다");
    await repo.create("fresh", input());
    await expect(
      repo.update("fresh", input({ slug: existing.slug, published: true, publishedAt: NOW })),
    ).rejects.toThrow("발행 조건을 만족하지 않습니다");
  });

  it("겹쳐 시작한 쓰기도 서로의 변경을 덮어쓰지 않는다", async () => {
    const repo = repository();
    await repo.create("a", input({ slug: "a-note", publishedAt: NOW }));
    await repo.create("b", input({ slug: "b-note", publishedAt: NOW }));

    await Promise.all([repo.setPublished("a", true), repo.setPublished("b", true)]);

    expect((await repo.get("a"))?.published).toBe(true);
    expect((await repo.get("b"))?.published).toBe(true);
  });

  it("발행 취소는 조건을 보지 않는다", async () => {
    const repo = repository();
    await repo.create("fresh", input({ published: true, publishedAt: NOW }));

    await expect(repo.setPublished("fresh", false)).resolves.toBeUndefined();
    expect((await repo.get("fresh"))?.published).toBe(false);
  });

  it("없는 글의 수정·상태 변경은 실패로 알린다", async () => {
    const repo = repository();

    await expect(repo.update("없는-id", input())).rejects.toThrow();
    await expect(repo.setPublished("없는-id", true)).rejects.toThrow();
  });

  it("글을 지운다", async () => {
    const repo = repository();
    await repo.create("fresh", input());
    await repo.remove("fresh");

    await expect(repo.get("fresh")).resolves.toBeNull();
  });

  it("태그를 추가하고 id 중복을 거부한다", async () => {
    const repo = repository();
    await repo.createTag({ id: "webmcp", ko: "WebMCP", en: "WebMCP" });

    expect((await repo.listTags()).map((tag) => tag.id)).toContain("webmcp");
    await expect(repo.createTag({ id: "webmcp", ko: "다른 이름", en: "Other" })).rejects.toThrow();
  });

  it("저장한 값은 다른 인스턴스에서도 보인다", async () => {
    await repository().create("fresh", input());

    await expect(repository().get("fresh")).resolves.toMatchObject({ slug: "new-note" });
  });

  it("mock 원본을 건드리지 않는다", async () => {
    const repo = repository();
    const [target] = MOCK_DEV_ARTICLES;
    await repo.update(target.id, input({ slug: "덮어쓴-slug" }));

    expect(MOCK_DEV_ARTICLES[0].slug).toBe(target.slug);
  });

  it("발급한 ID는 서로 겹치지 않는다", () => {
    const repo = repository();

    expect(repo.newId()).not.toBe(repo.newId());
  });
});
