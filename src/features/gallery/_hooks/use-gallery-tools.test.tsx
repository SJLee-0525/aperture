// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ALL, FOCAL_MAX, FOCAL_MIN } from "@/lib/photo-filter-query";
import { buildPhotoFilterHref, parsePhotoFilterQuery } from "@/lib/photo-filter-query";

import type { PhotoFilterState } from "@/lib/photo-filter-query";
import type { WebMcpExecute, WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Tag } from "@/types/tag";

const adapter = vi.hoisted(() => ({
  registerWebMcpTool: vi.fn<
    (
      definition: import("@/lib/webmcp/model-context").WebMcpToolDefinition,
      execute: import("@/lib/webmcp/model-context").WebMcpExecute,
      signal: AbortSignal,
    ) => boolean
  >(() => true),
}));

vi.mock("@/lib/webmcp/model-context", () => ({
  registerWebMcpTool: adapter.registerWebMcpTool,
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko", dict: {}, setLang: vi.fn() }),
}));

import { useGalleryTools } from "./use-gallery-tools";

const IMAGE = { url: "https://example.com/a.webp", path: "a", w: 100, h: 100 };

const photoOf = (
  id: string,
  title: string,
  camera: string,
  tags: string[],
  focalLength: string,
): GalleryPhoto => ({
  id,
  title: { ko: title, en: title },
  camera,
  lens: "50mm f/1.8",
  place: { ko: "서울", en: "Seoul" },
  tags,
  aspectRatio: 1.5,
  image: IMAGE,
  exif: { aperture: "f/2.8", shutter: "1/250", iso: "200", focalLength },
});

const PHOTOS: GalleryPhoto[] = [
  photoOf("p1", "골목", "Fujifilm X100V", ["street"], "35 mm"),
  photoOf("p2", "바다", "Fujifilm X100V", ["landscape"], "23 mm"),
  photoOf("p3", "야경", "Sony A7 IV", ["street"], "85 mm"),
];

const TAGS: Tag[] = [
  { id: "street", ko: "거리", en: "Street" },
  { id: "landscape", ko: "풍경", en: "Landscape" },
];

const CAMERAS = [...new Set(PHOTOS.map((photo) => photo.camera))];

// 실제 usePhotoFilter.applyFilters 처럼 URL을 병합·직렬화해 갱신하는 fake —
// 도구는 execute 시점 URL을 읽으므로 fake 도 URL을 실제로 바꿔야 연속 호출 의미가 유지된다.
const filterOf = () => ({
  tag: ALL,
  setTag: vi.fn(),
  camera: ALL,
  setCamera: vi.fn(),
  focalMin: FOCAL_MIN,
  focalMax: FOCAL_MAX,
  setFocal: vi.fn(),
  commitFocal: vi.fn(),
  cancelFocal: vi.fn(),
  resetFilters: vi.fn(),
  applyFilters: vi.fn((partial: Partial<PhotoFilterState>, history: "push" | "replace") => {
    const params = new URLSearchParams(window.location.search);
    const merged = {
      ...parsePhotoFilterQuery(params, { tags: TAGS, cameras: CAMERAS }),
      ...partial,
    };
    const href = buildPhotoFilterHref(window.location.pathname, merged, {
      q: params.get("q"),
      photo: params.get("photo"),
    });
    window.history[history === "push" ? "pushState" : "replaceState"](null, "", href);
  }),
  filtersActive: false,
  visible: PHOTOS,
});

const renderTools = (filter = filterOf()) => {
  renderHook(() => useGalleryTools(PHOTOS, TAGS, filter, CAMERAS));
  return filter;
};

const executeOf = (name: string): WebMcpExecute => {
  const call = adapter.registerWebMcpTool.mock.calls.find((entry) => entry[0].name === name);
  if (!call) throw new Error(`tool not registered: ${name}`);
  return call[1];
};

