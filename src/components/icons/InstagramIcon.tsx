import { ICON_STROKE_PROPS } from "./stroke-props";

/**
 * Instagram 글리프 (라인)
 *
 * @param {{ size?: number }} props
 * @param {number | undefined} props.size
 * @returns {JSX.Element}
 */
const InstagramIcon = ({ size = 17 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...ICON_STROKE_PROPS}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export { InstagramIcon };
