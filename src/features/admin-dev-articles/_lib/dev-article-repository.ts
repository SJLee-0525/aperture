import { createLiveDevArticleRepository } from "@/features/admin-dev-articles/_lib/live-dev-article-repository";
import { createLocalDevArticleRepository } from "@/features/admin-dev-articles/_lib/local-dev-article-repository";

import { shouldUseMockContent } from "@/lib/content/content-source";

import type { AdminDevArticleListItem } from "@/types/admin";
import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 저장하는 필드. 문서 ID와 시스템 시각은 저장소가 채운다.
 * `pinned` 도 빠진다. 이 값은 `setPinned` 만 쓰고, 폼이 실어 나르면 낡은 스냅샷이 고정을 지운다.
 */
type DevArticleInput = Omit<DevArticle, "id" | "createdAt" | "updatedAt" | "pinned">;

/**
 * 삭제 결과. 글 삭제가 실패하면 reject한다. 이미지만 일부 남은 경우에는 글 삭제를
 * 되돌리지 않고 관리자가 나중에 정리할 수 있도록 경고를 남긴다.
 */
type DevArticleRemoveResult = { imageCleanupWarning: string | null };

/**
 * 관리자 화면이 보는 저장소 경계.
 *
 * 화면은 mock 인지 실데이터인지 몰라야 한다는 것이 이 타입의 존재 이유다(계획 §2).
 * 지금은 브라우저 로컬 구현만 있고, B5 에서 `listCrud` + `admin-list-rest` projection 을
 * 같은 모양으로 감싸 끼운다. 그래서 `list` 는 목록 행 필드만, `get` 은 본문까지 돌려주는
 * 두 갈래로 나눠 둔다. 저장소 구현이 바뀌어도 읽는 양이 그대로여야 한다.
 *
 * 목록 정렬은 여기서 하지 않는다. 초안은 `publishedAt` 이 없어 DB 정렬로 자리를
 * 정할 수 없고, 관리자 목록의 정렬 규칙은 화면 쪽 순수 함수(`dev-article-sort`)가 갖는다.
 */
type DevArticleRepository = {
  /** 새 글의 문서 ID를 미리 발급한다. 이미지 Storage 경로를 저장 전에 정하기 위해 필요하다. */
  newId: () => string;
  list: () => Promise<AdminDevArticleListItem[]>;
  get: (id: string) => Promise<DevArticle | null>;
  create: (id: string, input: DevArticleInput) => Promise<void>;
  update: (id: string, input: DevArticleInput) => Promise<void>;
  setPublished: (id: string, published: boolean) => Promise<void>;
  /** 고정 여부만 바꾼다. 발행 상태와 발행 시각은 건드리지 않는다. */
  setPinned: (id: string, pinned: boolean) => Promise<void>;
  remove: (id: string) => Promise<DevArticleRemoveResult>;
  listTags: () => Promise<DevArticleTag[]>;
  createTag: (tag: DevArticleTag) => Promise<void>;
  /** 라벨(ko/en)만 고친다. id 는 문서 ID이자 글 `tags[]` 의 외래키라 바꿀 수 없다. */
  updateTag: (tag: DevArticleTag) => Promise<void>;
  /** 어떤 글도 참조하지 않을 때만 지운다. 사용 중이면 글 수를 담아 거부한다. */
  removeTag: (id: string) => Promise<void>;
};

let cached: DevArticleRepository | null = null;

/**
 * 지금 쓸 저장소를 고른다. 첫 호출 결과를 재사용하므로 hook 의 의존성 배열에 그대로 넣어도
 * 매 렌더마다 새 어댑터가 생기지 않는다.
 *
 * mock 소스면 브라우저 로컬 저장소를, 실데이터면 Supabase 구현을 준다. 두 구현 모두
 * 도메인 규칙(`dev-article-domain`)을 공유하고, 팩토리는 호출 시점까지 Supabase 를
 * 건드리지 않는 closure 조립만 한다.
 *
 * @returns {DevArticleRepository} 현재 콘텐츠 소스에 맞는 저장소.
 */
const getDevArticleRepository = (): DevArticleRepository => {
  cached ??= shouldUseMockContent()
    ? createLocalDevArticleRepository(() => window.localStorage)
    : createLiveDevArticleRepository();
  return cached;
};

export { getDevArticleRepository };
export type { DevArticleInput, DevArticleRepository };
