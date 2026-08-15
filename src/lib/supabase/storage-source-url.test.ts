import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAllowedStorageSourceUrl } from "@/lib/supabase/storage-source-url";

const ORIGIN = "https://test.supabase.co";
const PUBLIC = `${ORIGIN}/storage/v1/object/public/media`;

describe("isAllowedStorageSourceUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ORIGIN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("media 공개 객체 URL 만 허용한다", () => {
    expect(isAllowedStorageSourceUrl(`${PUBLIC}/photos/p1/a.webp`)).toBe(true);
    expect(isAllowedStorageSourceUrl(`${PUBLIC}/dev-blog/a1/%ED%95%9C%EA%B8%80.webp`)).toBe(true);
  });

  it("다른 origin·다른 버킷을 거부한다", () => {
    expect(
      isAllowedStorageSourceUrl("https://evil.supabase.co/storage/v1/object/public/media/a.webp"),
    ).toBe(false);
    expect(isAllowedStorageSourceUrl(`${ORIGIN}/storage/v1/object/public/other/a.webp`)).toBe(
      false,
    );
  });

  it("서명 URL 과 이미지 변환 엔드포인트를 거부한다", () => {
    expect(isAllowedStorageSourceUrl(`${ORIGIN}/storage/v1/object/sign/media/a.webp?token=x`)).toBe(
      false,
    );
    expect(isAllowedStorageSourceUrl(`${ORIGIN}/storage/v1/render/image/public/media/a.webp`)).toBe(
      false,
    );
  });

  it("사용자 정보·비표준 포트·비정상 URL 을 거부한다", () => {
    expect(
      isAllowedStorageSourceUrl(
        "https://user:pw@test.supabase.co/storage/v1/object/public/media/a.webp",
      ),
    ).toBe(false);
    expect(
      isAllowedStorageSourceUrl(
        "https://test.supabase.co:8443/storage/v1/object/public/media/a.webp",
      ),
    ).toBe(false);
    expect(isAllowedStorageSourceUrl("not-a-url")).toBe(false);
  });

  it("env 미설정이면 전부 거부한다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(isAllowedStorageSourceUrl(`${PUBLIC}/photos/a.webp`)).toBe(false);
  });
});
