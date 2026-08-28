import { MOCK_STORAGE_ORIGIN } from "@/constants/security-headers";

import type { ImageMeta } from "@/types/image";

/**
 * 글 이미지를 올리는 함수. 폼은 이 형만 알고 실제 구현은 주입받는다.
 * mock 모드에서는 아래 fixture 구현이, 실데이터 모드에서는 Storage 업로더가 들어온다.
 */
type ArticleImageUploader = (file: File) => Promise<ImageMeta>;

/** 실제 이미지가 없어 크기를 잴 수 없다. 카드 비율만 그럴듯하면 되는 값이다. */
const FIXTURE_IMAGE_SIZE = { w: 2048, h: 1365 } as const;

/**
 * mock 단계의 이미지 업로더.
 *
 * 실제로 아무것도 올리지 않고, 실 업로드가 만들 것과 같은 모양의 주소를 돌려준다.
 * 주소는 CSP `img-src` 와 Markdown 이미지 정책이 공유하는 허용 호스트(`MOCK_STORAGE_ORIGIN`)
 * 아래에 둔다 — 여기서 만든 문법이 미리보기에서 그대로 렌더돼야 삽입 흐름을 검증할 수 있다.
 * 파일명도 실 업로드와 같은 UUID 다. 대표 이미지와 본문 이미지가 각자 업로더 인스턴스를
 * 쓰므로, 인스턴스 안에서만 증가하는 번호를 쓰면 서로 다른 자산이 같은 경로를 갖는다.
 *
 * 파일 내용을 읽지 않으므로 브라우저 메모리에 이미지를 들고 있지 않고, 로컬 복구본에도
 * 주소만 남는다.
 *
 * @param {string} articleId 저장 전에 발급한 글 문서 ID.
 * @returns {ArticleImageUploader} 파일을 받아 fixture ImageMeta 를 주는 함수.
 */
const createMockArticleImageUploader =
  (articleId: string): ArticleImageUploader =>
  async (): Promise<ImageMeta> => {
    const path = `dev-blog/${articleId}/${crypto.randomUUID()}.webp`;
    return {
      url: `${MOCK_STORAGE_ORIGIN}/${path}`,
      path,
      ...FIXTURE_IMAGE_SIZE,
    };
  };

export { createMockArticleImageUploader };
export type { ArticleImageUploader };
