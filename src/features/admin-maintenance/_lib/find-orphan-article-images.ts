"use client";

import { deleteObject, ref } from "firebase/storage";

import { articleBodyStoragePaths } from "@/features/admin-maintenance/_lib/article-body-storage-paths";

import { getFirebaseStorage } from "@/lib/firebase/client";
import { listFolderFiles } from "@/lib/firebase/storage";
import { listDevArticleImageRefsAdmin } from "@/lib/supabase/admin-list";

import { imagePaths } from "@/types/image";

/** 작성 중인 파일이 정리 대상에 포함되지 않도록 기다리는 시간. */
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

/** 관리자 화면에 표시할 삭제 대상 파일. */
type OrphanCandidate = { path: string; size: number; uploadedAt: Date };

type OrphanScanResult = {
  candidates: OrphanCandidate[];
  /** 삭제 대상의 전체 크기. */
  totalBytes: number;
  /** 검사한 `dev-blog/` 파일 수. */
  scannedCount: number;
};

type OrphanDeleteResult = {
  deleted: string[];
  failed: Array<{ path: string; message: string }>;
  /** 확인 후 재검증에서 참조가 생겨 삭제하지 않은 경로. */
  skipped: string[];
};

/**
 * `dev-blog/` 의 모든 파일을 전체 글(초안 포함)의 대표 이미지·본문 참조와 대조해
 * 참조가 없고 업로드 24시간이 지난 파일만 돌려준다. 이 함수는 파일을 지우지 않는다.
 *
 * 본문은 메인 이미지 주소만 저장하므로 프리뷰와 썸네일은 삭제 대상에 포함될 수 있다.
 *
 * @param {() => Date} [now] 24시간 판정 기준 시각. 테스트가 고정할 수 있게 주입받는다.
 * @returns {Promise<OrphanScanResult>} 후보 목록과 요약 수치.
 */
const scanOrphanArticleImages = async (
  now: () => Date = () => new Date(),
): Promise<OrphanScanResult> => {
  const [articles, files] = await Promise.all([
    listDevArticleImageRefsAdmin(),
    listFolderFiles("dev-blog"),
  ]);
  const referenced = new Set(
    articles.flatMap((article) => [
      ...imagePaths(article.cover),
      ...articleBodyStoragePaths(article.body),
    ]),
  );
  const uploadedBefore = now().getTime() - ORPHAN_MIN_AGE_MS;

  const candidates = files
    .filter((file) => !referenced.has(file.path) && file.createdAt.getTime() <= uploadedBefore)
    .map((file) => ({ path: file.path, size: file.size, uploadedAt: file.createdAt }));
  return {
    candidates,
    totalBytes: candidates.reduce((sum, candidate) => sum + candidate.size, 0),
    scannedCount: files.length,
  };
};

/**
 * 관리자가 확인한 미사용 이미지를 삭제한다.
 *
 * 삭제 직전에 다시 검사해 확인받은 경로 중 여전히 참조가 없는 파일만 지운다. 새로 발견한
 * 파일은 건드리지 않으며, 개별 파일 삭제 실패가 다른 파일의 삭제를 막지 않는다.
 *
 * @param {string[]} paths 관리자가 dry run 에서 확인한 후보 경로.
 * @param {() => Date} [now] 재검증의 24시간 판정 기준 시각.
 * @returns {Promise<OrphanDeleteResult>} 경로별 성공·실패·제외 결과.
 */
const deleteOrphanArticleImages = async (
  paths: string[],
  now: () => Date = () => new Date(),
): Promise<OrphanDeleteResult> => {
  const rescan = await scanOrphanArticleImages(now);
  const eligible = new Set(rescan.candidates.map((candidate) => candidate.path));
  const confirmed = [...new Set(paths)];

  const deleted: string[] = [];
  const failed: Array<{ path: string; message: string }> = [];
  const skipped = confirmed.filter((path) => !eligible.has(path));

  await Promise.all(
    confirmed
      .filter((path) => eligible.has(path))
      .map(async (path) => {
        try {
          await deleteObject(ref(getFirebaseStorage(), path));
          deleted.push(path);
        } catch (caught) {
          if ((caught as { code?: string }).code === "storage/object-not-found") {
            deleted.push(path);
            return;
          }
          failed.push({ path, message: (caught as Error).message || "삭제에 실패했습니다." });
        }
      }),
  );
  return { deleted, failed, skipped };
};

export { deleteOrphanArticleImages, scanOrphanArticleImages };
export type { OrphanDeleteResult, OrphanScanResult };
