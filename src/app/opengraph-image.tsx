import { createSiteImage, SITE_IMAGE_SIZE } from "@/lib/metadata/create-site-image";

export const alt = "Sungjoon Lee — Photographer, Pianist, Developer";
export const size = SITE_IMAGE_SIZE;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return createSiteImage();
}
