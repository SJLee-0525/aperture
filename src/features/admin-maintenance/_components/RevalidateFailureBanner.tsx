"use client";

import { useRevalidateFailure } from "@/features/admin-maintenance/_hooks/use-revalidate-failure";

import styles from "./RagStaleBanner.module.css";

/**
 * 공개 캐시 재검증 실패 배너 — 관리자 전 화면 상단(AdminLayoutClient 마운트).
 *
 * 저장은 이미 DB 에 반영된 뒤라 데이터가 사라진 상황이 아니다. 공개 화면이 아직 옛
 * 내용을 보여 준다는 사실과 다시 시도할 수단을 알린다. 재시도하지 않아도 ISR 주기가 지나면
 * 자동으로 갱신된다.
 *
 * @returns {JSX.Element | null} 남은 실패가 없으면 null.
 */
const RevalidateFailureBanner = () => {
  const { error, failure, retry, retrying } = useRevalidateFailure();

  if (!failure) return null;

  const targetCount = failure.tags.length + failure.paths.length;

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.message}>
        공개 페이지 재검증이 실패해 <strong>{targetCount}곳</strong>이 아직 옛 내용입니다. 저장은
        끝났습니다. 다시 시도하지 않아도 최대 1시간 뒤 갱신됩니다.
        {error ? <span className={styles.error}> 재시도 실패: {error}</span> : null}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.sync} onClick={retry} disabled={retrying}>
          {retrying ? "재검증 중…" : "지금 다시 시도"}
        </button>
      </div>
    </div>
  );
};

export { RevalidateFailureBanner };
