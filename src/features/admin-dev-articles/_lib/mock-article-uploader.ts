import { STORAGE_IMAGE_HOSTS } from "@/constants/security-headers";

import type { ImageMeta } from "@/types/image";

/**
 * 글 이미지를 올리는 함수. 폼은 이 형만 알고 실제 구현은 주입받는다(계획 §2).
 * mock 단계에서는 아래 fixture 구현이, B5 에서는 Storage 업로더가 들어온다.
 */
type ArticleImageUploader = (file: File) => Promise<ImageMeta>;

/** 실제 이미지가 없어 크기를 잴 수 없다. 카드 비율만 그럴듯하면 되는 값이다. */
const FIXTURE_IMAGE_SIZE = { w: 2048, h: 1365 } as const;

/**
 * 파일 이름을 Storage 경로에 넣어도 되는 형태로 줄인다.
 *
 * @param {string} name 원본 파일 이름.
 * @returns {string} 영문·숫자·하이픈만 남은 이름. 남는 글자가 없으면 `image`.
 */
const toFileStem = (name: string): string =>
  name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "image";

/**
 * mock 단계의 이미지 업로더.
 *
 * 실제로 아무것도 올리지 않고, 실 업로드가 만들 것과 같은 모양의 주소를 돌려준다.
 * 주소는 CSP `img-src` 와 Markdown 이미지 정책이 공유하는 허용 호스트(`STORAGE_IMAGE_HOSTS`)
 * 아래에 둔다 — 여기서 만든 문법이 미리보기에서 그대로 렌더돼야 삽입 흐름을 검증할 수 있다.
 * 경로는 B5 가 쓸 `dev-blog/{articleId}/` 규칙을 미리 따른다.
 *
 * 파일 내용을 읽지 않으므로 브라우저 메모리에 이미지를 들고 있지 않고, 로컬 복구본에도
 * 주소만 남는다.
 *
 * @param {string} articleId 저장 전에 발급한 글 문서 ID.
 * @returns {ArticleImageUploader} 파일을 받아 fixture ImageMeta 를 주는 함수.
 */
const createMockArticleImageUploader = (articleId: string): ArticleImageUploader => {
  let sequence = 0;

  return async (file: File): Promise<ImageMeta> => {
    sequence += 1;
    const path = `dev-blog/${articleId}/${sequence}-${toFileStem(file.name)}.webp`;
    return {
      url: `${STORAGE_IMAGE_HOSTS[0]}/v0/b/mock.appspot.com/o/${encodeURIComponent(path)}?alt=media`,
      path,
      ...FIXTURE_IMAGE_SIZE,
    };
  };
};

export { createMockArticleImageUploader };
export type { ArticleImageUploader };
