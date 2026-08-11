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
    "List places where published photos were taken, grouped by place and ordered by how " +
    "many photos were shot there. Includes coordinates and the map deep link.",
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

    // 좌표는 사진마다 있어 같은 장소가 수십 번 반복된다. "어디서 많이 찍었나" 라는 질문에
    // 답하려면 장소로 묶어 횟수를 세는 편이 맞다(W5 평가 3-9).
    const byPlace = new Map<string, { count: number; id: string; lat: number; lng: number }>();
    for (const location of locations) {
      const place = pickText(location.place, lang);
      const seen = byPlace.get(place);
      if (seen) seen.count += 1;
      else
        byPlace.set(place, {
          count: 1,
          id: location.id,
          lat: location.coords.lat,
          lng: location.coords.lng,
        });
    }
    const places = [...byPlace.entries()].sort(([, a], [, b]) => b.count - a.count);

    return formatToolItems(
      places,
      args.limit,
      ([place, entry]) =>
        `${place} — ${entry.count} photos (${entry.lat}, ${entry.lng}) · ` +
        localizePath(lang, `${ROUTES.PHOTO_MAP}?photo=${entry.id}`),
    );
  });
};

export { useMapTools };
