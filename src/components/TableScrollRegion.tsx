import type { ReactNode } from "react";

import styles from "./TableScrollRegion.module.css";

type Props = {
  /** 스크린리더가 스크롤 가능한 표 영역을 구분할 이름. */
  label: string;
  /** 영역 안에 표시할 표. */
  children: ReactNode;
  /** 기능별 레이아웃이나 안정적인 테스트 선택자가 필요할 때 덧붙일 클래스. */
  className?: string;
};

/**
 * 좁은 화면에서 표만 가로로 스크롤하는 공용 영역.
 * 키보드 접근성과 섹션 액센트를 따르는 스크롤바·표 외형을 함께 제공한다.
 */
const TableScrollRegion = ({ label, children, className }: Props) => (
  <div
    className={className ? `${styles.scroll} ${className}` : styles.scroll}
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    {children}
  </div>
);

export { TableScrollRegion };
