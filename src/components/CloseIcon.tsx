type Props = {
  size?: number;
};

/**
 * 모바일 전역 내비게이션과 모든 닫기 액션이 공유하는 아이콘.
 */
const CloseIcon = ({ size = 19 }: Props) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

export { CloseIcon };
