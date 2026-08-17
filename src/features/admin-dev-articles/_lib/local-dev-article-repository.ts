import {
  assertArticlePublishable,
  stampFirstPublished,
} from "@/features/admin-dev-articles/_lib/dev-article-domain";
import {
  countTagUsage,
  tagInUseMessage,
} from "@/features/admin-dev-articles/_lib/dev-article-tag-usage";
import {
  readDevArticleStore,
  writeDevArticleStore,
  type DevArticleStore,
} from "@/features/admin-dev-articles/_lib/local-dev-article-store";

import type {
  DevArticleInput,
  DevArticleRepository,
} from "@/features/admin-dev-articles/_lib/dev-article-repository";
import type { AdminDevArticleListItem } from "@/types/admin";
import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 글 전체에서 관리자 목록에 필요한 필드만 고른다.
 *
 * @param {DevArticle} article 저장된 글 전체.
 * @returns {AdminDevArticleListItem} 목록 행에 필요한 필드만.
 */
const toListItem = (article: DevArticle): AdminDevArticleListItem => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  tags: article.tags,
  pinned: article.pinned,
  published: article.published,
  publishedAt: article.publishedAt,
  updatedAt: article.updatedAt,
});

/**
 * mock 글과 태그로 저장소를 채운다. 공개 화면이 읽는 것과 같은 원본이라 관리자 목록과
 * 공개 목록이 같은 글로 시작한다(이후 관리자 쪽 수정은 mock 파일에 되돌아가지 않는다).
 *
 * @returns {Promise<DevArticleStore>} seed 한 글과 태그.
 */
const seedStore = async (): Promise<DevArticleStore> => {
  const [{ MOCK_DEV_ARTICLES }, { MOCK_DEV_ARTICLE_TAGS }] = await Promise.all([
    import("@/mocks/dev-articles"),
    import("@/mocks/dev-article-tags"),
  ]);
  return { articles: [...MOCK_DEV_ARTICLES], tags: [...MOCK_DEV_ARTICLE_TAGS] };
};

/**
 * 브라우저 로컬 저장소를 Firestore 대신 쓰는 관리자 저장소.
 *
 * 개발 중에는 Firebase 대신 브라우저 저장소를 사용한다. 여기 저장한 글은
 * 브라우저에만 남고 공개 페이지(서버가 `mocks/dev-articles.ts` 를 읽는다)에는 나타나지 않는다.
 *
 * `firstPublishedAt` 스탬프를 여기서 찍는다. 발행은 폼 저장과 목록 토글 두 경로로 들어오는데,
 * 저장소가 모든 쓰기의 유일한 통로라 규칙을 한 번만 적으면 된다.
 *
 * @param {() => Storage} getStorage 저장소를 여는 함수. 모듈 로드 시점이 아니라 호출 시점에
 *   `window` 를 건드리려고 함수로 받는다(관리자 페이지도 서버에서 한 번 평가된다).
 * @param {() => Date} [now] 시스템 시각. 테스트가 고정할 수 있게 주입받는다.
 * @returns {DevArticleRepository} 로컬 저장소에 붙은 관리자 CRUD.
 */
