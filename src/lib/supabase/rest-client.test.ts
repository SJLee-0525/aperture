import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { restFetch } from "@/lib/supabase/rest-client";

const ORIGIN = "https://example.supabase.co";
const KEY = "publishable-key";

/** 마지막 호출의 URL 과 init 을 그대로 돌려주는 fetch 대역. */
const stubFetch = (status = 200) => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response("[]", { status }));
  });
  return calls;
};

const headersOf = (init: RequestInit) => init.headers as Record<string, string>;

describe("restFetch", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ORIGIN);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", KEY);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("publishable key 를 apikey 헤더로만 보낸다", async () => {
    const calls = stubFetch();

    await restFetch({ path: "photos" });

    expect(headersOf(calls[0].init).apikey).toBe(KEY);
    expect(headersOf(calls[0].init).Authorization).toBeUndefined();
  });

  it("access token 은 Authorization 으로만 나가고 apikey 를 덮지 않는다", async () => {
    const calls = stubFetch();

    await restFetch({ path: "photos", accessToken: "token" });

    expect(headersOf(calls[0].init)).toMatchObject({
      apikey: KEY,
      Authorization: "Bearer token",
    });
  });

  it("본문이 있을 때만 Content-Type 을 붙이고 JSON 으로 보낸다", async () => {
    const calls = stubFetch();

    await restFetch({ path: "rpc/match", method: "POST", body: { a: 1 } });
    await restFetch({ path: "photos" });

    expect(headersOf(calls[0].init)["Content-Type"]).toBe("application/json");
    expect(calls[0].init.body).toBe('{"a":1}');
    expect(headersOf(calls[1].init)["Content-Type"]).toBeUndefined();
  });

  it("params 가 없으면 물음표를 붙이지 않는다", async () => {
    const calls = stubFetch();

    await restFetch({ path: "photos" });
    await restFetch({ path: "photos", params: new URLSearchParams({ select: "id" }) });

    expect(calls[0].url).toBe(`${ORIGIN}/rest/v1/photos`);
    expect(calls[1].url).toBe(`${ORIGIN}/rest/v1/photos?select=id`);
  });

  it("cache 를 주면 ISR 설정을, 없으면 no-store 를 쓴다", async () => {
    const calls = stubFetch();

    await restFetch({ path: "photos", cache: { revalidate: 60, tags: ["db:photos"] } });
    await restFetch({ path: "photos" });

    expect(calls[0].init).toMatchObject({ next: { revalidate: 60, tags: ["db:photos"] } });
    expect(calls[0].init.cache).toBeUndefined();
    expect(calls[1].init.cache).toBe("no-store");
  });

  it("retry 를 켜야만 5xx 를 다시 시도한다", async () => {
    const failing = stubFetch(503);

    await restFetch({ path: "photos" });
    expect(failing).toHaveLength(1);

    const retried = stubFetch(503);
    await restFetch({ path: "photos", retry: true });
    expect(retried.length).toBeGreaterThan(1);
  });

  it("호출부 헤더가 기본 헤더 위에 얹힌다", async () => {
    const calls = stubFetch();

    await restFetch({ path: "rag_documents", headers: { Range: "0-99" } });

    expect(headersOf(calls[0].init)).toMatchObject({ apikey: KEY, Range: "0-99" });
  });
});
