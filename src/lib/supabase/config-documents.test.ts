import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn<() => unknown>(() => ({ data: null, error: null })),
  upsert: vi.fn<(row: unknown) => unknown>(() => ({ data: [{ id: "dev" }], error: null })),
  rpc: vi.fn<(name: string, args: unknown) => unknown>(() => ({ data: 1, error: null })),
  requestRagSync: vi.fn(),
  requestPublicRevalidate: vi.fn(),
}));

/** supabase-js 빌더 대역 — 설정 문서 경로가 쓰는 체인만 재현한다. */
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(mocks.maybeSingle()) }) }),
      upsert: (row: unknown) => ({ select: () => Promise.resolve(mocks.upsert(row)) }),
    }),
    rpc: (name: string, args: unknown) => Promise.resolve(mocks.rpc(name, args)),
  }),
}));
vi.mock("@/lib/ai/request-rag-sync", () => ({ requestRagSync: mocks.requestRagSync }));
vi.mock("@/lib/cache/request-revalidate", () => ({
  requestPublicRevalidate: mocks.requestPublicRevalidate,
  requestPublicPathRevalidate: vi.fn(),
}));

import { documentCacheTag } from "@/constants/cache";
import { COLLECTIONS, SITE_DEV_DOC, SITE_DOC } from "@/constants/collections";
import { EMPTY_DEV_CONFIG, EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { getDevConfigAdmin, updateDevConfig } from "@/lib/supabase/dev";
import { getSiteConfig, updateSiteConfigFields } from "@/lib/supabase/site";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.maybeSingle.mockReturnValue({ data: null, error: null });
  mocks.upsert.mockReturnValue({ data: [{ id: "dev" }], error: null });
  mocks.rpc.mockReturnValue({ data: 1, error: null });
});

describe("첫 저장 전 부트스트랩", () => {
  // mock 시드로 채우면 관리자가 그대로 저장하는 순간 데모 문구가 실데이터로 영속된다.
  it("문서가 없으면 빈 설정을 돌려준다", async () => {
    await expect(getSiteConfig()).resolves.toEqual(EMPTY_SITE_CONFIG);
    await expect(getDevConfigAdmin()).resolves.toEqual(EMPTY_DEV_CONFIG);
  });

  it("data 가 null 인 행도 빈 필드로 디코딩한다", async () => {
    mocks.maybeSingle.mockReturnValue({ data: { data: null }, error: null });

    const config = await getSiteConfig();

    expect(config.name).toEqual({ ko: "", en: "" });
    expect(config.tags).toEqual([]);
  });

  it("조회 오류는 빈 설정으로 위장하지 않는다", async () => {
    mocks.maybeSingle.mockReturnValue({ data: null, error: { message: "boom" } });

    await expect(getSiteConfig()).rejects.toThrow("사이트 설정을 불러오지 못했습니다.");
  });
});

describe("사이트 설정 병합 저장", () => {
  // 화면마다 소유한 필드가 달라 전체 snapshot 으로 덮으면 다른 화면의 최신 변경이 사라진다.
  // 병합을 DB 한 문장으로 미루는 것이 그 경합을 없애는 방법이다.
  it("화면이 수정한 필드만 병합 RPC 로 보낸다", async () => {
    await updateSiteConfigFields({ bio: { ko: "소개", en: "Bio" } });

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("merge_site_document", {
      doc_id: SITE_DOC,
      patch: { bio: { ko: "소개", en: "Bio" } },
    });
    expect(mocks.requestPublicRevalidate).toHaveBeenCalledWith(
      documentCacheTag(COLLECTIONS.SITE, SITE_DOC),
    );
  });

  it("갱신 행이 1이 아니면 실패로 처리한다", async () => {
    mocks.rpc.mockReturnValue({ data: 0, error: null });

    await expect(updateSiteConfigFields({ bio: { ko: "", en: "" } })).rejects.toThrow(
      "사이트 설정 저장에 실패했습니다.",
    );
    expect(mocks.requestPublicRevalidate).not.toHaveBeenCalled();
  });

  it("태그 사전을 고치면 사진 태그 문서도 다시 만든다", async () => {
    // 태그 이름은 사진 RAG 문서에 펼쳐져 들어간다. 사전만 갱신하면 검색이 옛 이름을 쓴다.
    await updateSiteConfigFields({ tags: [{ id: "seoul", ko: "서울", en: "Seoul" }] });

    expect(mocks.requestRagSync.mock.calls).toEqual([
      ["siteConfig", SITE_DOC],
      ["photoTags", SITE_DOC],
    ]);
  });

  it("태그를 건드리지 않으면 설정 문서만 동기화한다", async () => {
    await updateSiteConfigFields({ bio: { ko: "소개", en: "Bio" } });

    expect(mocks.requestRagSync).toHaveBeenCalledExactlyOnceWith("siteConfig", SITE_DOC);
  });
});

describe("개발 설정 저장", () => {
  it("문서 전체를 upsert 하고 문서 태그를 무효화한다", async () => {
    await updateDevConfig(EMPTY_DEV_CONFIG);

    const [row] = mocks.upsert.mock.calls[0] as [{ id: string }];
    expect(row.id).toBe(SITE_DEV_DOC);
    expect(mocks.requestPublicRevalidate).toHaveBeenCalledWith(
      documentCacheTag(COLLECTIONS.SITE, SITE_DEV_DOC),
    );
    expect(mocks.requestRagSync).toHaveBeenCalledExactlyOnceWith("devConfig", SITE_DEV_DOC);
  });

  it("반환 행이 없으면 RLS 거부를 실패로 처리한다", async () => {
    mocks.upsert.mockReturnValue({ data: [], error: null });

    await expect(updateDevConfig(EMPTY_DEV_CONFIG)).rejects.toThrow(
      "개발 설정 저장에 실패했습니다.",
    );
    expect(mocks.requestRagSync).not.toHaveBeenCalled();
  });
});
