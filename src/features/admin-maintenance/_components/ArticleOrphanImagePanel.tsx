"use client";

import { useEffect, useState } from "react";

import {
  deleteOrphanArticleImages,
  scanOrphanArticleImages,
  type OrphanDeleteResult,
  type OrphanScanResult,
} from "@/features/admin-maintenance/_lib/find-orphan-article-images";

import { shouldUseMockContent } from "@/lib/content/content-source";

import styles from "./ArticleOrphanImagePanel.module.css";
import base from "./ImageMigrationPanel.module.css";

/**
 * 바이트 수를 관리자 표에 읽기 좋은 단위로 줄인다.
 *
 * @param {number} bytes 파일 크기.
 * @returns {string} KB/MB 로 반올림한 문자열.
 */
const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
};

/**
 * 업로드 시각을 표에 맞는 짧은 형식으로 만든다.
 *
 * @param {Date} value 업로드 시각.
 * @returns {string} `YYYY-MM-DD HH:mm` 형식.
 */
const formatUploadedAt = (value: Date): string =>
  `${value.toISOString().slice(0, 10)} ${value.toTimeString().slice(0, 5)}`;

/**
 * 글에서 사용하지 않는 블로그 이미지를 정리하는 패널.
 *
 * 참조가 없고 업로드한 지 24시간이 지난 `dev-blog/` 파일을 찾는다. 삭제 직전에
 * 참조를 다시 확인하며, Storage를 연결하지 않는 mock 모드에서는 실행할 수 없다.
 *
 * @returns {JSX.Element}
 */
const ArticleOrphanImagePanel = () => {
  const mock = shouldUseMockContent();
  const [pending, setPending] = useState(false);
  const [scan, setScan] = useState<OrphanScanResult | null>(null);
  const [deletion, setDeletion] = useState<OrphanDeleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mock) return;
    let active = true;
    scanOrphanArticleImages()
      .then((value) => {
        if (active) setScan(value);
      })
      .catch((caught: Error) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, [mock]);

  const rescan = async () => {
    setPending(true);
    setError(null);
    setDeletion(null);
    try {
      setScan(await scanOrphanArticleImages());
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  };

  const removeAll = async () => {
    const candidates = scan?.candidates ?? [];
    if (candidates.length === 0) return;
    if (
      !window.confirm(
        `사용되지 않는 이미지 ${candidates.length}개를 삭제할까요? 삭제한 파일은 복구할 수 없습니다.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      setDeletion(await deleteOrphanArticleImages(candidates.map((candidate) => candidate.path)));
      setScan(await scanOrphanArticleImages());
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={base.panel}>
      <h1 className={base.title}>사용되지 않는 블로그 이미지</h1>
      <p className={base.description}>
        대표 이미지나 본문에서 사용하지 않고, 업로드한 지 24시간이 지난 파일을 찾습니다. 먼저 삭제
        대상을 확인할 수 있으며, 삭제 직전에 참조 여부를 한 번 더 검사합니다. 본문에 넣은 이미지의
        프리뷰와 썸네일은 사용되지 않는 파일로 표시될 수 있습니다. 이 파일을 삭제해도 본문에는
        영향이 없습니다.
      </p>

      <div className={base.actions}>
        <button type="button" disabled={pending || mock} onClick={rescan}>
          삭제 대상 다시 확인
        </button>
        <button
          type="button"
          disabled={pending || mock || (scan?.candidates.length ?? 0) === 0}
          onClick={removeAll}
        >
          확인 후 삭제
        </button>
      </div>

      {mock ? (
        <p className={base.status}>
          mock 모드에서는 실행할 수 없습니다. 실제 Firestore·Storage 연결이 필요합니다. .env.local에
          NEXT_PUBLIC_USE_MOCK=0을 두고 다시 실행하세요.
        </p>
      ) : null}

      {scan ? (
        <div className={base.summary} aria-live="polite">
          <div className={base.summaryLine}>
            <strong>삭제 대상 {scan.candidates.length}개</strong>
            <span>
              검사한 파일 {scan.scannedCount}개 · 예상 절감 {formatBytes(scan.totalBytes)}
            </span>
          </div>
          {scan.candidates.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">경로</th>
                    <th scope="col" className={styles.numberCell}>
                      크기
                    </th>
                    <th scope="col">업로드 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.candidates.map((candidate) => (
                    <tr key={candidate.path}>
                      <td className={styles.pathCell} title={candidate.path}>
                        {candidate.path}
                      </td>
                      <td className={styles.numberCell}>{formatBytes(candidate.size)}</td>
                      <td>{formatUploadedAt(candidate.uploadedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={base.result}>정리할 파일이 없습니다.</p>
          )}
        </div>
      ) : null}

      {deletion ? (
        <p className={base.result} aria-live="polite">
          삭제 {deletion.deleted.length}개
          {deletion.skipped.length > 0 ? ` · 재검증 제외 ${deletion.skipped.length}개` : ""}
          {deletion.failed.length > 0 ? ` · 실패 ${deletion.failed.length}개` : ""}
        </p>
      ) : null}

      {deletion && deletion.failed.length > 0 ? (
        <p className={base.error} role="alert">
          {deletion.failed.map((failure) => `${failure.path}: ${failure.message}`).join(" / ")}{" "}
          실패한 파일은 다음 확인에서 다시 표시됩니다.
        </p>
      ) : null}

      {error ? (
        <p className={base.error} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
};

export { ArticleOrphanImagePanel };
