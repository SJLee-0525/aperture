/** Storage 이미지 한 파일의 메타데이터. */
type ImageVariant = { url: string; path: string; w: number; h: number };

/**
 * 메인 이미지와 목록용 썸네일.
 * thumbnail은 기존 문서와의 하위 호환을 위해 선택값이며, 없으면 메인 이미지를 사용한다.
 */
type ImageMeta = ImageVariant & { thumbnail?: ImageVariant };

const imagePreviewUrl = (image: ImageMeta | null | undefined): string =>
  image?.thumbnail?.url || image?.url || "";

const imagePaths = (image: ImageMeta | null | undefined): string[] =>
  image ? [image.path, image.thumbnail?.path].filter((path): path is string => Boolean(path)) : [];

export { imagePaths, imagePreviewUrl };
export type { ImageMeta, ImageVariant };
