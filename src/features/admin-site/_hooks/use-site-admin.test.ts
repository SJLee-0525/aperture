// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSiteConfig: vi.fn(),
  updateFields: vi.fn(async () => undefined),
}));

vi.mock("@/lib/admin/site-config-repository", () => ({
  getSiteConfigRepository: () => ({ get: mocks.getSiteConfig, updateFields: mocks.updateFields }),
}));

import { useSiteAdmin } from "@/features/admin-site/_hooks/use-site-admin";

const ready = async () => {
  const view = renderHook(() => useSiteAdmin());
  await waitFor(() => expect(view.result.current.status).toBe("ready"));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSiteConfig.mockResolvedValue({
    bio: { ko: "소개", en: "Bio" },
    tagline: { ko: "태그라인", en: "Tagline" },
    links: [{ label: "깃헙", href: "https://github.test/me" }],
    tags: [{ id: "seoul", ko: "서울", en: "Seoul" }],
  });
});

afterEach(cleanup);

describe("사진 소개 편집", () => {
  it("한쪽 언어만 고쳐도 반대쪽은 그대로 둔다", async () => {
    const { result } = await ready();

    act(() => result.current.editBio("en", "About"));

    expect(result.current.bio).toEqual({ ko: "소개", en: "About" });
  });

  it("이 화면이 소유한 bio 만 병합한다", async () => {
    // 같은 site/config 를 전역·연락·태그 화면이 나눠 쓴다. 로드한 전체를 되보내면
    // 그쪽이 방금 저장한 값을 오래된 snapshot 으로 덮는다.
    const { result } = await ready();

    act(() => result.current.editBio("ko", "새 소개"));
    await act(async () => {
      await result.current.save();
    });

    expect(mocks.updateFields).toHaveBeenCalledExactlyOnceWith({
      bio: { ko: "새 소개", en: "Bio" },
    });
  });

  it("저장 실패는 화면에 남기고 저장됨 표시를 켜지 않는다", async () => {
    mocks.updateFields.mockRejectedValue(new Error("저장 실패"));
    const { result } = await ready();

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).toBe("저장 실패");
    expect(result.current.saved).toBe(false);
  });

  it("불러오기 실패는 오류 상태로 끝난다", async () => {
    mocks.getSiteConfig.mockRejectedValue(new Error("불러오기 실패"));
    const { result } = renderHook(() => useSiteAdmin());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
