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
  square: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  mason: (
    <>
      <rect x="3" y="3" width="7" height="10" />
      <rect x="14" y="3" width="7" height="6" />
      <rect x="3" y="16" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
    </>
  ),
  funnel: <path d="M3 5h18M6 12h12M10 19h4" />,
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
  music: (
    <>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </>
  ),
  cal: (
    <>
      <rect x="3" y="4" width="18" height="17" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  play: <path d="M6 4l14 8-14 8z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 6l9 7 9-7" />
    </>
  ),
  code: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />,
  folder: <path d="M3 7h6l2 2h10v10H3z" />,
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M9 14l-1 7 4-2 4 2-1-7" />
    </>
  ),
};

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
