import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldUseMockContent } from "@/lib/content/content-source";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("shouldUseMockContent", () => {
  it("개발 환경에서 Firebase 설정이 없으면 mock을 사용한다", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");

    expect(shouldUseMockContent()).toBe(true);
  });

  it("운영 환경에서 Firebase 설정이 없으면 즉시 실패한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");

    expect(() => shouldUseMockContent()).toThrow("Firebase 공개 콘텐츠 설정이 없습니다");
  });

  it("운영 환경에서도 명시적 mock 빌드는 허용한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "1");

    expect(shouldUseMockContent()).toBe(true);
  });

  it("Firebase 설정이 있으면 실데이터를 사용한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "key");

    expect(shouldUseMockContent()).toBe(false);
  });
});
