import type { ComponentProps, ReactNode } from "react";

import styles from "./AdminField.module.css";

type AdminFieldProps = {
  label: ReactNode;
  /** 라벨 뒤에 " *"를 붙인다. 입력의 required 속성은 별도로 전달해야 한다. */
  required?: boolean;
} & ComponentProps<"label">;

/**
 * 라벨과 입력을 세로로 묶는 관리자 폼 필드.
 * 호출부별 배치(width·flex·grid)는 className으로 전달한다.
 */
const AdminField = ({ label, required, className, children, ...rest }: AdminFieldProps) => (
  <label {...rest} className={className ? `${styles.field} ${className}` : styles.field}>
    <span className={styles.label}>
      {label}
      {required ? " *" : null}
    </span>
    {children}
  </label>
);

export { AdminField };
