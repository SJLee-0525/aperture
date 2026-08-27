"use client";

import { useEffect, useState } from "react";

import { AdminButton } from "@/components/AdminButton";

import {
  generatePortfolioEmbeddings,
  type PortfolioEmbeddingResult,
} from "@/features/admin-maintenance/_lib/generate-portfolio-embeddings";
import {
  getPortfolioEmbeddingStatus,
  type PortfolioEmbeddingStatus,
} from "@/features/admin-maintenance/_lib/get-portfolio-embedding-status";

import { shouldUseMockContent } from "@/lib/content/content-source";

import styles from "./ImageMigrationPanel.module.css";

const EmbeddingMigrationPanel = () => {
  // 임베딩 생성·상태 조회는 실제 Supabase 와 OpenAI 연결을 요구한다. mock 모드에서는 잠근다.
  const mock = shouldUseMockContent();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PortfolioEmbeddingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PortfolioEmbeddingStatus | null>(null);

  useEffect(() => {
    if (mock) return;
    let active = true;
    getPortfolioEmbeddingStatus()
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((caught: Error) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, [mock]);

  const run = async () => {
    if (!window.confirm("공개 포트폴리오 전체의 검색 임베딩을 생성하거나 갱신할까요?")) return;
    setPending(true);
    setResult(null);
    setError(null);
    try {
      setResult(await generatePortfolioEmbeddings());
      setStatus(await getPortfolioEmbeddingStatus());
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>데이터 임베딩 관리</h2>
      <p className={styles.description}>
        프로필·개발 프로젝트·트러블슈팅·블로그 글·연주·수상·사진·앨범을 의미 단위로 나눠 OpenAI
        임베딩으로 저장합니다. 공개 콘텐츠나 임베딩 모델을 변경한 뒤 다시 실행하세요.
      </p>
      <div className={styles.actions}>
        <AdminButton variant="primary" size="sm" disabled={pending || mock} onClick={run}>
          {pending ? "임베딩 생성 중…" : "전체 임베딩 생성·갱신"}
        </AdminButton>
      </div>
      {mock ? (
        <p className={styles.status}>
          mock 모드에서는 실행할 수 없습니다. 실제 Supabase·OpenAI 연결이 필요합니다. .env.local에
          NEXT_PUBLIC_USE_MOCK=0을 두고 다시 실행하세요.
        </p>
      ) : null}
      {status ? (
        <div className={styles.summary} aria-live="polite">
          <div className={styles.summaryLine}>
            <strong>{status.percent}% 완료</strong>
            <span>
              {status.completed}/{status.total} · 갱신 필요 {status.pending}
            </span>
          </div>
          <div className={styles.meter} aria-hidden="true">
            <span style={{ width: `${status.percent}%` }} />
          </div>
          <p className={styles.result}>
            {status.model} · 이전 모델 {status.outdated} · 불필요 청크 {status.stale}
          </p>
        </div>
      ) : null}
      {result ? (
        <p className={styles.result} aria-live="polite">
          청크 {result.count}개 · {result.model} · {result.dimensions}차원
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};

export { EmbeddingMigrationPanel };
