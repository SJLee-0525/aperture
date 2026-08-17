// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PhotoModal } from "@/features/photo-detail/_components/PhotoModal";

import type { Photo } from "@/types/photo";

const MOBILE_QUERY = "(max-width: 900px)";

const navigation = vi.hoisted(() => ({
  back: vi.fn(),
  pathname: "/ko/photo",
  searchParams: new URLSearchParams("photo=p2"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: navigation.back, replace: vi.fn() }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, onLoad, onError }: Record<string, unknown>) =>
    createElement("img", { src, alt, onLoad, onError, "data-testid": "slide-image" }),
}));

vi.mock("motion/react", () => {
  const MOTION_ONLY = new Set(["initial", "animate", "exit", "transition"]);
  const strip = (tag: string) => {
    const Component = (props: Record<string, unknown>) =>
      createElement(
        tag,
        Object.fromEntries(Object.entries(props).filter(([key]) => !MOTION_ONLY.has(key))),
      );
    return Component;
  };
  return {
    AnimatePresence: ({ children }: { children: unknown }) => children,
    m: { div: strip("div"), button: strip("button") },
  };
});

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    setLang: vi.fn(),
    dict: {
      closeLabel: "닫기",
      previousImageLabel: "이전 사진",
      nextImageLabel: "다음 사진",
      collapsePhotoInfoLabel: "정보 접기",
      expandPhotoInfoLabel: "정보 펼치기",
      photoLoadError: "사진을 불러오지 못했습니다.",
      errorRetry: "다시 시도",
    },
  }),
}));

vi.mock("@/features/photo-detail/_components/ExifPanel", () => ({ ExifPanel: () => null }));
vi.mock("@/features/photo-detail/_components/ExifPanelSkeleton", () => ({
  ExifPanelSkeleton: () => null,
}));
vi.mock("@/components/ExifStrip", () => ({ ExifStrip: () => null }));
vi.mock("@/hooks/use-register-chat-screen-target", () => ({
  useRegisterChatScreenTarget: () => undefined,
}));
vi.mock("@/hooks/use-overlay-layer", () => ({ useOverlayLayer: () => true }));

const photoOf = (id: string) =>
  ({
    id,
    title: { ko: `사진 ${id}`, en: `photo ${id}` },
    tags: [],
    exif: {},
    image: { url: `https://cdn.test/${id}.webp`, w: 1200, h: 800 },
  }) as unknown as Photo;

const ALL_IDS = ["p1", "p2", "p3"];
const photos = ALL_IDS.map(photoOf);

const setMobile = (mobile: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === MOBILE_QUERY ? mobile : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof matchMedia;
};

const images = () => screen.getAllByTestId("slide-image") as HTMLImageElement[];

const loadAll = () => {
  for (const image of images()) fireEvent.load(image);
};

const track = () => document.querySelector("[data-photo-modal-track]") as HTMLElement;

const point = (x: number, y: number) => ({ clientX: x, clientY: y });

const swipe = (from: number, to: number) => {
  const surface = track();
  fireEvent.touchStart(surface, { touches: [point(from, 300)] });
  fireEvent.touchMove(surface, { touches: [point(to, 300)] });
  fireEvent.touchEnd(surface);
};

