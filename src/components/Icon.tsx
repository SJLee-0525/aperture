import type { ReactNode } from "react";

/**
 * 인라인 SVG 아이콘 세트 (라이브러리 미도입 — 디자인 P_ICON/MI 이식).
 * 순수 UI: name·size만 받는다. 테마/언어 토글의 해·달·지구본은 애니메이션 때문에 각 컴포넌트에 인라인.
 */
const PATHS: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </>
  ),
  work: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  album: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 9h18" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
};

type IconName = keyof typeof PATHS;

type Props = {
  name: string;
  size?: number;
  className?: string;
};

const Icon = ({ name, size = 20, className }: Props) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {PATHS[name] ?? null}
  </svg>
);

export { Icon };
export type { IconName };
