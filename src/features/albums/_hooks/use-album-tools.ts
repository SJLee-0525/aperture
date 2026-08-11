"use client";

import { albumRoute } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useModelContextTool } from "@/hooks/use-model-context-tool";
import { limitProperty, objectSchema } from "@/lib/webmcp/tool-schemas";
import { localizePath } from "@/lib/i18n/locale-path";
import { pickText } from "@/lib/i18n/pick-text";
import { formatToolItems } from "@/lib/webmcp/tool-output";

import type { AlbumCard } from "@/features/albums/_lib/album-cards";
import type { WebMcpToolDefinition } from "@/lib/webmcp/model-context";

const LIST_TOOL: WebMcpToolDefinition = {
  name: "list_albums",
  description: "List published photo albums with the page path of each album's detail page.",
  inputSchema: objectSchema({ limit: limitProperty() }),
  annotations: { readOnlyHint: true, untrustedContentHint: false },
};

/**
 * /photo/albums 목록의 WebMCP 도구 — 서버가 투영한 카드 데이터를 그대로 직렬화한다.
 *
 * @param {AlbumCard[]} albums 서버 투영 앨범 카드(커버·장수 계산 완료).
 * @returns {void}
 */
const useAlbumTools = (albums: AlbumCard[]): void => {
  const { lang } = useLang();

  useModelContextTool(LIST_TOOL, (args) => {
    if (albums.length === 0) return "No albums are published yet.";
    // 부제가 빈 앨범이 있어 " · · " 로 벌어지지 않게 빈 조각을 걸러 붙인다.
    return formatToolItems(albums, args.limit, (album) =>
      [
        pickText(album.title, lang),
        pickText(album.subtitle, lang),
        `${album.count} photos`,
        localizePath(lang, albumRoute(album.id)),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  });
};

export { useAlbumTools };
