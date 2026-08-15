import { afterEach, describe, expect, it, vi } from "vitest";

import { getContentSource, shouldUseMockContent } from "@/lib/content/content-source";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("shouldUseMockContent", () => {
  it("개발 환경에서 Supabase 설정이 없으면 mock을 사용한다", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(shouldUseMockContent()).toBe(true);
  });

  it("운영 환경에서 Supabase 설정이 없으면 즉시 실패한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => shouldUseMockContent()).toThrow("Supabase 공개 콘텐츠 설정이 없습니다");
  });

  it("프로덕션 빌드가 확정한 플래그를 그대로 읽는다 — 여기서 배포 환경을 다시 판정하지 않는다", () => {
    // 이 함수는 브라우저에서도 돌고, 거기에는 배포 환경을 알려 줄 값이 없다.
    // mock 프로덕션 빌드를 막는 일은 `assertDeployableContentSource` 가 빌드 시점에 맡는다.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "1");
    vi.stubEnv("VERCEL", "1");

    expect(shouldUseMockContent()).toBe(true);
  });

  it("Supabase 설정이 있으면 실데이터를 사용한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    expect(shouldUseMockContent()).toBe(false);
  });

  it("환경변수 전환을 캐시 키에 사용할 명시적 콘텐츠 소스로 변환한다", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "1");
    expect(getContentSource()).toBe("mock");

    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(getContentSource()).toBe("live");
  });
});
