import { withoutId } from "@/lib/admin/without-id";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { MusicMediaInput } from "@/lib/supabase/music";
import type { MusicMedia } from "@/types/music";

const emptyMediaInput = (): MusicMediaInput => ({
  title: EMPTY_TEXT,
  source: EMPTY_TEXT,
  youtubeId: "",
  // 새 영상은 order 0 — 목록 상단에 오며, dnd 정렬로 조정한다.
  order: 0,
  published: false,
});

const mediaToInput = (media: MusicMedia): MusicMediaInput => withoutId(media);

const prepareMediaInput = (form: MusicMediaInput): MusicMediaInput => ({
  ...form,
  youtubeId: form.youtubeId.trim(),
});

export { emptyMediaInput, mediaToInput, prepareMediaInput };
