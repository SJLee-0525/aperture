import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

/** 앨범 = 사진 묶음. 사진은 top-level, 앨범은 id로 참조만 한다. */
type Album = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  coverPhotoId: string; // 소속 사진 중 하나
  cover?: ImageMeta | null; // 관리자 목록용 커버 스냅샷
  photoIds: string[]; // 수동 순서 (배열 순서 = 표시 순서)
  order: number; // 앨범 목록 수동 정렬
  published: boolean;
};

export type { Album };
