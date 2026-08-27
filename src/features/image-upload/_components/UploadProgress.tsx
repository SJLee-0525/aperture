"use client";

import { UPLOAD_STAGE_LABEL } from "@/features/image-upload/_lib/upload-progress";

import type { UploadStage } from "@/features/image-upload/_lib/upload-progress";

import styles from "./UploadProgress.module.css";

type Props = {
  stage: UploadStage;
  /** 여러 장을 올릴 때만 0보다 크다. 한 장이면 단계 문구만 보인다. */
  completed?: number;
  total?: number;
};

/**
 * 업로드 진행 표시.
 *
 * 단계와 남은 개수를 함께 알린다. "처리 중…" 하나만 보이면 4천만 화소 사진의 압축이
 * 멈춘 것과 구분되지 않는다.
 */
const UploadProgress = ({ stage, completed = 0, total = 0 }: Props) => {
  if (stage === "idle") return null;
  const batch = total > 1;
  const ratio = batch ? Math.min(1, completed / total) : 0;

  return (
    <div className={styles.wrap} role="status">
      <p className={styles.label}>
        {UPLOAD_STAGE_LABEL[stage]}
        {batch ? ` ${completed}/${total}` : ""}
      </p>
      {batch ? (
        <span className={styles.track} aria-hidden="true">
          <span className={styles.bar} style={{ width: `${Math.round(ratio * 100)}%` }} />
        </span>
      ) : null}
    </div>
  );
};

export { UploadProgress };
