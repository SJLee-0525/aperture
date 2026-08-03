"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { useRagStaleAlert } from "@/features/admin-maintenance/_hooks/use-rag-stale-alert";

import styles from "./RagStaleBanner.module.css";

/**
 * RAG stale 잔류 경고 배너 — 관리자 전 화면 상단(AdminLayoutClient 마운트).
 * unpublish/삭제 자동 동기화가 실패해 남은 청크를 알리고 원클릭 전체 동기화를 제공한다.
 */
const RagStaleBanner = () => {
  const { dismiss, error, staleCount, sync, syncing, visible } = useRagStaleAlert();

  if (!visible) return null;

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.message}>
        챗봇 검색 인덱스에 불필요 청크 <strong>{staleCount}개</strong>가 남아 있습니다 — 비공개
        전환·삭제된 콘텐츠가 챗봇 답변에 인용될 수 있습니다.
        {error ? <span className={styles.error}> 동기화 실패: {error}</span> : null}
      </p>
      <div className={styles.actions}>
        <Link href={ROUTES.ADMIN_MAINTENANCE} className={styles.detail}>
          자세히
        </Link>
        <button type="button" className={styles.later} onClick={dismiss} disabled={syncing}>
          나중에
        </button>
        <button type="button" className={styles.sync} onClick={sync} disabled={syncing}>
          {syncing ? "동기화 중…" : "지금 동기화"}
        </button>
      </div>
    </div>
  );
};

export { RagStaleBanner };
