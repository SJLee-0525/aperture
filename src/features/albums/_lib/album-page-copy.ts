import { pickText } from "@/lib/i18n/pick-text";

import type { Album } from "@/types/album";
import type { LocalizedText } from "@/types/localized";

/**
 * 앨범 상세의 검색·공유 설명문.
 *
 * 두 언어를 동시에 만든다. hreflang 이 ko·en 을 상호 참조하므로 메타데이터는 방문자
 * 언어와 무관하게 양쪽을 모두 갖는다.
 */
const albumPageDescription = (album: Album): LocalizedText => {
  const koTitle = pickText(album.title, "ko");
  const enTitle = pickText(album.title, "en");
  const koSubtitle = pickText(album.subtitle, "ko");
  const enSubtitle = pickText(album.subtitle, "en");

  return {
    ko: koSubtitle
      ? `${koTitle} — ${koSubtitle}. 사진작가 이성준의 사진 앨범.`
      : `${koTitle} — 사진작가 이성준의 사진 앨범.`,
    en: enSubtitle
      ? `${enTitle} — ${enSubtitle}. A photo album by photographer Sungjoon Lee.`
      : `${enTitle} — a photo album by photographer Sungjoon Lee.`,
  };
};

export { albumPageDescription };
