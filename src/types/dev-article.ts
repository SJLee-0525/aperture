import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

/**
 * 개발 블로그 글 (devArticles) — 상세는 모달이 아니라 독립 페이지(`/dev/articles/[slug]`).
 *
 * 제목·요약·대표 이미지 설명은 다른 콘텐츠처럼 한·영을 모두 저장하지만
 * `body` 만 한국어 Markdown 원문 하나다. 본문을 언어별로 이중 저장하지 않는다.
 * 읽기 시간과 목차는 `body` 에서 파생하며 별도 필드로 중복 저장하지 않는다.
 */
type DevArticle = {
  id: string;
  /** URL 식별자. 최초 발행 이후에는 바꾸지 않는다(`firstPublishedAt` 참조). */
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  /** 한국어 Markdown 원문. 지원 문법은 `features/dev-blog/_lib/markdown-*` 이 정의한다. */
  body: string;
  cover: ImageMeta | null;
  /** 대표 이미지를 설명하는 대체 텍스트. 제목을 반복하지 않는다. cover 가 없으면 비어 있다. */
  coverAlt: LocalizedText | null;
  /** `DevArticleTag.id` 참조 — 라벨이 아니라 id 를 저장한다. */
  tags: string[];
  /** 연관 프로젝트 관계의 단일 원천. 표시 순서를 그대로 유지한다. */
  relatedProjectIds: string[];
  /**
   * 목록 최상단 고정 섹션에 노출한다. 페이지 번호와 무관하게 보이고, 일반 목록에도
   * 발행일 자리에 그대로 남아 페이지 나누기가 달라지지 않는다.
   *
   * `MAX_PINNED_ARTICLES` 만큼만 켤 수 있고, 값을 바꾸는 경로는 저장소의 `setPinned` 뿐이다.
   * 발행 여부와 독립이라 초안에 켜 두면 발행한 뒤부터 적용된다.
   */
  pinned: boolean;
  published: boolean;
  /** 관리자가 직접 지정하는 발행 일시. 공개 목록 정렬의 기준이며 초안에서는 비어 있다. */
  publishedAt: Date | null;
  /**
   * 최초 발행에 성공한 순간 한 번만 기록한다. 발행을 취소해도 지우지 않는다.
   * 값이 있으면 slug 변경을 UI 와 저장 함수 양쪽에서 거부한다.
   */
  firstPublishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * 프로젝트 상세가 역방향으로 찾는 글 투영.
 *
 * 관계의 단일 원천은 글의 `relatedProjectIds` 이고 프로젝트 문서에는 글 id 를 저장하지 않는다.
 * 프로젝트 쪽 목록은 공개 글의 관계 필드를 모아 뒤집어 만들며, 이 투영에는 본문이 없다.
 */
type DevArticleProjectLink = Pick<DevArticle, "id" | "slug" | "title" | "relatedProjectIds"> & {
  /** 공개 글에는 항상 값이 있다. 정렬과 표시가 모두 이 값을 쓴다. */
  publishedAt: Date | null;
};

export type { DevArticle, DevArticleProjectLink };
