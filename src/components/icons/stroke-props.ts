/** 라인형 아이콘 공통 스트로크 속성 — 로고형(fill) 제외 전 아이콘이 공유해 두께·마감 통일. */
const ICON_STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export { ICON_STROKE_PROPS };
