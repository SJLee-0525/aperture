import type { ComponentProps } from "react";

import styles from "./AdminInput.module.css";

type AdminInputSize = "md" | "sm";
type AdminInputTone = "default" | "raised";

type AdminInputOwnProps = {
  /** md 44px · sm 40px. 기본 md. multiline이면 높이 대신 rows·호출부 클래스가 정한다. */
  size?: AdminInputSize;
  /** raised는 surface-1 카드 위에 놓이는 입력에 사용한다. */
  tone?: AdminInputTone;
};

type AdminInputProps =
  | (AdminInputOwnProps & { multiline?: false } & Omit<ComponentProps<"input">, "size">)
  | (AdminInputOwnProps & { multiline: true } & Omit<ComponentProps<"textarea">, "size">);

/**
 * 관리자 폼 공용 텍스트 입력. `multiline`이면 textarea로 렌더링한다.
 * 외형만 소유하며 배치(width·min-height·mono 등)는 호출부 className이 담당한다.
 */
const AdminInput = (props: AdminInputProps) => {
  const { multiline = false, size = "md", tone = "default", className, ...rest } = props;
  const controlClassName = [
    styles.control,
    multiline ? styles.multiline : size === "sm" ? styles.sm : styles.md,
    tone === "raised" ? styles.raised : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (multiline) {
    return <textarea {...(rest as ComponentProps<"textarea">)} className={controlClassName} />;
  }
  return (
    <input {...(rest as Omit<ComponentProps<"input">, "size">)} className={controlClassName} />
  );
};

export { AdminInput };
