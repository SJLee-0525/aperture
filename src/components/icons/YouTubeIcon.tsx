import { ICON_STROKE_PROPS } from "./stroke-props";

/**
 * YouTube 글리프 (라인 + 재생 삼각형)
 */
const YouTubeIcon = ({ size = 17 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...ICON_STROKE_PROPS}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
    <path d="M10.2 9.4l4.6 2.6-4.6 2.6z" fill="currentColor" stroke="none" />
  </svg>
);

export { YouTubeIcon };
