"use client";

import { useEffect, useState } from "react";

import {
  migrateImageThumbnails,
  type MigrationProgress,
  type MigrationResult,
} from "@/features/admin-maintenance/_lib/migrate-image-thumbnails";

import { shouldUseMockContent } from "@/lib/content/content-source";

import styles from "./ImageMigrationPanel.module.css";

const ImageMigrationPanel = () => {
  // 썸네일 마이그레이션은 실제 DB·Storage 연결을 요구한다 — mock 모드에서는 잠근다.
  const mock = shouldUseMockContent();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mock) return;
    let active = true;
    migrateImageThumbnails(true)
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((caught: Error) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, [mock]);

  const run = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm("기존 문서와 Storage에 프리뷰·썸네일을 생성할까요?")) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await migrateImageThumbnails(dryRun, setProgress));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.panel}>
      <h1 className={styles.title}>이미지 데이터 마이그레이션</h1>
      <p className={styles.description}>
        사진·음악 포스터·개발 이미지에 누락된 960px 프리뷰와 320px 썸네일 WebP를 생성하고, 앨범 커버
        스냅샷을 보강합니다. 이미 완료된 파생본은 건너뛰므로 다시 실행해도 안전합니다.
      </p>
      <div className={styles.actions}>
        <button type="button" disabled={pending || mock} onClick={() => run(true)}>
          변경 대상 확인
        </button>
        <button type="button" disabled={pending || mock} onClick={() => run(false)}>
          마이그레이션 실행
        </button>
      </div>
      {mock ? (
        <p className={styles.status}>
          mock 모드에서는 실행할 수 없습니다. 실제 Supabase 연결이 필요합니다. .env.local에
          NEXT_PUBLIC_USE_MOCK=0을 두고 다시 실행하세요.
        </p>
      ) : null}
      {progress ? (
        <p className={styles.status} aria-live="polite">
          {progress.stage} · {progress.completed}/{progress.total}
        </p>
      ) : null}
      {result ? (
        <div className={styles.summary} aria-live="polite">
          <div className={styles.summaryLine}>
            <strong>{result.percent}% 완료</strong>
            <span>
              {result.completed}/{result.total} · 변경 필요 {result.pending}
            </span>
          </div>
          <div className={styles.meter} aria-hidden="true">
            <span style={{ width: `${result.percent}%` }} />
          </div>
          <p className={styles.result}>
            대상: 사진 {result.photos} · 음악 포스터 {result.musicPosters} · 개발 이미지{" "}
            {result.devImages} · 앨범 {result.albums}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};

export { ImageMigrationPanel };
