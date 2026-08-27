"use client";

import { AdminButton } from "@/components/AdminButton";
import { RecoveryNotice } from "@/features/admin-shell/_components/RecoveryNotice";

import type { FormEvent, ReactNode, RefObject } from "react";

import styles from "./admin-form.module.css";

type Recovery = {
  pending: { savedAt: number } | null;
  restore: () => unknown;
  discard: () => void;
};

type Props = {
  title: string;
  formRef: RefObject<HTMLFormElement | null>;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  /** 저장 중에는 두 버튼을 잠근다. 업로드가 있는 폼은 그 상태까지 포함해 넘긴다. */
  busy: boolean;
  saving: boolean;
  /** 저장소 실패 문구. 필드 검증 오류는 각 필드가 그린다. */
  error: string | null;
  recovery: Recovery;
  /** 복구를 고르면 폼 값을 그것으로 바꾼다. */
  onRestore: (restored: unknown) => void;
  children: ReactNode;
};

/**
 * 엔티티 폼의 공통 껍데기 — 복구 안내·제목·오류 문단·액션 줄.
 *
 * 목록에는 셸이 있는데 폼에는 없어 여섯이 같은 스물여섯 줄을 각자 적었다.
 * `noValidate` 는 여기서 고정한다. 검증은 `validate-*` 가 하고 필드가 문구를 그린다.
 */
const AdminFormShell = ({
  title,
  formRef,
  onSubmit,
  onCancel,
  busy,
  saving,
  error,
  recovery,
  onRestore,
  children,
}: Props) => (
  <form className={styles.form} ref={formRef} onSubmit={onSubmit} noValidate>
    {recovery.pending ? (
      <RecoveryNotice
        savedAt={recovery.pending.savedAt}
        onRestore={() => {
          const restored = recovery.restore();
          if (restored) onRestore(restored);
        }}
        onDiscard={recovery.discard}
      />
    ) : null}

    <header className={styles.head}>
      <h1 className={styles.title}>{title}</h1>
    </header>

    {children}

    {error ? (
      <p className={styles.error} role="alert">
        {error}
      </p>
    ) : null}

    <div className={styles.actions}>
      <AdminButton variant="primary" type="submit" disabled={busy}>
        {saving ? "저장 중…" : "저장"}
      </AdminButton>
      <AdminButton variant="secondary" onClick={onCancel} disabled={busy}>
        취소
      </AdminButton>
    </div>
  </form>
);

export { AdminFormShell };
