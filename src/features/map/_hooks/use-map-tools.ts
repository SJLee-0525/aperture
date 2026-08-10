"use client";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";
import { limitProperty, objectSchema } from "@/lib/webmcp/tool-schemas";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { formatToolItems } from "@/lib/webmcp/tool-output";

import type { MapLocation } from "@/features/map/_types/map-location";
import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";

const LIST_TOOL: WebMcpToolDefinition = {
  name: "list_photo_locations",
  description:
    "List places where published photos were taken, with coordinates and the map deep link.",
  inputSchema: objectSchema({ limit: limitProperty() }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

/**
 * /photo/map 의 WebMCP 도구 — 좌표는 사진 EXIF 에서 온 공개 데이터다.
 *
 * @param {MapLocation[]} locations 좌표 있는 공개 사진의 위치 투영.
 * @returns {void}
 */
const useMapTools = (locations: MapLocation[]): void => {
  const { lang } = useLang();

  useModelContextTool(LIST_TOOL, (args) => {
    if (locations.length === 0) return "No photo locations are published yet.";
    return formatToolItems(
      locations,
      args.limit,
      (location) =>
        `${pickText(location.place, lang)} (${location.coords.lat}, ${location.coords.lng}) · ` +
        localizePath(lang, `${ROUTES.PHOTO_MAP}?photo=${location.id}`),
    );
  });
};

export { useMapTools };
