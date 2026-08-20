"use client";

import { articleBodyStoragePaths } from "@/features/admin-maintenance/_lib/article-body-storage-paths";
import {
  groupArticleImageFiles,
  groupStartedAt,
} from "@/features/admin-maintenance/_lib/group-article-image-files";

import { listDevArticleImageRefsAdmin } from "@/lib/supabase/admin-list";
import { deleteImageStrict, listFolderFiles, publicImageUrl } from "@/lib/supabase/storage";

import { imagePaths } from "@/types/image";

import type { ArticleImageGroup } from "@/features/admin-maintenance/_lib/group-article-image-files";

/** 작성 중인 파일이 정리 대상에 포함되지 않도록 기다리는 시간. */
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

/** 이 비율을 넘는 그룹이 한 번에 삭제 대상이 되면 참조 목록을 의심한다. */
const ORPHAN_RATIO_LIMIT = 0.5;

/**
 * 참조 목록이 불완전할 수 있는 상태를 문장으로 돌려준다.
 *
 * 글 조회가 오류 없이 모자라게 오면(전량 조회 절단 등) 살아 있는 이미지가 통째로 삭제 대상이
 * 된다. 비율의 분모는 글 수가 아니라 Storage 그룹 수라, 글이 적고 미참조 이미지가 많은
 * 상태에서도 한도를 넘는다. 그래서 이 값은 삭제를 막는 조건이 아니라 확인을 요구하는 근거다.
 *
 * @returns {string | null} 확인이 필요한 이유. 정상이면 `null`.
 */
const confirmationReasonFor = (
  articleCount: number,
  orphanCount: number,
  groupCount: number,
): string | null => {
  if (articleCount === 0) return "글이 한 편도 조회되지 않아 참조 목록을 신뢰할 수 없습니다.";
  if (groupCount > 0 && orphanCount / groupCount > ORPHAN_RATIO_LIMIT) {
    return `이미지 ${groupCount}개 중 ${orphanCount}개가 삭제 대상입니다.`;
  }
  return null;
};

/** 관리자 표의 한 행. 삭제 대상 그룹 하나를 표시용 값으로 줄인 것이다. */
type OrphanGroup = {
  /** 원본·프리뷰·썸네일 순으로 정렬한 그룹 전체 경로. 삭제 대상이자 행의 식별자다. */
  paths: string[];
  /** 표에 렌더할 주소. 그룹에서 가장 작은 파생본을 고른다. */
  previewUrl: string;
  /** 그룹 전체 크기. */
  size: number;
  /** 그룹에서 가장 이른 업로드 시각. */
  uploadedAt: Date;
  /** 파일명이 아니라 업로드 시각으로 묶었다. 다른 이미지의 파생본이 섞여 있을 수 있다. */
  estimated: boolean;
};

type OrphanScanResult = {
  /** 이미지 단위로 묶은 삭제 대상. 그룹의 `paths` 를 모두 합친 것이 실제 삭제 대상이다. */
  groups: OrphanGroup[];
  /** 삭제 대상의 전체 크기. */
  totalBytes: number;
  /** 검사한 `dev-blog/` 파일 수. */
  scannedCount: number;
  /**
   * 그룹 규칙 때문에 정리 대상에서 빠진 파일. 같은 벌의 다른 파일이 참조돼 있을 뿐,
   * 파일 자체는 미참조이고 업로드 24시간이 지나 자동 삭제와 같은 조건을 만족한다.
   * 이 함수도 삭제 함수도 건드리지 않으며, 관리자가 Storage 에서 직접 정리할 대상이다.
   */
  keptFiles: Array<{ path: string; size: number }>;
  /** `keptFiles` 의 전체 크기. */
  keptBytes: number;
  /**
   * 참조 목록이 불완전할 수 있어 사람 확인이 필요한 이유. 정상이면 `null`.
   * 삭제 함수는 이 값이 있을 때 `acknowledged` 없이는 실행하지 않는다.
   */
  confirmationReason: string | null;
};

type OrphanDeleteResult = {
  deleted: string[];
  failed: Array<{ path: string; message: string }>;
  /** 확인 후 재검증에서 참조가 생겨 삭제하지 않은 경로. */
  skipped: string[];
};

const toOrphanGroup = (group: ArticleImageGroup): OrphanGroup => ({
  paths: group.files.map((file) => file.path),
  previewUrl: group.files[group.files.length - 1].url,
  size: group.files.reduce((sum, file) => sum + file.size, 0),
  uploadedAt: new Date(groupStartedAt(group)),
  estimated: group.estimated,
});