describe("useGalleryTools", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/ko/photo");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("도구 3종을 등록하고 조회만 readOnly 로 표시한다", () => {
    renderTools();

    const byName = new Map<string, WebMcpToolDefinition>(
      adapter.registerWebMcpTool.mock.calls.map((call) => [call[0].name, call[0]]),
    );
    expect([...byName.keys()]).toEqual(["filter_photos", "get_photo_details", "open_photo"]);
    expect(byName.get("filter_photos")?.annotations.readOnlyHint).toBe(false);
    expect(byName.get("get_photo_details")?.annotations.readOnlyHint).toBe(true);
    expect(byName.get("open_photo")?.annotations.readOnlyHint).toBe(false);
  });

  it("filter_photos 는 준 차원만 병합해 1회 push 하고 화면과 같은 함수로 건수를 계산한다", async () => {
    const filter = renderTools();

    // 태그는 en 라벨 대소문자 무시 매칭 → id 로 병합.
    const result = await executeOf("filter_photos")({ tag: "street" });
    expect(filter.applyFilters).toHaveBeenCalledTimes(1);
    expect(filter.applyFilters).toHaveBeenCalledWith({ tag: "street" }, "push");
    expect(result).toContain("2 photos match");
    expect(result).toContain("골목 (p1)");
    expect(window.location.search).toBe("?tag=street");
  });

  it("재렌더 전 연속 호출이 앞 호출의 필터를 되돌리지 않는다", async () => {
    const filter = renderTools();
    const execute = executeOf("filter_photos");

    await execute({ tag: "street" });
    // 재렌더 없이 곧바로 카메라만 좁힌다 — URL이 단일 출처라 앞의 태그 필터가 유지된다.
    const result = await execute({ camera: "sony" });

    expect(filter.applyFilters).toHaveBeenNthCalledWith(2, { camera: "Sony A7 IV" }, "push");
    expect(result).toContain("1 photo matches");
    expect(result).toContain("야경 (p3)");
    // 누적된 필터를 응답이 밝혀야 에이전트가 0건의 원인을 짚을 수 있다.
    expect(result).toContain("Filters applied (tag=Street, camera=Sony A7 IV)");
  });

  it("0건이면 무엇이 걸려 있는지와 푸는 방법을 함께 알린다", async () => {
    renderTools();
    const execute = executeOf("filter_photos");

    await execute({ tag: "landscape" });
    const result = await execute({ camera: "sony" });

    expect(result).toBe(
      "No photos match. Active filters: tag=Landscape, camera=Sony A7 IV." +
        " To widen it, pass tag: 'all' or camera: 'all'.",
    );
  });

  it("역전된 초점 범위는 뒤집어 받고, 문자열 숫자도 해석한다", async () => {
    const filter = renderTools();
    const execute = executeOf("filter_photos");

    await execute({ focalMin: 200, focalMax: 50 });
    expect(filter.applyFilters).toHaveBeenCalledWith({ focalMin: 50, focalMax: 200 }, "push");

    await execute({ focalMin: "30" });
    expect(filter.applyFilters).toHaveBeenLastCalledWith({ focalMin: 30, focalMax: 200 }, "push");
  });

  it("filter_photos 는 미지의 태그·카메라에 알려진 값 목록을 답한다", async () => {
    renderTools();
    const execute = executeOf("filter_photos");

    await expect(Promise.resolve(execute({ tag: "food" }))).resolves.toContain(
      'Unknown tag "food"',
    );
    await expect(Promise.resolve(execute({ camera: "Canon" }))).resolves.toContain(
      'Unknown camera "Canon"',
    );
  });

  it("filter_photos 의 'all' 은 필터를 해제하고, 카메라는 유일 부분일치를 허용한다", async () => {
    const filter = renderTools();
    const execute = executeOf("filter_photos");

    await execute({ tag: "all", camera: "sony" });
    expect(filter.applyFilters).toHaveBeenCalledWith({ tag: ALL, camera: "Sony A7 IV" }, "push");
  });

  it("filter_photos 를 인자 없이 부르면 거를 수 있는 태그·카메라를 알려준다", async () => {
    const filter = renderTools();

    const result = await executeOf("filter_photos")({});
    expect(result).toContain("3 photos currently shown");
    expect(result).toContain("Active filters: none.");
    expect(result).toContain("Available tags: Street, Landscape.");
    expect(result).toContain("Available cameras: Fujifilm X100V, Sony A7 IV.");
    // open_photo 가 쓸 id 도 함께 준다 — 어휘만 주면 사진을 열 방법이 사라진다.
    expect(result).toContain("Showing: 골목 (p1)");
    // 조회만 했으므로 필터 상태(URL)는 건드리지 않는다.
    expect(filter.applyFilters).not.toHaveBeenCalled();
  });

  it("0건이어도 무인자 호출은 어휘를 돌려준다", async () => {
    renderTools();
    const execute = executeOf("filter_photos");

    // 어휘가 가장 필요한 순간이 0건일 때다. 0건 분기가 이 응답을 가로채면 안 된다.
    await execute({ tag: "landscape", camera: "sony" });
    const result = await execute({});

    expect(result).toContain("No photos match");
    expect(result).toContain("Available tags: Street, Landscape.");
    expect(result).toContain("Available cameras: Fujifilm X100V, Sony A7 IV.");
  });

  it("검색어만 걸렸을 때 문장이 뒤엉키지 않는다", async () => {
    window.history.replaceState(null, "", "/ko/photo?q=zzz");
    renderTools();

    // q 는 결과 계산에 들어가므로 상태 표시에서 빠지면 "none" 이라는 오답이 된다.
    // 검색어는 이 도구가 못 푸니 "pass" 명령과 한 문장에 섞이면 안 된다.
    const result = await executeOf("filter_photos")({});
    expect(result).toContain(
      'No photos match. Active filters: search="zzz". ' +
        'The search box controls "zzz" and this tool cannot clear it.',
    );
    expect(result).not.toContain("pass the search box");
  });

  it("풀 수 있는 축과 검색어를 각각의 문장으로 알린다", async () => {
    window.history.replaceState(null, "", "/ko/photo?q=zzz");
    renderTools();

    const result = await executeOf("filter_photos")({ tag: "landscape" });
    expect(result).toBe(
      'No photos match. Active filters: search="zzz", tag=Landscape.' +
        " To widen it, pass tag: 'all'." +
        ' The search box controls "zzz" and this tool cannot clear it.',
    );
  });

  it("0건이면 축마다 푸는 방법을 알린다", async () => {
    renderTools();
    const execute = executeOf("filter_photos");

    const result = await execute({ tag: "landscape", focalMin: 200, focalMax: 300 });
    expect(result).toContain("To widen it, pass tag: 'all' or focalMin: 16, focalMax: 300.");
  });

  it("get_photo_details 는 photoId 를 생략하면 현재 열린 사진을 설명한다", async () => {
    window.history.replaceState(null, "", "/ko/photo?photo=p2");
    renderTools();

    const result = await executeOf("get_photo_details")({});
    expect(result).toContain("바다");
    expect(result).not.toContain("야경");
  });

  it("열린 사진도 photoId 도 없으면 무엇을 해야 하는지 답한다", async () => {
    renderTools();

    await expect(Promise.resolve(executeOf("get_photo_details")({}))).resolves.toBe(
      "No photo is open. Pass photoId, or open a photo first.",
    );
  });

  it("get_photo_details 는 EXIF 요약과 로케일 딥링크를 반환한다", async () => {
    renderTools();

    const result = await executeOf("get_photo_details")({ photoId: "p3" });
    expect(result).toContain("야경");
    expect(result).toContain("Sony A7 IV");
    expect(result).toContain("f/2.8 · 1/250 · ISO 200 · 85 mm");
    expect(result).toContain("/ko/photo?photo=p3");

    await expect(
      Promise.resolve(executeOf("get_photo_details")({ photoId: "nope" })),
    ).resolves.toBe("No photo matches that id.");
  });

  it("open_photo 는 기존 쿼리를 보존하며 ?photo= 를 설정한다", async () => {
    window.history.replaceState(null, "", "/ko/photo?q=night");
    renderTools();

    const result = await executeOf("open_photo")({ photoId: "p2" });
    expect(result).toBe('Opened photo "바다".');
    expect(window.location.pathname).toBe("/ko/photo");
    expect(window.location.search).toBe("?q=night&photo=p2");

    await expect(Promise.resolve(executeOf("open_photo")({ photoId: "nope" }))).resolves.toBe(
      "No photo matches that id.",
    );
  });
});
