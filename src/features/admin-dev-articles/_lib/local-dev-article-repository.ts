import {
  readDevArticleStore,
  writeDevArticleStore,
  type DevArticleStore,
} from "@/features/admin-dev-articles/_lib/local-dev-article-store";

import type { AdminDevArticleListItem } from "@/types/admin";
import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

import type {
  DevArticleInput,
  DevArticleRepository,
} from "@/features/admin-dev-articles/_lib/dev-article-repository";

/**
 * 목록 행으로 줄이는 투영. 로컬 구현도 전체를 읽지만 **반환은 이 필드로 제한**한다 —
 * B5 에서 Firestore REST projection 으로 갈아 끼울 때 화면이 받는 모양이 그대로여야 한다.
 *
 * @param {DevArticle} article 저장된 글 전체.
 * @returns {AdminDevArticleListItem} 목록 행에 필요한 필드만.
 */
const toListItem = (article: DevArticle): AdminDevArticleListItem => ({
  id: article.id,
  slug: article.slug,
  title: article.title,
  tags: article.tags,
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
 * 계획 §2의 mock 우선 원칙 — 데이터 계약과 화면이 굳기 전에는 Firebase 컬렉션을 만들지
 * 않는다 — 을 만족하는 자리다. 개발 편의용이며 운영 데이터가 아니다. 여기 저장한 글은
 * 브라우저에만 남고 공개 페이지(서버가 `mocks/dev-articles.ts` 를 읽는다)에는 나타나지 않는다.
 * B5 에서 Firestore 구현이 같은 인터페이스로 들어오면 두 쪽이 하나가 된다.
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
   * 저장소를 읽고, 비어 있거나 형이 깨졌으면 mock 으로 다시 채운다.
   *
   * @returns {Promise<DevArticleStore>} 현재 글과 태그.
   */
  const load = async (): Promise<DevArticleStore> => {
    const storage = getStorage();
    const existing = readDevArticleStore(storage);
    if (existing) return existing;

    const seeded = await seedStore();
    writeDevArticleStore(storage, seeded);
    // 다시 읽어 저장 형식을 거친 사본을 쓴다 — mock 모듈의 객체를 그대로 들고 있지 않는다.
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
   * 입력을 저장 형태로 맞춘다. 최초 발행이면 그 시각을 한 번만 남긴다.
   *
   * @param {DevArticleInput} input 폼이 만든 저장 필드.
   * @param {DevArticle | undefined} previous 이전 저장본. 새 글이면 undefined.
   * @returns {DevArticleInput} 발행 시각을 정리한 저장 필드.
   */
  const stampFirstPublished = (input: DevArticleInput, previous?: DevArticle): DevArticleInput => {
    const firstPublishedAt = previous?.firstPublishedAt ?? input.firstPublishedAt;
    if (firstPublishedAt || !input.published) return { ...input, firstPublishedAt };
    return { ...input, firstPublishedAt: now() };
  };

  return {
    newId: () => crypto.randomUUID(),

    list: async () => (await load()).articles.map(toListItem),

    get: async (id) => (await load()).articles.find((article) => article.id === id) ?? null,

    create: async (id, input) => {
      const store = await load();
      if (store.articles.some((article) => article.id === id)) {
        throw new Error("같은 ID의 글이 이미 있습니다.");
      }
      const stamped = now();
      save({
        ...store,
        articles: [
          ...store.articles,
          { id, ...stampFirstPublished(input), createdAt: stamped, updatedAt: stamped },
        ],
      });
    },

    update: async (id, input) => {
      const store = await load();
      const previous = store.articles.find((article) => article.id === id);
      if (!previous) throw new Error("수정할 글을 찾지 못했습니다.");
      save({
        ...store,
        articles: store.articles.map((article) =>
          article.id === id
            ? {
                ...article,
                ...stampFirstPublished(input, previous),
                updatedAt: now(),
              }
            : article,
        ),
      });
    },

    setPublished: async (id, published) => {
      const store = await load();
      const previous = store.articles.find((article) => article.id === id);
      if (!previous) throw new Error("상태를 바꿀 글을 찾지 못했습니다.");
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
    },

    remove: async (id) => {
      const store = await load();
      save({ ...store, articles: store.articles.filter((article) => article.id !== id) });
    },

    listTags: async () => (await load()).tags,

    createTag: async (tag: DevArticleTag) => {
      const store = await load();
      if (store.tags.some((existing) => existing.id === tag.id)) {
        throw new Error("같은 id의 태그가 이미 있습니다.");
      }
      save({ ...store, tags: [...store.tags, tag] });
    },
  };
};

export { createLocalDevArticleRepository };
