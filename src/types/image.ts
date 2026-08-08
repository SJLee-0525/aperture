/** Storage 이미지 한 파일의 메타데이터. */
type ImageVariant = { url: string; path: string; w: number; h: number };

/**
 * 메인 이미지와 파생 이미지.
 * preview·thumbnail은 기존 문서와의 하위 호환을 위해 선택값이다.
 */
type ImageMeta = ImageVariant & { preview?: ImageVariant; thumbnail?: ImageVariant };

/**
 * 카드·그리드용 중간 프리뷰 → 작은 썸네일 → 메인 순으로 폴백한다.
 *
 * @param {ImageMeta | null | undefined} image
 * @returns {string}
 */
const imagePreviewUrl = (image: ImageMeta | null | undefined): string =>
  image?.preview?.url || image?.thumbnail?.url || image?.url || "";

/**
 * 행·검색·지도·채팅용 작은 썸네일 → 중간 프리뷰 → 메인 순으로 폴백한다.
 *
 * @param {ImageMeta | null | undefined} image
 * @returns {string}
 */
const imageThumbnailUrl = (image: ImageMeta | null | undefined): string =>
  image?.thumbnail?.url || image?.preview?.url || image?.url || "";

const imagePaths = (image: ImageMeta | null | undefined): string[] =>
  image
    ? [image.path, image.preview?.path, image.thumbnail?.path].filter((path): path is string =>
        Boolean(path),
      )
    : [];

export { imagePaths, imagePreviewUrl, imageThumbnailUrl };
export type { ImageMeta, ImageVariant };
