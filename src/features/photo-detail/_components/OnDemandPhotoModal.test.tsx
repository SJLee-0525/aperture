// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnDemandPhotoModal } from "@/features/photo-detail/_components/OnDemandPhotoModal";

import type { Photo } from "@/types/photo";

const photoModalRender = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
  usePathname: () => "/photo",
  useSearchParams: () => new URLSearchParams("photo=p1"),
}));
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = (props: Record<string, unknown>) => {
      photoModalRender(props);
      return null;
    };
    return Stub;
  },
}));
vi.mock("@/features/photo-detail/_components/PhotoModal", () => ({
  PhotoModal: () => null,
}));
vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: {
      photoLoadingLabel: "사진 불러오는 중",
      closeLabel: "닫기",
      photoLoadError: "불러오지 못했습니다",
      errorRetry: "다시 시도",
    },
    setLang: vi.fn(),
  }),
}));

const serialized = (id: string) =>
  ({ id, shotAt: new Date(0).toISOString() }) as unknown as Photo & { shotAt: string };

/**
 * 응답 이후 마이크로태스크·재렌더 사이클을 여러 번 비워 재요청 루프 여부를 드러낸다.
 */
const flushCycles = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

describe("OnDemandPhotoModal fetch 회귀", () => {
  afterEach(() => {
    cleanup();
    photoModalRender.mockClear();
    vi.unstubAllGlobals();
  });

  it("캐시 여부와 무관하게 이미지가 준비되는 순간 실제 모달을 드러낸다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ photos: ["p3", "p1", "p2"].map(serialized), tags: [] }),
      }),
    );

    render(<OnDemandPhotoModal photoIds={["p1", "p2", "p3"]} endpoint="/api/photos" />);

    await waitFor(() =>
      expect(photoModalRender.mock.calls.some(([props]) => props.revealed === false)).toBe(true),
    );
    const props = photoModalRender.mock.calls.at(-1)?.[0] as {
      onImageReady: (id: string) => void;
    };
    act(() => props.onImageReady("p1"));

    await waitFor(() =>
      expect(photoModalRender.mock.calls.some(([nextProps]) => nextProps.revealed === true)).toBe(
        true,
      ),
    );
  });

  it("화면 문맥 사용 여부를 실제 사진 모달에 전달한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ photos: ["p3", "p1", "p2"].map(serialized), tags: [] }),
      }),
    );

    render(<OnDemandPhotoModal photoIds={["p1", "p2", "p3"]} endpoint="/api/photos" chatTarget />);

    await waitFor(() =>
      expect(photoModalRender.mock.calls.some(([props]) => props.chatTarget === true)).toBe(true),
    );
  });

  it("태그가 0개인 사이트에서도 상세 요청은 1회로 끝난다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ photos: ["p3", "p1", "p2"].map(serialized), tags: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OnDemandPhotoModal photoIds={["p1", "p2", "p3"]} endpoint="/api/photos" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flushCycles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stale 이웃 id가 응답에 영영 없어도 재요청 루프에 빠지지 않는다", async () => {
    // ISR 시점 photoIds에는 ghost가 있지만 라이브 목록(응답)에는 없다.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        photos: ["p1", "p2"].map(serialized),
        tags: [{ id: "t1", ko: "태그", en: "tag" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OnDemandPhotoModal photoIds={["ghost", "p1", "p2"]} endpoint="/api/photos" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await flushCycles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("404 후 재시도 버튼을 누르면 정확히 한 번만 다시 요청한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ photos: ["p3", "p1", "p2"].map(serialized), tags: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<OnDemandPhotoModal photoIds={["p1", "p2", "p3"]} endpoint="/api/photos" />);

    const retryButton = await screen.findByRole("button", { name: "다시 시도" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(retryButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await flushCycles();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
