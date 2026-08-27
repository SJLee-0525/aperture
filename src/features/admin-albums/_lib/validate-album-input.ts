import { collectIssues, requireAny, requireKoText } from "@/lib/admin/validate-rules";

import type { FieldIssue } from "@/lib/admin/field-issue";
import type { AlbumInput } from "@/lib/supabase/albums";

/** 화면 순서대로 담는다. 첫 항목이 제출 실패 시 포커스를 받는다. */
const validateAlbumInput = (input: AlbumInput): FieldIssue[] =>
  collectIssues(
    requireKoText("title.ko", input.title, "제목"),
    requireAny("photoIds", input.photoIds, "앨범에 넣을 사진을 최소 한 장 이상 선택하세요."),
  );

export { validateAlbumInput };
