import { shouldUseMockContent } from "@/lib/content/content-source";

import type { AdminDevArticleListItem } from "@/types/admin";
import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

import { createLocalDevArticleRepository } from "@/features/admin-dev-articles/_lib/local-dev-article-repository";

/** 저장하는 필드. 문서 ID와 시스템 시각은 저장소가 채운다. */
type DevArticleInput = Omit<DevArticle, "id" | "createdAt" | "updatedAt">;

/**
 * 관리자 화면이 보는 저장소 경계.
 *
 * 화면은 mock 인지 Firestore 인지 몰라야 한다는 것이 이 타입의 존재 이유다(계획 §2).
 * 지금은 브라우저 로컬 구현만 있고, B5 에서 `listCrud` + `admin-list-rest` projection 을
 * 같은 모양으로 감싸 끼운다. 그래서 `list` 는 목록 행 필드만, `get` 은 본문까지 돌려주는
 * 두 갈래로 나눠 둔다 — Firestore 로 바뀌어도 읽는 양이 그대로여야 한다.
 *
 * 목록 정렬은 여기서 하지 않는다. 초안은 `publishedAt` 이 없어 Firestore 쿼리로 자리를
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
  remove: (id: string) => Promise<void>;
  listTags: () => Promise<DevArticleTag[]>;
  createTag: (tag: DevArticleTag) => Promise<void>;
};

const UNAVAILABLE_MESSAGE =
  "블로그 글 저장소가 아직 실데이터에 연결되지 않았습니다. mock 콘텐츠로 실행한 개발 서버에서 작성하세요.";

/**
 * 실데이터 저장소가 붙기 전까지의 자리. 조용히 빈 목록을 주는 대신 실패를 드러낸다 —
 * 저장한 줄 알았는데 아무 데도 남지 않는 상황이 관리자에게 가장 나쁘다.
 */
const unavailableRepository: DevArticleRepository = {
  newId: () => {
    throw new Error(UNAVAILABLE_MESSAGE);
  },
  list: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
  get: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
  create: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
  update: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
  setPublished: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
  remove: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
  listTags: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
  createTag: () => Promise.reject(new Error(UNAVAILABLE_MESSAGE)),
};

let cached: DevArticleRepository | null = null;

/**
 * 지금 쓸 저장소를 고른다. 첫 호출 결과를 재사용하므로 hook 의 의존성 배열에 그대로 넣어도
 * 매 렌더마다 새 어댑터가 생기지 않는다.
 *
 * mock 소스면 브라우저 로컬 저장소를, 실데이터면 아직 연결되지 않았다고 알리는 자리를 준다.
 * ⚠️ B5 에서 실데이터 분기를 Firestore 구현으로 교체한다.
 *
 * @returns {DevArticleRepository} 현재 콘텐츠 소스에 맞는 저장소.
 */
const getDevArticleRepository = (): DevArticleRepository => {
  cached ??= shouldUseMockContent()
    ? createLocalDevArticleRepository(() => window.localStorage)
    : unavailableRepository;
  return cached;
};

export { getDevArticleRepository };
export type { DevArticleInput, DevArticleRepository };
