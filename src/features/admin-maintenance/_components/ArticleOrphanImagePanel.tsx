"use client";

import { useEffect, useState } from "react";

import { AdminButton } from "@/components/AdminButton";


import {
  deleteOrphanArticleImages,
  OrphanConfirmationRequiredError,
  orphanConfirmationToken,
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
 * 원본·프리뷰·썸네일 한 벌이 모두 미참조이고 업로드한 지 24시간이 지난 것만 찾는다.
 * 삭제 직전에 같은 기준으로 다시 확인하며, Storage를 연결하지 않는 mock 모드에서는
 * 실행할 수 없다.
 *
 * @returns {JSX.Element}
 */
const ArticleOrphanImagePanel = () => {
  const mock = shouldUseMockContent();
  const [pending, setPending] = useState(false);
  const [scan, setScan] = useState<OrphanScanResult | null>(null);
  const [deletion, setDeletion] = useState<OrphanDeleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    setCopied(false);
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
    if (!scan) return;
    const paths = scan.groups.flatMap((group) => group.paths);
    if (paths.length === 0) return;
    // 참조 목록을 의심할 근거가 있으면 확인 문구에 이유를 먼저 보여준다.
    const warning = scan.confirmationReason ? `⚠️ ${scan.confirmationReason}\n\n` : "";
    if (
      !window.confirm(
        `${warning}사용되지 않는 이미지 ${scan.groups.length}개(파일 ${paths.length}개)를 삭제할까요? 삭제한 파일은 복구할 수 없습니다.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    setCopied(false);
    try {
      // 방금 확인한 화면의 근거를 그대로 넘긴다. 삭제 직전 재검사가 달라졌으면 거부된다.
      setDeletion(
        await deleteOrphanArticleImages(paths, {
          confirmationToken: orphanConfirmationToken(scan),
        }),
      );
      setScan(await scanOrphanArticleImages());
    } catch (caught) {
      // 재검사가 달라진 경우에는 최신 결과로 화면을 바꿔야 다음 확인이 새 내용을 담는다.
      if (caught instanceof OrphanConfirmationRequiredError) setScan(caught.scan);
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  };

  const copyKeptPaths = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(
        (scan?.keptFiles ?? []).map((file) => file.path).join("\n"),
      );
      setCopied(true);
    } catch {
      setError("경로를 복사하지 못했습니다. 목록에서 직접 선택해 복사하세요.");
    }
  };

  const totalFiles = scan?.groups.reduce((sum, group) => sum + group.paths.length, 0) ?? 0;
  const estimatedCount = scan?.groups.filter((group) => group.estimated).length ?? 0;

  return (
    <section className={base.panel}>
      <h1 className={base.title}>사용되지 않는 블로그 이미지</h1>
      <p className={base.description}>
        한 이미지의 원본·프리뷰·썸네일을 한 벌로 묶어, <strong>셋 다 어디에도 쓰이지 않고</strong>{" "}
        업로드한 지 24시간이 지났을 때만 정리 대상으로 봅니다. 하나라도 쓰이고 있으면 그 이미지는
        건드리지 않습니다. 먼저 삭제 대상을 확인할 수 있으며, 삭제 직전에 같은 기준으로 한 번 더
        검사합니다. 파일명을 공유하지 않는 예전 파일은 업로드 시각으로 묶고 <strong>추정</strong>{" "}
        으로 표시합니다. 이 줄은 다른 이미지의 파생본을 담고 있을 수 있습니다.
      </p>

      <div className={base.actions}>
        <AdminButton variant="primary" size="sm" disabled={pending || mock} onClick={rescan}>
          삭제 대상 다시 확인
        </AdminButton>
        <AdminButton
          variant="danger"
          size="sm"
          disabled={pending || mock || (scan?.groups.length ?? 0) === 0}
          onClick={removeAll}
        >
          확인 후 삭제
        </AdminButton>
      </div>

      {mock ? (
        <p className={base.status}>
          mock 모드에서는 실행할 수 없습니다. 실제 Supabase 연결이 필요합니다. .env.local에
          NEXT_PUBLIC_USE_MOCK=0을 두고 다시 실행하세요.
        </p>
      ) : null}

      {scan ? (
        <div className={base.summary} aria-live="polite">
          <div className={base.summaryLine}>
            <strong>
              삭제 대상 이미지 {scan.groups.length}개 · 파일 {totalFiles}개
              {estimatedCount > 0 ? ` · 추정 묶음 ${estimatedCount}개` : ""}
            </strong>
            <span>
              검사한 파일 {scan.scannedCount}개 · 예상 절감 {formatBytes(scan.totalBytes)}
            </span>
          </div>

          {scan.keptFiles.length > 0 ? (
            <details className={styles.kept}>
              <summary>
                사용 중 이미지와 함께 유지한 파일 {scan.keptFiles.length}개 ·{" "}
                {formatBytes(scan.keptBytes)} (정리 대상 아님)
              </summary>
              <p className={styles.keptHint}>
                같은 벌의 다른 파일이 쓰이고 있어 그룹 규칙이 남긴 파일입니다. 파일 자체는 어디에도
                쓰이지 않고 업로드한 지 24시간이 지나, 위 삭제 버튼과 같은 조건을 만족합니다. 경로를
                복사해 Storage에서 직접 정리할 수 있습니다.
              </p>
              <AdminButton
                variant="secondary"
                size="xs"
                className={styles.copy}
                onClick={copyKeptPaths}
              >
                {copied ? "복사함" : "경로 복사"}
              </AdminButton>
              <ul className={styles.keptList}>
                {scan.keptFiles.map((file) => (
                  <li key={file.path} className={styles.path} title={file.path}>
                    {file.path}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {scan.groups.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">미리보기</th>
                    <th scope="col">파일</th>
                    <th scope="col" className={styles.numberCell}>
                      크기
                    </th>
                    <th scope="col">업로드 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.groups.map((group) => (
                    <tr key={group.paths[0]}>
                      <td>
                        <span className={styles.thumb}>
                          {/* 전역 설정이 Vercel 최적화를 끄고 Storage 파일을 그대로 보내므로
                              next/image 대신 img 를 쓴다. 주소는 그룹에서 가장 작은 파생본이다. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={group.previewUrl}
                            alt=""
                            className={styles.thumbImg}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      </td>
                      <td className={styles.pathCell}>
                        {group.estimated ? (
                          <span className={styles.estimated}>추정 묶음</span>
                        ) : null}
                        {group.paths.map((path) => (
                          <span key={path} className={styles.path} title={path}>
                            {path}
                          </span>
                        ))}
                      </td>
                      <td className={styles.numberCell}>{formatBytes(group.size)}</td>
                      <td>{formatUploadedAt(group.uploadedAt)}</td>
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
