import { ICON_STROKE_PROPS } from "./stroke-props";

/**
 * 블로그/RSS 글리프 (라인) — velog·tistory 등 텍스트 채널 공용
 *
 * @param {{ size?: number }} props
 * @param {number | undefined} props.size
 * @returns {JSX.Element}
 */
const BlogIcon = ({ size = 17 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...ICON_STROKE_PROPS}>
    <path d="M4.5 11.5a8 8 0 0 1 8 8" />
    <path d="M4.5 5a14.5 14.5 0 0 1 14.5 14.5" />
    <circle cx="5.5" cy="18.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export { BlogIcon };
