"use client";

import { ROUTES } from "@/constants/routes";
import { filterPhotos } from "@/features/gallery/_lib/filter-photos";
import {
  ALL,
  FOCAL_MAX,
  FOCAL_MIN,
  parsePhotoFilterQuery,
  resolveCamera,
  resolveTag,
} from "@/lib/photo-filter-query";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";
import {
  idProperty,
  numberProperty,
  objectSchema,
  stringProperty,
} from "@/lib/webmcp/tool-schemas";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { pushCurrentUrl } from "@/lib/navigation/replace-current-url";
import { resolveTargetId } from "@/lib/webmcp/current-target";
import { clampToolText, countLabel } from "@/lib/webmcp/tool-output";

import type { usePhotoFilter } from "@/features/gallery/_hooks/use-photo-filter";
import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";
import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Tag } from "@/types/tag";

type PhotoFilter = ReturnType<typeof usePhotoFilter>;

/** 결과 요약에 함께 보여줄 상위 항목 수. */
const PREVIEW_COUNT = 5;

const FILTER_TOOL: WebMcpToolDefinition = {
  name: "filter_photos",
  description:
    "Filter the photo grid on this page by tag, camera, or focal length range (mm). " +
    "Filters stack: an argument you omit keeps its current value. Clear a tag or camera with " +
    "'all'; reset the focal range by passing focalMin 16 and focalMax 300. Call with no " +
    "arguments to see the available tags and cameras plus the filters already active, even " +
    "when nothing matches. Updates the visible grid and returns how many photos match.",
  inputSchema: objectSchema({
    tag: stringProperty("Tag id or label to filter by, or 'all' to clear."),
    camera: stringProperty("Camera name to filter by, or 'all' to clear."),
    focalMin: numberProperty("Minimum focal length in mm (16-300)."),
    focalMax: numberProperty("Maximum focal length in mm (16-300)."),
  }),
  annotations: { readOnlyHint: false, untrustedContentHint: false },
};

const DETAILS_TOOL: WebMcpToolDefinition = {
  name: "get_photo_details",
  description:
    "Get details of one photo (title, place, camera, lens, exposure) without opening it. " +
    "Omit photoId to describe the photo currently open in the detail modal. " +
    "Use open_photo instead when the visitor should see the photo.",
  inputSchema: objectSchema({
    photoId: idProperty("Photo id from filter_photos results. Omit for the photo already open."),
  }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

const OPEN_TOOL: WebMcpToolDefinition = {
  name: "open_photo",
  description: "Open one photo in the detail modal so the visitor can see it.",
  inputSchema: objectSchema({ photoId: idProperty("Photo id from filter_photos results.") }, [
    "photoId",
  ]),
  annotations: { readOnlyHint: false, untrustedContentHint: false },
};

/**
 * 초점거리 인자 해석 — clampLimit 처럼 문자열 숫자("35")도 받고, 해석 불가면 null.
 * 유효 값은 슬라이더와 같은 16~300mm 로 클램프한다.
 *
 * @param {unknown} raw 에이전트가 넘긴 focalMin/focalMax 인자.
 * @returns {number | null} null 이면 "인자 미지정"으로 취급한다.
 */
const parseFocalArg = (raw: unknown): number | null => {
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : Number.NaN;
  const value = Math.round(parsed);
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, FOCAL_MIN), FOCAL_MAX);
};

/**
 * 필터 해제 값 판정 — 'all' 은 태그·카메라 필터를 푼다.
 *
 * @param {string} raw
 * @returns {boolean}
 */
const isClearValue = (raw: string): boolean => raw.trim().toLowerCase() === "all";

/**
 * 지금 걸려 있는 필터를 한 줄로 적는다.
 *
 * 필터는 호출마다 누적되므로(인자로 안 준 차원은 유지) 응답이 상태를 밝히지 않으면
 * 에이전트가 "왜 0건인지" 를 알 수 없다. 앞서 건 태그를 잊은 채 카메라만 바꿔가며
 * 헛돌던 사례가 있었다(W5 평가 2-10).
 *
 * 검색어(`?q`)도 함께 적는다. 결과 계산에는 들어가는데 상태 표시에서 빠지면
 * `/photo?q=zzz` 에서 0건인데 "Active filters: none" 이라는 오답이 나온다(W5 리뷰).
 *
 * @param {{ tag: string; camera: string; focalMin: number; focalMax: number; query: string }} state
 * @param {Tag[]} tags 태그 id 를 사람이 읽는 라벨로 되돌리기 위한 사전.
 * @returns {string} 걸린 게 없으면 "none".
 */
