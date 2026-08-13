import {
  assertArticlePublishable,
  stampFirstPublished,
} from "@/features/admin-dev-articles/_lib/dev-article-domain";
import {
  countTagUsage,
  tagInUseMessage,
} from "@/features/admin-dev-articles/_lib/dev-article-tag-usage";

import { listDevArticleItemsAdmin, listDevProjectItemsAdmin } from "@/lib/firebase/admin-list-rest";
import {
  createDevArticleTag,
  devArticlesCrud,
  findArticleSlugOwner,
  listDevArticleTagsAdmin,
  removeDevArticleTag,
  updateDevArticleTag,
} from "@/lib/firebase/dev-articles";
import { deleteArticleImages } from "@/lib/firebase/storage";

import type {
  DevArticleInput,
  DevArticleRepository,
} from "@/features/admin-dev-articles/_lib/dev-article-repository";
import type { DevArticle } from "@/types/dev-article";

const IMAGE_CLEANUP_WARNING =
  "글은 삭제했지만 일부 이미지 파일은 남아 있습니다. 유지보수 페이지의 '사용되지 않는 블로그 이미지'에서 정리할 수 있습니다.";

/**
 * `DevArticleInput` 을 `listCrud` 가 받는 입력으로 좁힌다. `createdAt`/`updatedAt` 은
 * 서버 타임스탬프가 소유하므로 입력에 없어도 된다 — 타입만 맞춘다.
 *
 * @param {DevArticleInput} input 저장할 도메인 필드.
 * @returns {Omit<DevArticle, "id">} listCrud 입력 형태의 같은 값.
 */
const asCrudInput = (input: DevArticleInput): Omit<DevArticle, "id"> =>
  input as Omit<DevArticle, "id">;

/**
 * slug 서버 유일성 검사. 폼도 같은 검사를 하지만 참조 목록이 로드 중인 짧은 창에는
 * 빈 배열과 비교하므로, 저장 직전 서버 데이터로 한 번 더 확인하는 것이 최종 방어선이다.
 * 조회와 쓰기 사이의 race 는 관리자 1명 전제로 허용한다.
 *
 * @param {string} slug 저장하려는 slug.
 * @param {string} selfId 편집 중인 글의 문서 ID.
 * @returns {Promise<void>} 사용 가능하면 완료된다.
 * @throws {Error} 다른 글이 이미 쓰는 slug 일 때.
 */
const assertSlugAvailable = async (slug: string, selfId: string): Promise<void> => {
  if (await findArticleSlugOwner(slug, selfId)) {
    throw new Error(`이미 사용 중인 slug 입니다: ${slug}`);
  }
};

/**
 * 발행 조건 검사에 필요한 주변 데이터를 서버에서 모아 도메인 검사를 태운다.
 * mock 과 달리 연관 프로젝트의 존재·공개 여부까지 실제 projection 으로 확인한다.
 *
 * @param {string} id 발행하려는 글의 문서 ID.
 * @param {DevArticleInput} input 발행하려는 저장 값.
 * @returns {Promise<void>} 조건을 만족하면 완료된다.
 * @throws {Error} 발행 조건을 만족하지 않을 때.
 */
const assertPublishableLive = async (id: string, input: DevArticleInput): Promise<void> => {
  const [articles, tags, projects] = await Promise.all([
    listDevArticleItemsAdmin(),
    listDevArticleTagsAdmin(),
    listDevProjectItemsAdmin(),
  ]);
  assertArticlePublishable(id, input, {
    articles,
    knownTagIds: tags.map((tag) => tag.id),
    publishableProjectIds: projects
      .filter((project) => project.published)
      .map((project) => project.id),
  });
};

