import type { PostSyncPolicy } from "@/lib/firebase/list-crud";
import type { DevArticle } from "@/types/dev-article";

/**
 * RAG 청크에 실리는 필드만 뽑은 비교 지문. 발행일·대표 이미지·연관 프로젝트는
 * 검색 본문에 들어가지 않으므로 그 값만 바뀐 저장은 동기화를 건너뛴다(§11).
 *
 * @param {DevArticle} article 비교할 글.
 * @returns {string} 검색 입력 필드의 직렬화 결과.
 */
const ragFingerprint = (article: DevArticle): string =>
  JSON.stringify({
    title: article.title,
    summary: article.summary,
    body: article.body,
    tags: article.tags,
  });

/**
 * 블로그 글의 RAG 동기화 정책 — §11 표 계약의 구현.
 *
 * - 초안 생성·수정·초안 삭제: `skip` (공개 검색에 존재한 적이 없다)
 * - 발행 취소·발행 글 삭제: `remove` (route 가 원본을 재조회해 청크를 비운다)
 * - 최초 발행·재발행: `sync`
 * - 발행 유지 수정: 제목·요약·본문·태그가 바뀐 경우만 `sync`, 그 외(발행일·대표 이미지·연관 프로젝트) `skip`
 *
 * @param {DevArticle | null} before 쓰기 직전 문서. 생성이면 `null`.
 * @param {DevArticle | null} after 쓰기 결과 문서. 삭제면 `null`.
 * @returns {"sync" | "remove" | "skip"} 동기화 작업 종류.
 */
const devArticleRagPolicy: PostSyncPolicy<DevArticle> = (before, after) => {
  const wasPublic = before?.published === true;
  const isPublic = after?.published === true;
  if (!wasPublic && !isPublic) return "skip";
  if (wasPublic && !isPublic) return "remove";
  if (!wasPublic) return "sync";
  return before && after && ragFingerprint(before) === ragFingerprint(after) ? "skip" : "sync";
};

export { devArticleRagPolicy };
