import { beforeEach, describe, expect, it } from "vitest";

import { createLocalDevArticleRepository } from "@/features/admin-dev-articles/_lib/local-dev-article-repository";

import { MAX_PINNED_ARTICLES, PIN_LIMIT_MESSAGE } from "@/constants/dev-article-pin";

import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

import type {
  DevArticleInput,
  DevArticleRepository,
} from "@/features/admin-dev-articles/_lib/dev-article-repository";

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

/**
 * 상한까지 고정한다. seed 에 이미 고정된 글이 있어 몇 건을 더 채워야 하는지는 그때그때 다르다.
 *
 * @param {DevArticleRepository} repo 대상 저장소.
 * @returns {Promise<string[]>} 상한을 채우고 남은 미고정 글의 id.
 */
const fillPins = async (repo: DevArticleRepository): Promise<string[]> => {
  const items = await repo.list();
  const spare = items.filter((item) => !item.pinned).map((item) => item.id);
  const need = MAX_PINNED_ARTICLES - items.filter((item) => item.pinned).length;
  for (const id of spare.slice(0, need)) await repo.setPinned(id, true);
  return spare.slice(need);
};

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
      ["id", "pinned", "published", "publishedAt", "slug", "tags", "title", "updatedAt"].sort(),
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

  it("고정 토글이 발행 상태와 발행 시각을 건드리지 않는다", async () => {
    const repo = repository();
    await repo.create("fresh", input({ published: true, publishedAt: NOW }));

    await repo.setPinned("fresh", true);

    const pinned = await repo.get("fresh");
    expect(pinned?.pinned).toBe(true);
    expect(pinned?.published).toBe(true);
    expect(pinned?.publishedAt).toEqual(NOW);
  });

  // 입력에 고정 값이 아예 없다. 폼 스냅샷이 낡아도 고정을 덮을 수 없어야 한다.
  it("공개 토글과 폼 저장은 고정 값을 유지한다", async () => {
    const repo = repository();
    await repo.create("fresh", input({ published: true, publishedAt: NOW }));
    await repo.setPinned("fresh", true);

    await repo.setPublished("fresh", false);
    expect((await repo.get("fresh"))?.pinned).toBe(true);

    await repo.update("fresh", input({ published: true, publishedAt: NOW }));
    expect((await repo.get("fresh"))?.pinned).toBe(true);
  });

  // live 는 트리거가 pinned 만 바뀐 UPDATE 를 거른다. 두 모드의 수정 시각 계약이 같아야 한다.
  it("고정 토글은 수정 시각을 올리지 않는다", async () => {
    const later = new Date("2026-09-01T00:00:00.000Z");
    const repo = createLocalDevArticleRepository(
      () => storage,
      () => later,
    );
    const [first] = await repo.list();

    await repo.setPinned(first.id, !first.pinned);

    expect((await repo.get(first.id))?.updatedAt).toEqual(first.updatedAt);
  });

  it("새 글은 고정하지 않은 상태로 만든다", async () => {
    const repo = repository();
    await repo.create("fresh", input());

    expect((await repo.get("fresh"))?.pinned).toBe(false);
  });

  it("없는 글을 고정하면 거부한다", async () => {
    await expect(repository().setPinned("없음", true)).rejects.toThrow("찾지 못했습니다");
  });

  it("상한을 넘겨 고정하면 거부한다", async () => {
    const repo = repository();
    const [overflow] = await fillPins(repo);

    await expect(repo.setPinned(overflow, true)).rejects.toThrow(PIN_LIMIT_MESSAGE);
  });

  // 상한 검사가 상태 비교보다 앞서면 이 재시도가 실패로 뒤집힌다.
  it("상한에 도달해도 이미 고정된 글의 재고정은 성공한다", async () => {
    const repo = repository();
    await fillPins(repo);
    const [already] = (await repo.list()).filter((item) => item.pinned);

    await expect(repo.setPinned(already.id, true)).resolves.toBeUndefined();
    expect((await repo.get(already.id))?.pinned).toBe(true);
  });

  it("상한에 도달해도 해제는 허용한다", async () => {
    const repo = repository();
    await fillPins(repo);
    const [already] = (await repo.list()).filter((item) => item.pinned);

    await repo.setPinned(already.id, false);

    expect((await repo.get(already.id))?.pinned).toBe(false);
  });

  it("발행 조건을 만족하지 않는 초안은 목록 토글로도 발행되지 않는다", async () => {
    // 이 검사가 없으면 발행일 없는 글이 `published: true` · `publishedAt: null` 로 남는다.
    // 폼에서는 막히는 상태이고, 공개 목록은 그 글의 날짜를 작성일로 대신 보여 준다.
    const repo = repository();
    await repo.create("fresh", input());

    await expect(repo.setPublished("fresh", true)).rejects.toThrow("발행 조건을 만족하지 않습니다");
    expect((await repo.get("fresh"))?.published).toBe(false);
  });

  // 폼의 중복 검사는 다른 글 목록이 아직 로드 중이면 지나칠 수 있다. 저장소가 최종 방어선이다.
  // live 저장소는 발행 여부와 무관하게 같은 시점에 거부하므로 mock 도 같은 시점이어야
  // 개발·E2E 에서 오류가 나는 지점이 실제 배포와 같아진다.
  it("초안 저장도 폼을 거치지 않은 slug 중복을 거부한다", async () => {
    const repo = repository();
    const [existing] = await repo.list();

    await expect(repo.create("fresh", input({ slug: existing.slug }))).rejects.toThrow(
      "이미 사용 중인 slug 입니다",
    );
    await repo.create("fresh", input());
    await expect(repo.update("fresh", input({ slug: existing.slug }))).rejects.toThrow(
      "이미 사용 중인 slug 입니다",
    );
  });

  it("발행 상태의 저장도 slug 중복을 거부한다", async () => {
    const repo = repository();
    const [existing] = await repo.list();

    await expect(
      repo.create("fresh", input({ slug: existing.slug, published: true, publishedAt: NOW })),
    ).rejects.toThrow("이미 사용 중인 slug 입니다");
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

  it("태그 라벨만 고치고 id 와 글의 참조는 그대로 둔다", async () => {
    const repo = repository();
    await repo.updateTag({ id: "firebase", ko: "파이어베이스", en: "Firebase BaaS" });

    const updated = (await repo.listTags()).find((tag) => tag.id === "firebase");
    expect(updated).toEqual({ id: "firebase", ko: "파이어베이스", en: "Firebase BaaS" });
    await expect(repo.updateTag({ id: "없는-태그", ko: "x", en: "x" })).rejects.toThrow();
  });

  it("사용 중인 태그 삭제는 글 수를 담아 거부한다", async () => {
    // mock 사전에서 `firebase` 는 글이 참조하고 `accessibility` 는 어떤 글도 쓰지 않는다.
    const repo = repository();

    await expect(repo.removeTag("firebase")).rejects.toThrow(/글이 \d+건 있습니다/);
    await repo.removeTag("accessibility");
    expect((await repo.listTags()).map((tag) => tag.id)).not.toContain("accessibility");
  });

  it("삭제 결과에 이미지 정리 경고 자리를 돌려준다", async () => {
    const repo = repository();
    await repo.create("fresh", input());

    await expect(repo.remove("fresh")).resolves.toEqual({ imageCleanupWarning: null });
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
