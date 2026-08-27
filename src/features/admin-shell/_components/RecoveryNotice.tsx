"use client";

import { AdminButton } from "@/components/AdminButton";

import { formatLocalTimestamp } from "@/lib/format/format-date";

import styles from "./RecoveryNotice.module.css";

type Props = {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
};

/** 저장하지 않은 편집본이 남아 있을 때의 안내. 자동으로 덮어쓰지 않고 관리자가 고른다. */
const RecoveryNotice = ({ savedAt, onRestore, onDiscard }: Props) => (
  <div className={styles.panel} role="status">
    <p className={styles.note}>
      저장하지 않은 편집본이 있습니다 ({formatLocalTimestamp(new Date(savedAt))}).
    </p>
    <div className={styles.actions}>
      <AdminButton variant="secondary" size="xs" onClick={onRestore}>
        복구하기
      </AdminButton>
      <button type="button" className={styles.discard} onClick={onDiscard}>
        버리기
      </button>
    </div>
  </div>
);

export { RecoveryNotice };