describe("PhotoModal", () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams("photo=p2");
    setMobile(false);
    // jsdom 은 레이아웃을 계산하지 않아 스테이지 폭이 0 이면 스와이프가 잠긴다.
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      value: 400,
    });
    Element.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("이전·현재·다음 세 장을 트랙에 올리고 현재만 설명을 갖는다", () => {
    render(<PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} />);

    expect(images().map((image) => image.getAttribute("alt"))).toEqual(["", "사진 p2", ""]);
    expect(images().map((image) => image.getAttribute("src"))).toEqual([
      "https://cdn.test/p1.webp",
      "https://cdn.test/p2.webp",
      "https://cdn.test/p3.webp",
    ]);
  });

  it("사진이 2장이면 이전과 다음이 같아도 중복 키 경고를 내지 않는다", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<PhotoModal photos={photos.slice(0, 2)} tags={[]} photoIds={["p1", "p2"]} />);

    expect(images()).toHaveLength(3);
    expect(error).not.toHaveBeenCalled();
  });

  it("이미 로드된 이웃으로 넘어가면 다시 로드하지 않고도 준비 신호를 보낸다", () => {
    const onImageReady = vi.fn();
    const { rerender } = render(
      <PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} onImageReady={onImageReady} />,
    );

    loadAll();
    expect(onImageReady).toHaveBeenLastCalledWith("p2");

    onImageReady.mockClear();
    navigation.searchParams = new URLSearchParams("photo=p3");
    rerender(
      <PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} onImageReady={onImageReady} />,
    );

    // load 이벤트를 다시 흘리지 않았는데도 준비 신호가 나가야 로딩 프레임이 깜빡이지 않는다.
    expect(onImageReady).toHaveBeenCalledWith("p3");
  });

  it("현재 사진이 로드되기 전에는 이동 버튼을 잠근다", () => {
    render(<PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} />);
    const nextButton = screen.getByRole("button", { name: "다음 사진" }) as HTMLButtonElement;

    expect(nextButton.disabled).toBe(true);

    act(() => loadAll());
    expect(nextButton.disabled).toBe(false);
  });

  it("이웃 상세를 아직 못 받았어도 이동 버튼은 열려 있다", () => {
    // 온디맨드 경로는 이웃 fetch 가 실패할 수 있다. 버튼까지 잠그면 로딩 프레임의
    // 오류·재시도에 도달할 길이 없어져 모달이 막다른 길이 된다.
    render(<PhotoModal photos={[photoOf("p2")]} tags={[]} photoIds={ALL_IDS} />);
    act(() => loadAll());

    const buttonOf = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
    expect(buttonOf("다음 사진").disabled).toBe(false);
    expect(buttonOf("이전 사진").disabled).toBe(false);
  });

  describe("이미지 로드 실패", () => {
    const failCurrent = () => {
      render(<PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} />);
      act(() => fireEvent.error(images()[1]!));
    };

    it("깨진 그림 대신 오류와 재시도를 사진 영역에 보여 준다", () => {
      failCurrent();

      expect(screen.getByRole("alert").textContent).toContain("사진을 불러오지 못했습니다.");
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
      // 실패한 이미지는 걷어 내 깨진 그림이 남지 않는다.
      expect(images().map((image) => image.getAttribute("src"))).toEqual([
        "https://cdn.test/p1.webp",
        "https://cdn.test/p3.webp",
      ]);
    });

    it("실패해도 스피너를 계속 돌리지 않고 이동 버튼을 연다", () => {
      failCurrent();

      expect(document.querySelector("[aria-hidden='true'] span")).toBeNull();
      expect(
        (screen.getByRole("button", { name: "다음 사진" }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });

    it("재시도하면 그 이미지를 다시 요청한다", () => {
      failCurrent();

      act(() => screen.getByRole("button", { name: "다시 시도" }).click());

      // img 가 다시 마운트돼 요청이 나가고, 결과가 나올 때까지 오류는 걷힌다.
      expect(images().map((image) => image.getAttribute("src"))).toContain(
        "https://cdn.test/p2.webp",
      );
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("실패한 이웃은 밀어 보여 주지 않는다", () => {
      render(<PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} />);
      act(() => {
        fireEvent.load(images()[1]!);
        fireEvent.error(images()[2]!);
      });

      // 이웃 자리가 비어 현재와 이전 두 장만 남는다.
      expect(images()).toHaveLength(2);
    });
  });

  describe("모바일 스와이프", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      setMobile(true);
      vi.spyOn(window.history, "replaceState");
    });

    afterEach(() => vi.useRealTimers());

    // 커밋은 transitionend 를 기다린다. jsdom 은 전환을 돌리지 않아 대체 타이머로 끝난다.
    const settle = () => act(() => void vi.advanceTimersByTime(400));

    it("왼쪽으로 끌면 다음 사진으로 넘어간다", () => {
      render(<PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} />);
      act(() => loadAll());

      act(() => swipe(300, 100));
      settle();

      expect(window.history.replaceState).toHaveBeenCalledWith(
        window.history.state,
        "",
        "/ko/photo?photo=p3",
      );
    });

    it("이웃 이미지가 아직 없으면 애니메이션 없이 곧바로 넘긴다", () => {
      render(<PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} />);
      // 현재 사진만 로드된 상태 — 이웃 슬라이드는 아직 비어 있다.
      act(() => fireEvent.load(images()[1]!));

      act(() => swipe(300, 100));

      // 밀어 보여 줄 그림이 없으니 전환을 기다리지 않고 바로 이동한다.
      expect(window.history.replaceState).toHaveBeenCalledWith(
        window.history.state,
        "",
        "/ko/photo?photo=p3",
      );
      expect(track().style.transform).toBe("translate3d(0, 0, 0)");
    });

    it("EXIF 패널이 펼쳐져 있으면 넘기지 않는다", () => {
      render(<PhotoModal photos={photos} tags={[]} photoIds={ALL_IDS} />);
      act(() => loadAll());

      act(() => screen.getByRole("button", { name: "정보 펼치기" }).click());
      act(() => swipe(300, 100));
      settle();

      expect(window.history.replaceState).not.toHaveBeenCalled();
    });
  });
});