/**
 * Firestore 에 붙는 블로그 글 저장소. 기반 CRUD(`devArticlesCrud`)는 저장·캐시 갱신·RAG
 * 정책만 알고, 도메인 규칙 — slug 유일성·최초 발행 스탬프·발행 조건 — 은 mock 구현과
 * 같은 `dev-article-domain` 모듈을 여기서 얹는다. 검사 지점도 mock 과 같다:
 * 발행 상태로 저장되는 모든 경로(`create`/`update`/`setPublished`).
 *
 * 도메인 규칙용 previous 읽기와 listCrud 정책의 스냅샷 읽기가 각 1회씩 발생한다.
 * 관리자 1명·저장 빈도 기준으로 수용하는 이중 읽기다.
 *
 * @param {() => Date} [now] 시스템 시각. 테스트가 고정할 수 있게 주입받는다.
 * @returns {DevArticleRepository} Firestore 에 붙은 관리자 CRUD.
 */
const createLiveDevArticleRepository = (
  now: () => Date = () => new Date(),
): DevArticleRepository => ({
  newId: () => devArticlesCrud.newId(),

  list: listDevArticleItemsAdmin,

  get: (id) => devArticlesCrud.get(id),

  create: async (id, input) => {
    await assertSlugAvailable(input.slug, id);
    const stamped = stampFirstPublished(input, undefined, now);
    if (stamped.published) await assertPublishableLive(id, stamped);
    await devArticlesCrud.create(id, asCrudInput(stamped));
  },

  update: async (id, input) => {
    const previous = await devArticlesCrud.get(id);
    if (!previous) throw new Error("수정할 글을 찾지 못했습니다.");
    // 발행된 적 있는 글의 slug 는 폼(`prepareArticleInput`)과 같은 계약으로 이전 값을 유지한다.
    const guarded = previous.firstPublishedAt ? { ...input, slug: previous.slug } : input;
    await assertSlugAvailable(guarded.slug, id);
    const stamped = stampFirstPublished(guarded, previous, now);
    if (stamped.published) await assertPublishableLive(id, stamped);
    await devArticlesCrud.update(id, asCrudInput(stamped));
  },

  setPublished: async (id, published) => {
    const previous = await devArticlesCrud.get(id);
    if (!previous) throw new Error("상태를 바꿀 글을 찾지 못했습니다.");
    const input: DevArticleInput = {
      slug: previous.slug,
      title: previous.title,
      summary: previous.summary,
      body: previous.body,
      cover: previous.cover,
      coverAlt: previous.coverAlt,
      tags: previous.tags,
      relatedProjectIds: previous.relatedProjectIds,
      published,
      publishedAt: previous.publishedAt,
      firstPublishedAt: previous.firstPublishedAt,
    };
    if (published) await assertPublishableLive(id, input);
    // listCrud.setPublished 는 published 만 뒤집어 최초 발행 스탬프를 못 찍는다 —
    // update 경로로 우회한다. RAG 정책은 kind 없이 before/after 만 보므로 계약이 같다.
    await devArticlesCrud.update(id, asCrudInput(stampFirstPublished(input, previous, now)));
  },

  remove: async (id) => {
    await devArticlesCrud.remove(id);
    try {
      await deleteArticleImages(id);
      return { imageCleanupWarning: null };
    } catch {
      // 글 삭제는 유지하고, 남은 이미지가 있다는 경고만 보낸다.
      return { imageCleanupWarning: IMAGE_CLEANUP_WARNING };
    }
  },

  listTags: listDevArticleTagsAdmin,

  createTag: createDevArticleTag,

  updateTag: updateDevArticleTag,

  removeTag: async (id) => {
    // 사용 글 수 검증은 transaction 이 아니다 — 조회와 삭제 사이에 글 저장이 끼어들 수 있다.
    // 관리자 1명 전제로 허용하고, 삭제된 태그의 신규 참조는 발행 검사(`tag-unknown`)가 막는다.
    const used = countTagUsage(await listDevArticleItemsAdmin(), id);
    if (used > 0) throw new Error(tagInUseMessage(used));
    await removeDevArticleTag(id);
  },
});

export { createLiveDevArticleRepository };