const describeFilters = (
  state: { tag: string; camera: string; focalMin: number; focalMax: number; query: string },
  tags: Tag[],
): string => {
  const parts: string[] = [];
  if (state.query.trim()) parts.push(`search="${state.query.trim()}"`);
  if (state.tag !== ALL) {
    parts.push(`tag=${tags.find((entry) => entry.id === state.tag)?.en ?? state.tag}`);
  }
  if (state.camera !== ALL) parts.push(`camera=${state.camera}`);
  if (state.focalMin > FOCAL_MIN || state.focalMax < FOCAL_MAX) {
    parts.push(`focal=${state.focalMin}-${state.focalMax}mm`);
  }
  return parts.length > 0 ? parts.join(", ") : "none";
};

/**
 * 0건일 때 무엇을 어떻게 풀 수 있는지 알린다.
 *
 * 이 도구가 인자로 풀 수 있는 축과 그렇지 않은 검색어를 **다른 문장**으로 나눈다.
 * 한 문장에 섞으면 `pass the search box clears "zzz"` 처럼 명령과 설명이 뒤엉킨다.
 *
 * @param {{ tag: string; camera: string; focalMin: number; focalMax: number; query: string }} state
 * @returns {string} 알릴 것이 없으면 빈 문자열. 있으면 앞에 공백 하나가 붙는다.
 */
const describeReset = (state: {
  tag: string;
  camera: string;
  focalMin: number;
  focalMax: number;
  query: string;
}): string => {
  const passable: string[] = [];
  if (state.tag !== ALL) passable.push(`tag: 'all'`);
  if (state.camera !== ALL) passable.push(`camera: 'all'`);
  if (state.focalMin > FOCAL_MIN || state.focalMax < FOCAL_MAX) {
    passable.push(`focalMin: ${FOCAL_MIN}, focalMax: ${FOCAL_MAX}`);
  }

  const sentences: string[] = [];
  if (passable.length > 0) sentences.push(`To widen it, pass ${passable.join(" or ")}.`);
  // 검색어는 URL 의 ?q 라 이 도구가 건드리지 않는다. 방문자나 검색창이 지운다.
  if (state.query.trim()) {
    sentences.push(
      `The search box controls "${state.query.trim()}" and this tool cannot clear it.`,
    );
  }
  return sentences.length > 0 ? ` ${sentences.join(" ")}` : "";
};

/**
 * /photo 작업 그리드의 WebMCP 도구 3종 — GalleryContent 안(필터 상태 곁)에서 마운트한다.
 * 결과 건수는 화면과 같은 `filterPhotos` 를 동기 재호출해 계산하므로 setter 반영 시점과
 * 무관하게 도구 응답과 화면이 일치한다. `?q` 검색어는 execute 시점 URL 에서 읽는다.
 *
 * @param {GalleryPhoto[]} photos 서버가 내려준 공개 사진 투영.
 * @param {Tag[]} tags 통제 태그 사전.
 * @param {PhotoFilter} filter usePhotoFilter 반환값 — applyFilters 와 현재 필터 상태.
 * @param {string[]} cameras 뷰가 이미 memo 한 카메라 목록 — 도구에서 재파생하지 않는다.
 * @returns {void}
 */
