// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GalleryView } from "@/features/gallery/_components/GalleryView";
import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Tag } from "@/types/tag";

const mocks = vi.hoisted(() => ({
  search: new URLSearchParams(),
  gridRender: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.search }));
vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: { workNav: "작업", viewMasonry: "메이슨리", viewSquare: "정사각", emptyResults: "없음" },
  }),
}));
vi.mock("@/features/gallery/_hooks/use-photo-filter", () => ({
  usePhotoFilter: () => ({
    visible: [],
    tag: "all",
    setTag: vi.fn(),
    camera: "all",
    setCamera: vi.fn(),
    focalMin: 0,
    focalMax: 600,
    setFocal: vi.fn(),
    resetFilters: vi.fn(),
    filtersActive: false,
  }),
}));
vi.mock("@/features/gallery/_hooks/use-infinite-scroll", () => ({
  useInfiniteScroll: () => ({ visible: [], hasMore: false, attachSentinel: vi.fn() }),
}));
vi.mock("@/components/PhotoGrid", () => ({
  PhotoGrid: () => {
    mocks.gridRender();
    return <div data-testid="grid" />;
  },
}));
vi.mock("@/features/gallery/_components/FilterBar", () => ({ FilterBar: () => null }));
vi.mock("@/components/ViewToggle", () => ({ ViewToggle: () => null }));
vi.mock("@/features/photo-detail/_components/OnDemandPhotoModal", () => ({
  OnDemandPhotoModal: () => null,
  preloadPhotoModal: vi.fn(),
}));

describe("GalleryView", () => {
  afterEach(() => {
    cleanup();
    mocks.gridRender.mockClear();
    mocks.search = new URLSearchParams();
  });

  it("photo 쿼리만 바뀌면 배경 포토그리드를 다시 렌더하지 않는다", () => {
    const photos = [] as GalleryPhoto[];
    const tags: Tag[] = [];
    const view = render(<GalleryView photos={photos} tags={tags} />);

    mocks.search = new URLSearchParams("photo=p02");
    view.rerender(<GalleryView photos={photos} tags={tags} />);

    expect(mocks.gridRender).toHaveBeenCalledOnce();
  });
});
