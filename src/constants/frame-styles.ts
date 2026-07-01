import type { LocalizedText } from "@/types/localized";

/** 내보내기 프레임 스타일 (P2 features/export 에서 사용). 상수만 미리 정의. */
type FrameStyle = { id: string; label: LocalizedText };

const FRAME_STYLES: FrameStyle[] = [
  { id: "bar", label: { ko: "미니멀 바", en: "Minimal Bar" } },
  { id: "pola", label: { ko: "폴라로이드", en: "Polaroid" } },
  { id: "film", label: { ko: "필름", en: "Film" } },
  { id: "mat", label: { ko: "갤러리 매트", en: "Gallery Mat" } },
  { id: "corner", label: { ko: "코너", en: "Corner" } },
  { id: "side", label: { ko: "사이드 데이터", en: "Side Data" } },
];

export { FRAME_STYLES };
export type { FrameStyle };
