"use client";

import { useAdminFieldControl } from "@/components/AdminField";

import type { ComponentProps } from "react";

import styles from "./AdminInput.module.css";

type AdminInputSize = "md" | "sm";
type AdminInputTone = "default" | "raised";

type AdminInputOwnProps = {
  /** md 44px · sm 40px. 기본 md. multiline이면 높이 대신 rows·호출부 클래스가 정한다. */
  size?: AdminInputSize;
  /** raised는 surface-1 카드 위에 놓이는 입력에 사용한다. */
  tone?: AdminInputTone;
  /** 검증 실패 표시. AdminField 가 error 를 그리면 감싼 입력이 자동으로 받는다. */
  invalid?: boolean;
};

type AdminInputProps =
  | (AdminInputOwnProps & { multiline?: false } & Omit<ComponentProps<"input">, "size">)
  | (AdminInputOwnProps & { multiline: true } & Omit<ComponentProps<"textarea">, "size">);

/**
 * 관리자 폼 공용 텍스트 입력. `multiline`이면 textarea로 렌더링한다.
 *
 * AdminField 안에 있으면 id·aria-describedby·aria-invalid 를 필드에서 받는다.
 * 호출부가 같은 속성을 직접 주면 그쪽이 이긴다.
 * 외형만 소유하며 배치(width·min-height·mono 등)는 호출부 className이 담당한다.
 */
const AdminInput = (props: AdminInputProps) => {
  const field = useAdminFieldControl();
  const { multiline = false, size = "md", tone = "default", invalid, className, ...rest } = props;
  const isInvalid = invalid ?? field?.invalid ?? false;
  const controlClassName = [
    styles.control,
    multiline ? styles.multiline : size === "sm" ? styles.sm : styles.md,
    tone === "raised" ? styles.raised : null,
    isInvalid ? styles.invalid : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const linked = {
    id: field?.controlId,
    "aria-describedby": field?.describedBy,
    "aria-invalid": isInvalid ? true : undefined,
    "data-field": field?.field,
  };

  if (multiline) {
    return (
      <textarea
        {...linked}
        {...(rest as ComponentProps<"textarea">)}
        className={controlClassName}
      />
    );
  }
  return (
    <input
      {...linked}
      {...(rest as Omit<ComponentProps<"input">, "size">)}
      className={controlClassName}
    />
  );
};

export { AdminInput };
