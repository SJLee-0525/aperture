"use client";

import { useState } from "react";

import {
  migrateImageThumbnails,
  type MigrationProgress,
  type MigrationResult,
} from "@/features/admin-maintenance/_lib/migrate-image-thumbnails";

import styles from "./ImageMigrationPanel.module.css";

const ImageMigrationPanel = () => {
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm("기존 문서와 Storage에 썸네일을 생성할까요?")) return;
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
        썸네일이 없는 사진·음악 포스터·개발 이미지를 320px WebP로 생성하고, 앨범 커버 스냅샷을
        보강합니다. 이미 완료된 항목은 건너뛰므로 다시 실행해도 안전합니다.
      </p>
      <div className={styles.actions}>
        <button type="button" disabled={pending} onClick={() => run(true)}>
          변경 대상 확인
        </button>
        <button type="button" disabled={pending} onClick={() => run(false)}>
          마이그레이션 실행
        </button>
      </div>
      {progress ? (
        <p className={styles.status} aria-live="polite">
          {progress.stage} · {progress.completed}/{progress.total}
        </p>
      ) : null}
      {result ? (
        <p className={styles.result}>
          사진 {result.photos} · 음악 포스터 {result.musicPosters} · 개발 이미지 {result.devImages}{" "}
          · 앨범 {result.albums}
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

export { ImageMigrationPanel };
