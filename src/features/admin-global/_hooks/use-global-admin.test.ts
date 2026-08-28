// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSiteConfig: vi.fn(),
  updateFields: vi.fn<(fields: Record<string, unknown>) => Promise<void>>(async () => undefined),
}));

vi.mock("@/lib/admin/site-config-repository", () => ({
  getSiteConfigRepository: () => ({ get: mocks.getSiteConfig, updateFields: mocks.updateFields }),
}));

import { useGlobalAdmin } from "@/features/admin-global/_hooks/use-global-admin";

const text = (value: string) => ({ ko: value, en: value });

const loaded = {
  tagline: text("태그라인"),
  landingLead: text("랜딩"),
  contactLead: text("연락"),
  links: [{ label: "깃헙", href: "https://github.test/me" }],
  bio: text("소개"),
  name: text("이름"),
  tags: [{ id: "seoul", ko: "서울", en: "Seoul" }],
};

const ready = async () => {
  const view = renderHook(() => useGlobalAdmin());
  await waitFor(() => expect(view.result.current.status).toBe("ready"));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSiteConfig.mockResolvedValue(loaded);
});

afterEach(cleanup);

describe("저장 경계", () => {
  it("전역 네 필드만 병합하고 bio·tags 는 건드리지 않는다", async () => {
    // site/config 를 소개 화면·태그 화면과 나눠 쓴다. 로드한 전체를 되보내면 그쪽이
    // 방금 저장한 값을 오래된 snapshot 으로 덮는다.
    const { result } = await ready();

    await act(async () => {
      await result.current.save();
    });

    const [fields] = mocks.updateFields.mock.calls[0]!;
    expect(Object.keys(fields).sort()).toEqual(["contactLead", "landingLead", "links", "tagline"]);
  });

  it("저장 전에 링크를 정리하고 정리된 값을 폼에 되돌린다", async () => {
    const { result } = await ready();

    act(() => result.current.editLink(0, "href", "  https://github.test/me  "));
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.links).toEqual([{ label: "깃헙", href: "https://github.test/me" }]);
  });

  it("저장할 수 없는 링크는 저장 요청 자체를 막는다", async () => {
    // 여기서 통과시키면 공개 정화가 빈 값으로 만들어 링크가 조용히 사라진다.
    const { result } = await ready();

    act(() => result.current.editLink(0, "href", "javascript:alert(1)"));
    await act(async () => {
      await result.current.save();
    });

    expect(mocks.updateFields).not.toHaveBeenCalled();
    expect(result.current.error).toContain("HTTPS");
  });

  it("연락 링크는 mailto 를 허용한다", async () => {
    const { result } = await ready();

    act(() => result.current.editLink(0, "href", "mailto:someone@example.com"));
    await act(async () => {
      await result.current.save();
    });

    const [fields] = mocks.updateFields.mock.calls[0]!;
    expect(fields.links).toEqual([{ label: "깃헙", href: "mailto:someone@example.com" }]);
  });
});

describe("링크 목록 편집", () => {
  it("추가·삭제·이동이 배열 순서를 그대로 반영한다", async () => {
    const { result } = await ready();

    act(() => result.current.addLink());
    act(() => result.current.editLink(1, "label", "인스타"));
    act(() => result.current.moveLink(1, -1));

    expect(result.current.links.map(({ label }) => label)).toEqual(["인스타", "깃헙"]);

    act(() => result.current.removeLink(0));
    expect(result.current.links.map(({ label }) => label)).toEqual(["깃헙"]);
  });
});
