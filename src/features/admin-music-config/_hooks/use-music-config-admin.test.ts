// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(async () => undefined),
}));

vi.mock("@/lib/admin/music-config-repository", () => ({
  getMusicConfigRepository: () => ({ get: mocks.get, set: mocks.set }),
}));

import { useMusicConfigAdmin } from "@/features/admin-music-config/_hooks/use-music-config-admin";

const entry = (period: string, title: string) => ({ period, title: { ko: title, en: title } });

const ready = async () => {
  const view = renderHook(() => useMusicConfigAdmin());
  await waitFor(() => expect(view.result.current.status).toBe("ready"));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue({
    intro: { ko: "소개", en: "Intro" },
    career: [entry("2024", "협연")],
    education: [entry("2020", "학교")],
  });
});

afterEach(cleanup);

describe("경력·학력 편집", () => {
  it("두 목록은 서로를 건드리지 않는다", async () => {
    // 한 setter 를 공유하므로 key 를 잘못 넘기면 학력 편집이 경력에 들어간다.
    const { result } = await ready();

    act(() => result.current.addEntry("career"));
    act(() => result.current.editPeriod("career", 1, "2026"));

    expect(result.current.career.map(({ period }) => period)).toEqual(["2024", "2026"]);
    expect(result.current.education).toEqual([entry("2020", "학교")]);
  });

  it("제목은 언어별로 따로 고친다", async () => {
    const { result } = await ready();

    act(() => result.current.editTitle("education", 0, "en", "School"));

    expect(result.current.education[0]?.title).toEqual({ ko: "학교", en: "School" });
  });

  it("이동과 삭제가 배열 순서를 그대로 반영한다", async () => {
    const { result } = await ready();

    act(() => result.current.addEntry("career"));
    act(() => result.current.editPeriod("career", 1, "2026"));
    act(() => result.current.moveEntry("career", 1, -1));

    expect(result.current.career.map(({ period }) => period)).toEqual(["2026", "2024"]);

    act(() => result.current.removeEntry("career", 0));
    expect(result.current.career.map(({ period }) => period)).toEqual(["2024"]);
  });
});

describe("저장 경계", () => {
  it("음악 설정 문서는 한 화면이 소유하므로 전체를 저장한다", async () => {
    // site/config 와 달리 music 문서를 나눠 쓰는 화면이 없다. 병합할 상대가 없으니
    // 부분 저장이 아니라 문서 전체를 쓴다.
    const { result } = await ready();

    act(() => result.current.editIntro("ko", "새 소개"));
    await act(async () => {
      await result.current.save();
    });

    expect(mocks.set).toHaveBeenCalledExactlyOnceWith({
      intro: { ko: "새 소개", en: "Intro" },
      career: [entry("2024", "협연")],
      education: [entry("2020", "학교")],
    });
  });

  it("저장 실패는 화면에 남기고 저장됨 표시를 켜지 않는다", async () => {
    mocks.set.mockRejectedValue(new Error("저장 실패"));
    const { result } = await ready();

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).toBe("저장 실패");
    expect(result.current.saved).toBe(false);
  });

  it("불러오기 실패는 오류 상태로 끝난다", async () => {
    mocks.get.mockRejectedValue(new Error("불러오기 실패"));
    const { result } = renderHook(() => useMusicConfigAdmin());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
