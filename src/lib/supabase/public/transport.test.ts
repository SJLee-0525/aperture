import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchRow,
  fetchRowAsUser,
  selectPublished,
  selectRows,
} from "@/lib/supabase/public/transport";

type FetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

const stubFetch = (response: unknown = okJson([])) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const lastCall = (fetchMock: ReturnType<typeof vi.fn>): [string, FetchInit] =>
  fetchMock.mock.calls.at(-1) as [string, FetchInit];

describe("supabase public transport", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("publishable 키는 apikey 헤더로만 실리고 Authorization 은 없다", async () => {
    const fetchMock = stubFetch();
    await selectPublished("photos");

    const [url, init] = lastCall(fetchMock);
    expect(url.startsWith("https://test.supabase.co/rest/v1/photos?")).toBe(true);
    expect((init.headers as Record<string, string>).apikey).toBe("sb_publishable_test");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("공개 목록은 published 필터·서술자 정렬·논리 이름 태그로 캐시된다", async () => {
    const fetchMock = stubFetch();
    await selectPublished("photos");

    const [url, init] = lastCall(fetchMock);
    const params = new URL(url).searchParams;
    expect(params.get("select")).toBe("id,published,sort_order,data");
    expect(params.get("order")).toBe("sort_order.asc,id.asc");
    expect(params.get("published")).toBe("eq.true");
    expect(init.next).toEqual({ revalidate: 3600, tags: ["db:photos"] });
  });

  it("공개 목록은 max_rows 구간을 지정해 조용한 절단을 막는다", async () => {
    const fetchMock = stubFetch();
    await selectPublished("photos");

    const params = new URL(lastCall(fetchMock)[0]).searchParams;
    expect(params.get("limit")).toBe("1000");
    expect(params.get("offset")).toBe("0");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("한 페이지가 꽉 차면 다음 구간을 이어 읽는다", async () => {
    const page = (from: number, count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `p${from + index}`,
        published: true,
        sort_order: from + index,
        data: {},
      }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson(page(0, 1000)))
      .mockResolvedValueOnce(okJson(page(1000, 2)));
    vi.stubGlobal("fetch", fetchMock);

    const rows = await selectPublished("photos");

    expect(rows).toHaveLength(1002);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(lastCall(fetchMock)[0]).searchParams.get("offset")).toBe("1000");
  });

  it("fresh 는 no-store 로 캐시를 우회한다", async () => {
    const fetchMock = stubFetch();
    await selectPublished("photos", { fresh: true });

    const [, init] = lastCall(fetchMock);
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
  });

  it("행 스칼라가 data 안의 구형 잔존값을 덮는다", async () => {
    stubFetch(
      okJson([
        {
          id: "p1",
          published: true,
          sort_order: 7,
          data: { published: false, order: 99, title: { ko: "제목", en: "Title" } },
        },
      ]),
    );

    const [row] = await selectPublished("photos");
    expect(row.id).toBe("p1");
    expect(row.data.published).toBe(true);
    expect(row.data.order).toBe(7);
    expect(row.data.title).toEqual({ ko: "제목", en: "Title" });
  });

  it("dev_articles 쿼리에는 sort_order 가 없고 발행일 정렬을 쓴다", async () => {
    const fetchMock = stubFetch();
    await selectPublished("devArticles");

    const [url] = lastCall(fetchMock);
    const params = new URL(url).searchParams;
    expect(params.get("select")).toBe(
      "id,published,pinned,slug,published_at,created_at,updated_at,data",
    );
    expect(params.get("select")).not.toContain("sort_order");
    expect(params.get("order")).toBe("published_at.desc.nullslast,id.asc");
  });

  it("태그 사전은 published 필터 없이 id 정렬로 읽고 컬럼을 그대로 병합한다", async () => {
    const fetchMock = stubFetch(okJson([{ id: "react", ko: "리액트", en: "React" }]));
    const rows = await selectRows("devArticleTags");

    const [url] = lastCall(fetchMock);
    const params = new URL(url).searchParams;
    expect(params.get("published")).toBeNull();
    expect(params.get("order")).toBe("id.asc");
    expect(rows[0]).toEqual({ id: "react", data: { ko: "리액트", en: "React" } });
  });

  it("published 게이트가 없는 컬렉션에 selectPublished 를 쓰면 요청 전에 실패한다", async () => {
    const fetchMock = stubFetch();
    await expect(selectPublished("devArticleTags")).rejects.toThrow("published 게이트");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("문서 한 건은 빈 배열을 null 로 해석하고 문서 태그로 캐시된다", async () => {
    const fetchMock = stubFetch();
    await expect(fetchRow("photos", "p1", "사진")).resolves.toBeNull();

    const [url, init] = lastCall(fetchMock);
    const params = new URL(url).searchParams;
    expect(params.get("id")).toBe("eq.p1");
    expect(params.get("published")).toBe("eq.true");
    expect(init.next?.tags).toEqual(["db:photos:p1"]);
  });

  it("site 문서 조회에는 published 필터가 없다", async () => {
    const fetchMock = stubFetch(okJson([{ id: "config", data: { name: { ko: "", en: "" } } }]));
    await fetchRow("site", "config", "site");

    const [url] = lastCall(fetchMock);
    expect(new URL(url).searchParams.get("published")).toBeNull();
  });

  it("PostgREST 문법 문자가 든 ID 도 URLSearchParams 로 인코딩된다", async () => {
    const fetchMock = stubFetch();
    await fetchRow("photos", "a b&c", "사진");

    const [url] = lastCall(fetchMock);
    expect(url).toContain("id=eq.a+b%26c");
  });

  it("오류 상태는 빈 결과로 위장하지 않고 던진다", async () => {
    stubFetch({ ok: false, status: 401, json: async () => ({}) });
    await expect(selectPublished("photos")).rejects.toThrow("photos 읽기 실패 (401)");

    stubFetch({ ok: false, status: 429, json: async () => ({}) });
    await expect(fetchRow("site", "config", "site")).rejects.toThrow("site 읽기 실패 (429)");
  });

  it("관리자 단건 조회는 apikey 와 사용자 Bearer 를 함께 보내고 초안도 대상이다", async () => {
    const fetchMock = stubFetch(okJson([{ id: "a1", published: false, sort_order: 0, data: {} }]));
    const data = await fetchRowAsUser("photos", "a1", "user-token");

    const [url, init] = lastCall(fetchMock);
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe("sb_publishable_test");
    expect(headers.Authorization).toBe("Bearer user-token");
    expect(init.cache).toBe("no-store");
    expect(new URL(url).searchParams.get("published")).toBeNull();
    expect(data?.published).toBe(false);
  });
});
