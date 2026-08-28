import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn<(row: unknown) => unknown>(() => ({ data: [{ id: "d1" }], error: null })),
  updateSelect: vi.fn<(row: unknown) => unknown>(() => ({ data: [{ id: "d1" }], error: null })),
  maybeSingle: vi.fn(() => ({ data: { data: {} }, error: null })),
}));

const builder = () => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: () => Promise.resolve(mocks.maybeSingle()),
    insert: (row: unknown) => Promise.resolve(mocks.insert(row)),
    update: (row: unknown) => ({
      eq: () => ({ select: () => Promise.resolve(mocks.updateSelect(row)) }),
    }),
  };
  return chain;
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({ from: () => builder() }),
}));
vi.mock("@/lib/ai/request-rag-sync", () => ({ requestRagSync: vi.fn() }));
vi.mock("@/lib/cache/request-revalidate", () => ({ requestPublicRevalidate: vi.fn() }));
vi.mock("@/lib/supabase/storage", () => ({ deleteDevProjectImages: vi.fn() }));

import { devProjects } from "@/lib/supabase/dev";

import type { DevProjectInput } from "@/lib/supabase/dev";

const projectInput = (href: string): DevProjectInput => ({
  title: { ko: "프로젝트", en: "Project" },
  category: { ko: "웹", en: "Web" },
  year: "2026",
  period: { ko: "", en: "" },
  position: { ko: "", en: "" },
  summary: { ko: "", en: "" },
  overview: { ko: "", en: "" },
  features: [],
  roles: [],
  troubleshooting: [],
  achievements: [],
  techTags: [],
  links: [{ label: "링크", href }],
  cover: null,
  images: [],
  order: 0,
  published: false,
});

describe("devProjects 저장 경계", () => {
  beforeEach(() => vi.clearAllMocks());

  it("실행 가능한 주소는 create·update·patchData 어디서도 저장하지 않는다", async () => {
    const unsafe = projectInput("javascript:alert(1)");

    await expect(devProjects.create("d1", unsafe)).rejects.toThrow("사용할 수 없는 주소");
    await expect(devProjects.update("d1", unsafe)).rejects.toThrow("사용할 수 없는 주소");
    await expect(devProjects.patchData("d1", { links: unsafe.links })).rejects.toThrow(
      "사용할 수 없는 주소",
    );

    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.updateSelect).not.toHaveBeenCalled();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("폼보다 좁은 저장 경계라 기존 http 주소는 보존한다", async () => {
    await devProjects.update("d1", projectInput("http://example.com/project"));

    expect(mocks.updateSelect).toHaveBeenCalledOnce();
  });

  it("링크를 건드리지 않는 이미지 patch는 그대로 통과한다", async () => {
    await devProjects.patchData("d1", { cover: null, images: [] });

    expect(mocks.maybeSingle).toHaveBeenCalledOnce();
    expect(mocks.updateSelect).toHaveBeenCalledOnce();
  });
});
