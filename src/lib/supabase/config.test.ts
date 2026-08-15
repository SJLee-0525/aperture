import { afterEach, describe, expect, it, vi } from "vitest";

import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supabaseUrl", () => {
  it("trailing slash 와 앞뒤 공백을 origin 으로 정규화한다", () => {
    // 소비자가 origin 정확 비교를 하므로 슬래시가 남으면 정상 URL 전체가 거부된다.
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://test.supabase.co/ ");
    expect(supabaseUrl()).toBe("https://test.supabase.co");
  });

  it("경로가 붙어도 origin 만 남긴다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co/rest/v1");
    expect(supabaseUrl()).toBe("https://test.supabase.co");
  });

  it("로컬 스택의 http 와 포트는 허용한다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    expect(supabaseUrl()).toBe("http://127.0.0.1:54321");
  });

  it("credentials 포함 URL·잘못된 URL·미설정은 빈 값으로 비활성 처리한다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://user:pw@test.supabase.co");
    expect(supabaseUrl()).toBe("");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    expect(supabaseUrl()).toBe("");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(supabaseUrl()).toBe("");
  });
});

describe("isSupabaseConfigured", () => {
  it("정규화에 실패한 URL 은 설정되지 않은 것으로 본다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("URL 과 key 가 모두 유효해야 참이다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(isSupabaseConfigured()).toBe(true);
  });
});
