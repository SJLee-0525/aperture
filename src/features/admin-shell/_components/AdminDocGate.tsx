"use client";

import { objectParticle } from "@/lib/i18n/korean-particle";

import type { AdminDocStatus } from "@/hooks/use-admin-doc-load";
import type { ReactNode } from "react";

import styles from "./admin-doc-state.module.css";

type Props = {
  status: AdminDocStatus;
  error?: string | null;
  /** "연주" 처럼 화면이 다루는 대상. 세 문구가 이것으로 만들어진다. */
  noun: string;
  children: ReactNode;
};

/**
 * 수정 화면의 로딩·없음·오류 3분기.
 *
 * 문서를 찾은 뒤에만 children 을 그린다. 폼이 초기값을 필수로 받기 때문이다.
 */
const AdminDocGate = ({ status, error, noun, children }: Props) => {
  const particle = objectParticle(noun);

  if (status === "loading") return <p className={styles.state}>불러오는 중…</p>;
  if (status === "missing") {
    return <p className={styles.state}>{`${noun}${particle} 찾을 수 없습니다.`}</p>;
  }
  if (status === "error") {
    return (
      <p className={styles.stateError} role="alert">
        {error ?? `${noun}${particle} 불러오지 못했습니다.`}
      </p>
    );
  }
  return <>{children}</>;
};

export { AdminDocGate };
