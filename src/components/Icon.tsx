import type { ReactNode } from "react";

/**
 * 인라인 SVG 아이콘 세트 (라이브러리 미도입 — 디자인 P_ICON/MI 이식).
 * 순수 UI: name·size만 받는다. 테마/언어 토글의 해·달·지구본은 애니메이션 때문에 각 컴포넌트에 인라인.
 */
const PATHS = {
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
  list: <path d="M4 6h16M4 12h16M4 18h16" />,
  article: (
    <>
      <rect x="4" y="3" width="16" height="18" />
      <path d="M8 8h8M8 12h8M8 16h5" />
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
  chat: (
    <>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  sparkle: (
    <g fill="currentColor" stroke="none">
      <path d="M9 1c.55 4.35 3.65 7.45 8 8-4.35.55-7.45 3.65-8 8-.55-4.35-3.65-7.45-8-8 4.35-.55 7.45-3.65 8-8Z" />
      <path d="M19 1.5c.24 1.62 1.38 2.76 3 3-1.62.24-2.76 1.38-3 3-.24-1.62-1.38-2.76-3-3 1.62-.24 2.76-1.38 3-3Z" />
      <path d="M19.5 13c.32 2.43 2.07 4.18 4.5 4.5-2.43.32-4.18 2.07-4.5 4.5-.32-2.43-2.07-4.18-4.5-4.5 2.43-.32 4.18-2.07 4.5-4.5Z" />
    </g>
  ),
  send: (
    <>
      <path d="m3 11 18-8-8 18-2-8-8-2Z" />
      <path d="m11 13 4-4" />
    </>
  ),
  // 방향 표시 — 예전에는 ‹ › ← → ↑ ↓ 문자로 그렸다. 글자는 폰트 폴백에 따라 굵기와 모양이
  // 달라지고 baseline 이 버튼 중앙에 맞지 않아 line-height 보정이 따라붙는다.
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  arrowUp: <path d="M12 20V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 4v15M6 13l6 6 6-6" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  pin: <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v5" />,
} as const satisfies Record<string, ReactNode>;

/**
 * 등록된 아이콘 이름.
 *
 * `Record<string, ReactNode>` 로 선언한 뒤 `keyof` 를 쓰면 결과가 사실상 `string` 이라
 * 오타를 잡지 못한다. `as const satisfies` 로 리터럴 키를 남겨야 이름이 실제로 좁혀진다.
 */
type IconName = keyof typeof PATHS;

type Props = {
  name: IconName;
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
    {PATHS[name]}
  </svg>
);

export { Icon };
export type { IconName };
