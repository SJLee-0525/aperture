import { afterEach, describe, expect, it, vi } from "vitest";

import { getContentSource, shouldUseMockContent } from "@/lib/content/content-source";

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

  it("Vercel 프로덕션 빌드에서 NEXT_PUBLIC_USE_MOCK=1 이면 즉시 실패한다 — mock 노출 사고 차단", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "1");
    vi.stubEnv("VERCEL", "1");

    expect(() => shouldUseMockContent()).toThrow("Vercel 프로덕션 빌드에서 금지");
  });

  it("로컬 프로덕션 빌드는 명시적 mock 을 허용한다 — mock 빌드 점검 용도", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "1");
    vi.stubEnv("VERCEL", "");

    expect(shouldUseMockContent()).toBe(true);
  });

  it("Firebase 설정이 있으면 실데이터를 사용한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "key");

    expect(shouldUseMockContent()).toBe(false);
  });

  it("환경변수 전환을 캐시 키에 사용할 명시적 콘텐츠 소스로 변환한다", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "1");
    expect(getContentSource()).toBe("mock");

    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "0");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "key");
    expect(getContentSource()).toBe("live");
  });
});
