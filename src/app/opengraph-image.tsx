import { createSiteImage, SITE_IMAGE_SIZE } from "@/lib/metadata/create-site-image";

export const alt = "Sungjoon Lee — Developer, Photographer, Pianist";
export const size = SITE_IMAGE_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return createSiteImage();
}
