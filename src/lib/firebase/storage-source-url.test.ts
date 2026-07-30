import { describe, expect, it } from "vitest";

import { isAllowedStorageSourceUrl } from "@/lib/firebase/storage-source-url";

const bucket = "portfolio.firebasestorage.app";

describe("isAllowedStorageSourceUrl", () => {
  it("현재 Firebase Storage 버킷의 다운로드 URL만 허용한다", () => {
    expect(
      isAllowedStorageSourceUrl(
        `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/photos%2Fid.webp?alt=media`,
        bucket,
      ),
    ).toBe(true);
    expect(
      isAllowedStorageSourceUrl(`https://storage.googleapis.com/${bucket}/photos/id.webp`, bucket),
    ).toBe(true);
  });

  it("다른 호스트·버킷과 비 HTTPS URL을 거부한다", () => {
    expect(isAllowedStorageSourceUrl("https://example.com/image.webp", bucket)).toBe(false);
    expect(
      isAllowedStorageSourceUrl(
        "https://firebasestorage.googleapis.com/v0/b/other/o/image.webp",
        bucket,
      ),
    ).toBe(false);
    expect(
      isAllowedStorageSourceUrl(
        `http://firebasestorage.googleapis.com/v0/b/${bucket}/o/image.webp`,
        bucket,
      ),
    ).toBe(false);
  });
});