const createLocalDevArticleRepository = (
  getStorage: () => Storage,
  now: () => Date = () => new Date(),
): DevArticleRepository => {
  /**
   * 저장소가 배열 전체를 다시 쓰므로 큐에서 쓰기를 차례로 실행한다.
   * 앞선 쓰기가 실패해도 다음 쓰기는 이어 간다.
   */
  let writeQueue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = writeQueue.then(operation, operation);
    writeQueue = result.catch(() => undefined);
    return result;
  };

  /**
   * 저장소를 읽고, 비어 있거나 형이 깨졌으면 mock 으로 다시 채운다.
   *
   * @returns {Promise<DevArticleStore>} 현재 글과 태그.
   */
  const load = async (): Promise<DevArticleStore> => {
    const storage = getStorage();
    const existing = readDevArticleStore(storage);
    if (existing) return existing;

    const seeded = await seedStore();
    // seed 쓰기 실패를 무시하면 매 호출 mock 을 다시 만들어 편집이 전혀 남지 않는다.
    save(seeded);
    // 저장 형식으로 다시 읽은 사본을 사용한다.
    return readDevArticleStore(storage) ?? seeded;
  };

  /**
   * 저장소를 덮어쓴다.
   *
   * @param {DevArticleStore} store 저장할 전체 상태.
   * @returns {void}
   */
  const save = (store: DevArticleStore): void => {
    if (writeDevArticleStore(getStorage(), store)) return;
    throw new Error("브라우저 저장 공간이 부족해 글을 저장하지 못했습니다. 오래된 글을 지우세요.");
  };

  /**
   * 이 저장소가 아는 데이터로 `assertArticlePublishable` 의 context 를 만든다.
   *
   * mock 저장소에는 프로젝트 목록이 없으므로 연관 프로젝트 공개 여부는 검사하지 않는다.
   * 공개 상세 화면은 비공개 프로젝트를 다시 걸러 낸다.
   *
   * @param {string} id 발행하려는 글의 문서 ID.
   * @param {DevArticleInput} input 발행하려는 저장 값.
   * @param {DevArticleStore} store 중복 slug·태그 사전을 볼 현재 저장소.
   * @returns {void}
   * @throws {Error} 발행 조건을 만족하지 않을 때.
   */
  const assertPublishable = (id: string, input: DevArticleInput, store: DevArticleStore): void =>
    assertArticlePublishable(id, input, {
      articles: store.articles,
      knownTagIds: store.tags.map((tag) => tag.id),
      publishableProjectIds: input.relatedProjectIds,
    });

  return {
    newId: () => crypto.randomUUID(),

    list: async () => (await load()).articles.map(toListItem),

    get: async (id) => (await load()).articles.find((article) => article.id === id) ?? null,

    create: (id, input) =>
      enqueue(async () => {
        const store = await load();
        if (store.articles.some((article) => article.id === id)) {
          throw new Error("같은 ID의 글이 이미 있습니다.");
        }
        if (input.published) assertPublishable(id, input, store);
        const stamped = now();
        save({
          ...store,
          articles: [
            ...store.articles,
            {
              id,
              ...stampFirstPublished(input, undefined, now),
              createdAt: stamped,
              updatedAt: stamped,
            },
          ],
        });
      }),

    update: (id, input) =>
      enqueue(async () => {
        const store = await load();
        const previous = store.articles.find((article) => article.id === id);
        if (!previous) throw new Error("수정할 글을 찾지 못했습니다.");
        if (input.published) assertPublishable(id, input, store);
        save({
          ...store,
          articles: store.articles.map((article) =>
            article.id === id
              ? {
                  ...article,
                  ...stampFirstPublished(input, previous, now),
                  updatedAt: now(),
                }
              : article,
          ),
        });
      }),

    setPublished: (id, published) =>
      enqueue(async () => {
        const store = await load();
        const previous = store.articles.find((article) => article.id === id);
        if (!previous) throw new Error("상태를 바꿀 글을 찾지 못했습니다.");
        if (published) assertPublishable(previous.id, previous, store);
        save({
          ...store,
          articles: store.articles.map((article) =>
            article.id === id
              ? {
                  ...article,
                  published,
                  firstPublishedAt:
                    article.firstPublishedAt ?? (published ? now() : article.firstPublishedAt),
                  updatedAt: now(),
                }
              : article,
          ),
        });
      }),

    setPinned: (id, pinned) =>
      enqueue(async () => {
        const store = await load();
        if (!store.articles.some((article) => article.id === id)) {
          throw new Error("고정할 글을 찾지 못했습니다.");
        }
        save({
          ...store,
          articles: store.articles.map((article) =>
            article.id === id ? { ...article, pinned, updatedAt: now() } : article,
          ),
        });
      }),

    remove: (id) =>
      enqueue(async () => {
        const store = await load();
        save({ ...store, articles: store.articles.filter((article) => article.id !== id) });
        // mock 업로더는 실제 파일을 만들지 않으므로 정리할 이미지가 없다.
        return { imageCleanupWarning: null };
      }),

    listTags: async () => (await load()).tags,

    createTag: (tag: DevArticleTag) =>
      enqueue(async () => {
        const store = await load();
        if (store.tags.some((existing) => existing.id === tag.id)) {
          throw new Error("같은 id의 태그가 이미 있습니다.");
        }
        save({ ...store, tags: [...store.tags, tag] });
      }),

    updateTag: (tag: DevArticleTag) =>
      enqueue(async () => {
        const store = await load();
        if (!store.tags.some((existing) => existing.id === tag.id)) {
          throw new Error("수정할 태그를 찾지 못했습니다.");
        }
        save({
          ...store,
          tags: store.tags.map((existing) =>
            existing.id === tag.id ? { ...existing, ko: tag.ko, en: tag.en } : existing,
          ),
        });
      }),

    removeTag: (id: string) =>
      enqueue(async () => {
        const store = await load();
        const used = countTagUsage(store.articles, id);
        if (used > 0) throw new Error(tagInUseMessage(used));
        save({ ...store, tags: store.tags.filter((existing) => existing.id !== id) });
      }),
  };
};

export { createLocalDevArticleRepository };
