// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePhotoFilter } from "@/features/gallery/_hooks/use-photo-filter";

import { ALL, FOCAL_MAX, FOCAL_MIN, parsePhotoFilterQuery } from "@/lib/photo-filter-query";

import type { PhotoFilterState } from "@/lib/photo-filter-query";
import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Tag } from "@/types/tag";

const IMAGE = { url: "https://example.com/a.webp", path: "a", w: 100, h: 100 };
const photoOf = (
  id: string,
  camera: string,
  tags: string[],
  focalLength: string,
): GalleryPhoto => ({
  id,
  title: { ko: id, en: id },
  camera,
  lens: "lens",
  place: { ko: "서울", en: "Seoul" },
  tags,
  aspectRatio: 1,
  image: IMAGE,
  exif: { aperture: "f/2", shutter: "1/250", iso: "100", focalLength },
});

const PHOTOS = [
  photoOf("p1", "Fujifilm X100V", ["street"], "35 mm"),
  photoOf("p2", "Sony A7 IV", ["sea"], "85 mm"),
];
const TAGS: Tag[] = [
  { id: "street", ko: "거리", en: "Street" },
  { id: "sea", ko: "바다", en: "Sea" },
];
const CAMERAS = ["Fujifilm X100V", "Sony A7 IV"];
const VOCAB = { tags: TAGS, cameras: CAMERAS };

const urlFiltersNow = (): PhotoFilterState =>
  parsePhotoFilterQuery(new URLSearchParams(window.location.search), VOCAB);

// GalleryView처럼 URL에서 파싱한 상태를 훅에 내려준다. rerender로 URL 반영을 흉내낸다.
const renderFilter = (initialQuery = "") => {
  const view = renderHook(
    ({ urlFilters }: { urlFilters: PhotoFilterState }) =>
      usePhotoFilter(PHOTOS, initialQuery, urlFilters, VOCAB),
    { initialProps: { urlFilters: urlFiltersNow() } },
  );
  const sync = () => view.rerender({ urlFilters: urlFiltersNow() });
  return { view, sync };
};

describe("usePhotoFilter (URL 단일 출처)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/ko/photo");
  });

  afterEach(() => {
    cleanup();
  });

  it("setTag/setCamera는 canonical href를 push하고 q·photo를 보존한다", () => {
    window.history.replaceState(null, "", "/ko/photo?q=dawn&photo=p1");
    const { view } = renderFilter("dawn");

    act(() => view.result.current.setTag("sea"));
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/ko/photo?q=dawn&tag=sea&photo=p1",
    );

    act(() => view.result.current.setCamera("Sony A7 IV"));
    expect(window.location.search).toBe("?q=dawn&tag=sea&camera=Sony+A7+IV&photo=p1");
  });

  it("드래그 틱은 URL을 쓰지 않고 visible만 즉시 반응한다", () => {
    const { view } = renderFilter();
    const before = window.location.search;

    act(() => view.result.current.setFocal(30, 40));

    expect(window.location.search).toBe(before);
    expect(view.result.current.focalMin).toBe(30);
    expect(view.result.current.focalMax).toBe(40);
    // 35mm(p1)만 남는다 — draft가 필터 계산에 즉시 반영된다.
    expect(view.result.current.visible.map((photo) => photo.id)).toEqual(["p1"]);
  });

  it("commitFocal은 replace 1회로 커밋하고 같은 값의 중복 커밋은 URL을 다시 쓰지 않는다", () => {
    const { view, sync } = renderFilter();
    const lengthBefore = window.history.length;

    act(() => view.result.current.setFocal(24, 70));
    act(() => view.result.current.commitFocal(24, 70));
    sync();

    expect(window.location.search).toBe("?focalMin=24&focalMax=70");
    expect(window.history.length).toBe(lengthBefore);

    // pointerup + blur가 연달아 커밋해도 동일값 no-op.
    act(() => view.result.current.commitFocal(24, 70));
    expect(window.location.search).toBe("?focalMin=24&focalMax=70");
  });

  it("커밋 후 URL 파생 값과 draft가 일치하고 draft는 정리된다", () => {
    const { view, sync } = renderFilter();

    act(() => view.result.current.setFocal(24, 70));
    act(() => view.result.current.commitFocal(24, 70));
    sync();

    expect(view.result.current.focalMin).toBe(24);
    expect(view.result.current.focalMax).toBe(70);

    // draft가 정리됐으므로 이후 외부 URL 변경이 그대로 반영된다.
    window.history.replaceState(null, "", "/ko/photo");
    sync();
    expect(view.result.current.focalMin).toBe(FOCAL_MIN);
    expect(view.result.current.focalMax).toBe(FOCAL_MAX);
  });

  it("cancelFocal은 커밋 없이 드래그 전 값으로 되돌린다", () => {
    const { view } = renderFilter();

    act(() => view.result.current.setFocal(30, 40));
    act(() => view.result.current.cancelFocal());

    expect(window.location.search).toBe("");
    expect(view.result.current.focalMin).toBe(FOCAL_MIN);
    expect(view.result.current.focalMax).toBe(FOCAL_MAX);
  });

  it("드래그 중 외부 URL 변경(popstate)은 draft를 버리고 URL을 우선한다", () => {
    const { view, sync } = renderFilter();

    act(() => view.result.current.setFocal(30, 40));
    // 뒤로가기 등으로 URL focal이 바뀐 상황.
    window.history.replaceState(null, "", "/ko/photo?focalMin=100");
    sync();

    expect(view.result.current.focalMin).toBe(100);
    expect(view.result.current.focalMax).toBe(FOCAL_MAX);
  });

  it("resetFilters는 카메라·초점만 push로 초기화하고 태그는 유지한다", () => {
    window.history.replaceState(null, "", "/ko/photo?tag=sea&camera=Sony+A7+IV&focalMin=24");
    const { view, sync } = renderFilter();

    act(() => view.result.current.resetFilters());
    sync();

    expect(window.location.search).toBe("?tag=sea");
    expect(view.result.current.tag).toBe("sea");
    expect(view.result.current.camera).toBe(ALL);
    expect(view.result.current.filtersActive).toBe(false);
  });

  it("filtersActive는 기존 의미대로 태그를 세지 않는다", () => {
    window.history.replaceState(null, "", "/ko/photo?tag=sea");
    const { view } = renderFilter();

    expect(view.result.current.filtersActive).toBe(false);

    act(() => view.result.current.setFocal(24, 70));
    expect(view.result.current.filtersActive).toBe(true);
  });

  it("applyFilters 병합 결과가 역전되면 기본 범위로 복귀한다", () => {
    window.history.replaceState(null, "", "/ko/photo?focalMin=100");
    const { view, sync } = renderFilter();

    // 기존 min=100에 max=50만 주면 역전 — 임의 범위 대신 기본값으로.
    act(() => view.result.current.applyFilters({ focalMax: 50 }, "push"));
    sync();

    expect(window.location.search).toBe("");
    expect(view.result.current.focalMin).toBe(FOCAL_MIN);
  });

  it("필터가 바뀌면 visible 참조가 바뀐다 — 무한스크롤 리셋의 전제", () => {
    const { view, sync } = renderFilter();
    const before = view.result.current.visible;

    act(() => view.result.current.setTag("sea"));
    sync();

    expect(view.result.current.visible).not.toBe(before);
    expect(view.result.current.visible.map((photo) => photo.id)).toEqual(["p2"]);
  });
});