/**
 * `dev-blog/` 의 모든 파일을 이미지 단위로 묶은 뒤, 전체 글(초안 포함)의 대표 이미지·본문
 * 참조와 대조해 정리 대상 그룹만 돌려준다. 이 함수는 파일을 지우지 않는다.
 *
 * 판단은 파일이 아니라 그룹 단위다. 원본·프리뷰·썸네일 중 하나라도 참조돼 있으면 그룹 전체를
 * 남긴다. 본문 Markdown 은 원본 주소만 저장하므로, 이 규칙이 없으면 살아 있는 본문 이미지의
 * 파생본이 매번 정리 대상으로 잡힌다.
 *
 * @param {() => Date} [now] 24시간 판정 기준 시각. 테스트가 고정할 수 있게 주입받는다.
 * @returns {Promise<OrphanScanResult>} 정리 대상 그룹과 요약 수치, 함께 남긴 미참조 파일.
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

  const groups = groupArticleImageFiles(
    files.map((file) => ({
      path: file.path,
      url: publicImageUrl(file.path),
      size: file.size,
      uploadedAt: file.createdAt,
    })),
  );

  const orphanGroups = groups.filter((group) =>
    group.files.every(
      (file) => !referenced.has(file.path) && file.uploadedAt.getTime() <= uploadedBefore,
    ),
  );
  // 관리자가 직접 지울 대상이라 자동 삭제와 같은 파일 단위 조건(미참조 + 24시간 경과)을
  // 그대로 건다. 보호창 때문에 남은 그룹은 이번 검사에서만 빠진 것이라 여기 넣지 않는다.
  const keptFiles = groups
    .filter((group) => group.files.some((file) => referenced.has(file.path)))
    .flatMap((group) =>
      group.files.filter(
        (file) => !referenced.has(file.path) && file.uploadedAt.getTime() <= uploadedBefore,
      ),
    )
    .map((file) => ({ path: file.path, size: file.size }));

  return {
    groups: orphanGroups.map(toOrphanGroup),
    totalBytes: orphanGroups
      .flatMap((group) => group.files)
      .reduce((sum, file) => sum + file.size, 0),
    scannedCount: files.length,
    keptFiles,
    keptBytes: keptFiles.reduce((sum, file) => sum + file.size, 0),
    confirmationReason: confirmationReasonFor(articles.length, orphanGroups.length, groups.length),
  };
};

/**
 * 관리자가 확인한 미사용 이미지를 삭제한다.
 *
 * 삭제 직전에 다시 검사해 확인받은 경로 중 여전히 정리 대상인 파일만 지운다. 재검사도 그룹
 * 단위라, 확인 화면 이후 그룹의 한 파일이 참조되면 같은 그룹의 나머지 파일도 지우지 않는다.
 * 새로 발견한 파일은 건드리지 않으며, 개별 파일 삭제 실패가 다른 파일의 삭제를 막지 않는다.
 *
 * 재검사가 `confirmationReason` 을 내면 `acknowledged` 없이는 아무것도 지우지 않는다.
 *
 * @param {string[]} paths 관리자가 dry run 에서 확인한 후보 경로.
 * @param {{ acknowledged?: boolean; now?: () => Date }} [options] `acknowledged` 는 사람이 확인
 *   문구를 읽고 진행을 택했다는 뜻이다. `now` 는 재검증의 24시간 판정 기준 시각.
 * @returns {Promise<OrphanDeleteResult>} 경로별 성공·실패·제외 결과.
 * @throws {Error} 확인이 필요한 상태인데 `acknowledged` 가 없을 때.
 */
const deleteOrphanArticleImages = async (
  paths: string[],
  options: { acknowledged?: boolean; now?: () => Date } = {},
): Promise<OrphanDeleteResult> => {
  const now = options.now ?? (() => new Date());
  const rescan = await scanOrphanArticleImages(now);
  if (rescan.confirmationReason && !options.acknowledged) {
    throw new Error(`${rescan.confirmationReason} 확인 후 다시 실행하세요.`);
  }
  const eligible = new Set(rescan.groups.flatMap((group) => group.paths));
  const confirmed = [...new Set(paths)];

  const deleted: string[] = [];
  const failed: Array<{ path: string; message: string }> = [];
  const skipped = confirmed.filter((path) => !eligible.has(path));

  await Promise.all(
    confirmed
      .filter((path) => eligible.has(path))
      .map(async (path) => {
        try {
          // 경로별 개별 삭제로 성공·실패를 파일 단위로 구분한다. rescan 이 존재를 방금
          // 확인했으므로 삭제 미확인(세션 만료로 0건)은 성공으로 위장하지 않고 실패다.
          await deleteImageStrict(path);
          deleted.push(path);
        } catch (caught) {
          failed.push({ path, message: (caught as Error).message || "삭제에 실패했습니다." });
        }
      }),
  );
  return { deleted, failed, skipped };
};

export { deleteOrphanArticleImages, scanOrphanArticleImages };
export type { OrphanDeleteResult, OrphanScanResult };
