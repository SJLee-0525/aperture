import { describe, expect, it } from "vitest";

import { pageMetadata, siteMetadata } from "@/lib/seo/metadata";
import { SITE_IMAGE_ALT, SITE_IMAGE_PATH, SITE_IMAGE_SIZE, SITE_TITLE } from "@/lib/seo/site-meta";

const expectSocialImage = (metadata: ReturnType<typeof pageMetadata>) => {
  expect(metadata.openGraph).toMatchObject({
    images: [
      {
        url: SITE_IMAGE_PATH,
        width: SITE_IMAGE_SIZE.width,
        height: SITE_IMAGE_SIZE.height,
        alt: SITE_IMAGE_ALT,
      },
    ],
  });
  expect(metadata.twitter).toMatchObject({
    card: "summary_large_image",
    images: [{ url: SITE_IMAGE_PATH, alt: SITE_IMAGE_ALT }],
  });
};

describe("SEO metadata", () => {
  it("keeps the site image when page metadata overrides social metadata", () => {
    const metadata = pageMetadata({
      lang: "ko",
      title: { ko: "사진 작업", en: "Photography" },
      description: { ko: "사진 작업 설명", en: "Photography description" },
      pathname: "/photo",
    });

    expectSocialImage(metadata);
  });

  it("keeps the site image on the localized landing page", () => {
    const metadata = siteMetadata("ko");

    expect(metadata.title).toEqual({ absolute: SITE_TITLE });
    expectSocialImage(metadata);
  });
});
