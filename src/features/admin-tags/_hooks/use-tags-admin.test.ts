// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSiteConfig: vi.fn(),
  updateFields: vi.fn(async () => undefined),
  listPhotos: vi.fn(async () => [] as Array<{ tags: string[] }>),
}));

vi.mock("@/lib/admin/site-config-repository", () => ({
  getSiteConfigRepository: () => ({ get: mocks.getSiteConfig, updateFields: mocks.updateFields }),
}));
vi.mock("@/lib/admin/photo-repository", () => ({
  getPhotoRepository: () => ({ list: mocks.listPhotos }),
}));

import { useTagsAdmin } from "@/features/admin-tags/_hooks/use-tags-admin";

const tag = (id: string) => ({ id, ko: id, en: id });

const ready = async () => {
  const view = renderHook(() => useTagsAdmin());
  await waitFor(() => expect(view.result.current.status).toBe("ready"));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSiteConfig.mockResolvedValue({ tags: [tag("seoul"), tag("tokyo")] });
  mocks.listPhotos.mockResolvedValue([]);
});

afterEach(cleanup);

describe("태그 사전 편집", () => {
  it("id 는 사진이 참조하는 키라 ko·en 만 고친다", async () => {
    const { result } = await ready();

    act(() => result.current.editLabel("seoul", "ko", "서울"));

    expect(result.current.tags).toEqual([
      { id: "seoul", ko: "서울", en: "seoul" },
      tag("tokyo"),
    ]);
  });

  it("한 틱에 두 번 추가해도 두 번째가 첫 번째를 본다", async () => {
    // 엔터 연타로 같은 id 가 두 번 들어오면 사진이 어느 쪽을 참조하는지 알 수 없다.
    const { result } = await ready();

    let second: string | null = null;
    act(() => {
      result.current.addTag(tag("busan"));
      second = result.current.addTag(tag("busan"));
    });

    expect(second).toBe('이미 "busan" 태그가 있습니다.');
    expect(result.current.tags.filter(({ id }) => id === "busan")).toHaveLength(1);
  });

  it("id 가 비면 추가하지 않는다", async () => {
    const { result } = await ready();

    let reason: string | null = null;
    act(() => {
      reason = result.current.addTag({ id: "  ", ko: "부산", en: "Busan" });
    });

    expect(reason).toBe("태그 id(영문 슬러그)를 입력하세요.");
    expect(result.current.tags).toHaveLength(2);
  });

  it("드래그 순서가 공개 필터 칩 순서다", async () => {
    const { result } = await ready();

    act(() => result.current.reorder("tokyo", "seoul"));

    expect(result.current.tags.map(({ id }) => id)).toEqual(["tokyo", "seoul"]);
  });

  it("사진이 쓰는 태그 수를 세어 삭제 잠금 근거로 넘긴다", async () => {
    mocks.listPhotos.mockResolvedValue([{ tags: ["seoul"] }, { tags: ["seoul", "tokyo"] }]);
    const { result } = await ready();

    await waitFor(() => expect(result.current.usage).toEqual({ seoul: 2, tokyo: 1 }));
  });
});

describe("저장", () => {
  it("이 화면이 소유한 tags 만 병합한다", async () => {
    // site/config 는 전역·연락·소개 화면과 나눠 쓰는 단일 문서다. 전체 snapshot 을
    // 보내면 다른 화면이 방금 저장한 값이 사라진다.
    const { result } = await ready();

    act(() => result.current.removeTag("tokyo"));
    await act(async () => {
      await result.current.save();
    });

    expect(mocks.updateFields).toHaveBeenCalledExactlyOnceWith({ tags: [tag("seoul")] });
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
    const { result } = renderHook(() => useTagsAdmin());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("불러오기 실패");
  });
});
