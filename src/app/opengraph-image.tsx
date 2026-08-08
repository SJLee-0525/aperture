import { createSiteImage, SITE_IMAGE_SIZE } from "@/lib/metadata/create-site-image";

export const alt = "Sungjoon Lee — Developer, Photographer, Pianist";
export const size = SITE_IMAGE_SIZE;
export const contentType = "image/png";

/**
 * 사이트 기본 Open Graph 이미지를 생성한다.
 * @returns {Promise<ImageResponse>} 브랜드 워드마크가 포함된 PNG 응답.
 */
export default async function OpenGraphImage() {
  return createSiteImage();
}
