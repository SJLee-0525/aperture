import { ICON_STROKE_PROPS } from "./stroke-props";

/**
 * 이메일 글리프 (라인) — 매칭 안 되는 라벨의 폴백이기도 함
 *
 * @param {{ size?: number }} props
 * @param {number | undefined} props.size
 * @returns {JSX.Element}
 */
const MailIcon = ({ size = 17 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...ICON_STROKE_PROPS}>
    <rect x="3" y="5" width="18" height="14" />
    <path d="M3 6l9 7 9-7" />
  </svg>
);

export { MailIcon };
