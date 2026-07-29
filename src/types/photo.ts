import type { Coords } from "@/types/coords";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

/** 촬영 데이터 — 상세 패널의 EXIF 삼각(조리개·셔터·감도) + 리스트에 표시 */
type Exif = {
  aperture: string; // "f/2.8"
  shutter: string; // "1/500"
  iso: string; // "100"
  focalLength: string; // "35 mm"
  ev: string; // "−0.3 EV"
  wb: string; // "5600 K"
  metering: string; // "Multi"
  flash: string; // "발광 안 함"
};

type Photo = {
  id: string;
  title: LocalizedText;
  shotAt: Date; // 촬영일시 (표시 포맷은 렌더 시). Firestore Timestamp ↔ 래퍼가 변환
  camera: string;
  lens: string;
  exif: Exif;
  fileName?: string; // "DSC07400.ARW" — EXIF에서 추출(선택)
  dimensions: { w: number; h: number }; // 원본 촬영 해상도 (EXIF "크기" 표시용)
  aspectRatio: number; // 메이슨리 타일 비율 (w/h)
  place: LocalizedText;
  coords: Coords | null; // GPS 없으면 null → 지도 핀 없음
  tags: string[]; // 태그 id 참조 (site/config.tags)
  image: ImageMeta; // 저장된 webp
  order: number; // 수동 정렬 (dnd-kit)
  published: boolean;
};

export type { Photo };
