"use client";

import { createContext, useContext, useId } from "react";

import type { ComponentProps, ReactNode } from "react";

import styles from "./AdminField.module.css";

type AdminFieldContextValue = {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
};

const AdminFieldContext = createContext<AdminFieldContextValue | null>(null);

/** 필드가 감싼 입력이 id·설명·오류 상태를 받아 가는 통로. 필드 밖에서는 null 이다. */
const useAdminFieldControl = (): AdminFieldContextValue | null => useContext(AdminFieldContext);

type AdminFieldProps = {
  label: ReactNode;
  /** 라벨 뒤에 " *"를 붙인다. 입력의 required 속성은 별도로 전달해야 한다. */
  required?: boolean;
  /** 입력 아래 안내. 라벨 밖에 그려 접근 이름에 섞이지 않고 aria-describedby 로만 붙는다. */
  hint?: ReactNode;
  /** 검증 실패 문구. 있으면 입력이 aria-invalid 를 받는다. */
  error?: ReactNode;
} & Omit<ComponentProps<"div">, "children"> & { children?: ReactNode };

/**
 * 라벨과 입력을 세로로 묶는 관리자 폼 필드.
 *
 * 라벨은 `htmlFor` 로 입력에 붙는다. 감싸는 형태로 두면 안내 문구까지 접근 이름에 흡수돼
 * 낭독기가 "주소 (SLUG) 발행한 글의 주소는 바꿀 수 없습니다…" 를 한 덩어리로 읽는다.
 * 호출부별 배치(width·flex·grid)는 className으로 전달한다.
 */
const AdminField = ({
  label,
  required,
  hint,
  error,
  className,
  children,
  ...rest
}: AdminFieldProps) => {
  const id = useId();
  const controlId = `${id}-control`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div {...rest} className={className ? `${styles.field} ${className}` : styles.field}>
      <label className={styles.label} htmlFor={controlId}>
        {label}
        {required ? " *" : null}
      </label>
      <AdminFieldContext.Provider
        value={{ controlId, describedBy: describedBy || undefined, invalid: error != null }}
      >
        {children}
      </AdminFieldContext.Provider>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

export { AdminField, useAdminFieldControl };