const useGalleryTools = (
  photos: GalleryPhoto[],
  tags: Tag[],
  filter: PhotoFilter,
  cameras: string[],
): void => {
  const { lang } = useLang();

  useModelContextTool(FILTER_TOOL, (args) => {
    // URL이 상태의 단일 출처이고 pushState는 동기라, 재렌더 전 연속 도구 호출도
    // execute 시점 URL 파싱만으로 서로의 변경을 본다 — 별도 ref가 필요 없다.
    const applied = parsePhotoFilterQuery(new URLSearchParams(window.location.search), {
      tags,
      cameras,
    });

    let tag = applied.tag;
    const tagProvided = typeof args.tag === "string";
    if (typeof args.tag === "string") {
      if (isClearValue(args.tag)) {
        tag = ALL;
      } else {
        const resolved = resolveTag(tags, args.tag);
        if (!resolved)
          return `Unknown tag "${args.tag}". Known tags: ${tags.map((entry) => entry.en).join(", ")}.`;
        tag = resolved.id;
      }
    }

    let camera = applied.camera;
    const cameraProvided = typeof args.camera === "string";
    if (typeof args.camera === "string") {
      if (isClearValue(args.camera)) {
        camera = ALL;
      } else {
        const resolved = resolveCamera(cameras, args.camera);
        if (!resolved)
          return `Unknown camera "${args.camera}". Known cameras: ${cameras.join(", ")}.`;
        camera = resolved;
      }
    }

    const parsedMin = parseFocalArg(args.focalMin);
    const parsedMax = parseFocalArg(args.focalMax);
    const focalProvided = parsedMin !== null || parsedMax !== null;
    let focalMin = parsedMin ?? applied.focalMin;
    let focalMax = parsedMax ?? applied.focalMax;
    // 역전된 범위(min > max)는 불가능한 상태를 슬라이더에 커밋하지 않도록 뒤집어 받는다.
    if (focalMin > focalMax) [focalMin, focalMax] = [focalMax, focalMin];

    // 인자로 받은 차원만 병합해 1회 push — 도구 호출당 history entry 하나.
    if (tagProvided || cameraProvided || focalProvided) {
      filter.applyFilters(
        {
          ...(tagProvided ? { tag } : {}),
          ...(cameraProvided ? { camera } : {}),
          ...(focalProvided ? { focalMin, focalMax } : {}),
        },
        "push",
      );
    }

    // 화면과 같은 순수 함수로 즉시 재계산 — 상태 반영을 기다리지 않는다.
    const query = new URLSearchParams(window.location.search).get("q") ?? "";
    const visible = filterPhotos(photos, { tag, query, camera, focalMin, focalMax });

    // 필터는 누적된다 — 0건일 때 무엇이 걸려 있는지 말해주지 않으면 원인을 찾을 수 없다.
    const state = { tag, camera, focalMin, focalMax, query };
    const active = describeFilters(state, tags);

    // 상위 몇 장은 항상 id 와 함께 돌려준다 — open_photo 가 쓸 수 있는 유일한 id 출처다.
    const preview =
      visible
        .slice(0, PREVIEW_COUNT)
        .map((photo) => `${pickText(photo.title, lang)} (${photo.id})`)
        .join(", ") + (visible.length > PREVIEW_COUNT ? ", …" : "");

    // 인자가 하나도 없으면 어휘 조회다. 0건 분기보다 **먼저** 답해야 한다 —
    // 결과가 0건일 때야말로 에이전트가 어휘를 가장 필요로 한다(W5 리뷰).
    if (!tagProvided && !cameraProvided && !focalProvided) {
      return [
        visible.length > 0
          ? `${countLabel(visible.length, "photo")} currently shown. Active filters: ${active}.`
          : `No photos match. Active filters: ${active}.${describeReset(state)}`,
        ...(visible.length > 0 ? [`Showing: ${preview}`] : []),
        `Available tags: ${tags.map((entry) => entry.en).join(", ")}.`,
        `Available cameras: ${cameras.join(", ")}.`,
      ].join("\n");
    }

    if (visible.length === 0) {
      return `No photos match. Active filters: ${active}.${describeReset(state)}`;
    }

    return `Filters applied (${active}). ${countLabel(visible.length, "photo")} ${
      visible.length === 1 ? "matches" : "match"
    }: ${preview}`;
  });

  useModelContextTool(DETAILS_TOOL, (args) => {
    const targetId = resolveTargetId(args.photoId, "photo");
    if (!targetId) return "No photo is open. Pass photoId, or open a photo first.";
    const photo = photos.find((entry) => entry.id === targetId);
    if (!photo) return "No photo matches that id.";
    const line = [
      pickText(photo.title, lang),
      pickText(photo.place, lang),
      `${photo.camera} + ${photo.lens}`,
      `${photo.exif.aperture} · ${photo.exif.shutter} · ISO ${photo.exif.iso} · ${photo.exif.focalLength}`,
      localizePath(lang, `${ROUTES.PHOTO}?photo=${photo.id}`),
    ].join("\n");
    return clampToolText(line);
  });

  useModelContextTool(OPEN_TOOL, (args) => {
    const photo = photos.find((entry) => entry.id === args.photoId);
    if (!photo) return "No photo matches that id.";
    const params = new URLSearchParams(window.location.search);
    params.set("photo", photo.id);
    pushCurrentUrl(`${window.location.pathname}?${params.toString()}`);
    return `Opened photo "${pickText(photo.title, lang)}".`;
  });
};

export { useGalleryTools };
