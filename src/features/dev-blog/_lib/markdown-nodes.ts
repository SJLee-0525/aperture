/**
 * 블로그 본문의 렌더 계약.
 *
 * Markdown 원문은 관리자가 저장한 문자열이고 그대로 공개 페이지의 DOM 이 된다.
 * 이 저장소에는 백엔드가 없어 렌더 경계가 곧 방어선이므로, 파서가 만든 mdast 를
 * 그대로 렌더하지 않고 **여기 정의한 노드로만** 옮긴 뒤 화면에 넘긴다.
 * 목록에 없는 노드(임의 HTML, 각주, 참조 링크 등)는 옮겨지지 않고 issue 로 남는다.
 * 덕분에 HTML 문자열 단계와 sanitizer 계층이 없고 `dangerouslySetInnerHTML` 도 쓰지 않는다.
 */

import type { ArticleCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";

/** 원문 위치 — 관리자 미리보기가 오류 줄을 짚어 준다. */
type ArticleSourcePoint = { line: number; column: number };

type ArticleInline =
  | { type: "text"; value: string }
  | { type: "strong"; children: ArticleInline[] }
  | { type: "emphasis"; children: ArticleInline[] }
  | { type: "inlineCode"; value: string }
  | { type: "break" }
  | { type: "link"; href: string; target: ArticleLinkTarget; children: ArticleInline[] };

/**
 * 링크를 어떻게 열지. 세 경우의 처리가 서로 달라 boolean 하나로 뭉뚱그리지 않는다.
 * `internal` 은 언어 프리픽스를 붙여 같은 탭에서, `external` 은 새 탭 + 안전한 `rel` 로,
 * `mail` 은 새 탭 없이 그대로 연다.
 */
type ArticleLinkTarget = "internal" | "external" | "mail";

/** 표 열 정렬 — mdast 의 `null`(지정 없음)을 그대로 보존한다. */
type ArticleTableAlign = "left" | "center" | "right" | null;

type ArticleListItem = { children: ArticleBlock[] };

type ArticleBlock =
  | {
      type: "heading";
      /** 글 제목이 페이지 h1 이므로 본문은 h2 부터 시작한다. */
      depth: 2 | 3 | 4;
      /** 목차·본문·URL fragment 가 공유하는 값. `markdown-heading-id` 가 만든다. */
      id: string;
      /** 목차 라벨과 accessible name 에 쓰는 평문. */
      text: string;
      children: ArticleInline[];
    }
  | { type: "paragraph"; children: ArticleInline[] }
  | { type: "list"; ordered: boolean; items: ArticleListItem[] }
  | { type: "blockquote"; children: ArticleBlock[] }
  | { type: "thematicBreak" }
  | {
      type: "table";
      /** 열 수만큼. 지정하지 않은 열은 null 이다. */
      align: ArticleTableAlign[];
      /** 첫 행의 셀. */
      header: ArticleInline[][];
      /** 나머지 행 → 셀 순서. 열 수가 header 와 다를 수 있어 렌더가 보정한다. */
      rows: ArticleInline[][][];
    }
  | {
      type: "code";
      /** 하이라이터가 아는 언어. 별칭 정규화에 실패하면 null 이고 색 없이 렌더한다. */
      language: ArticleCodeLanguage | null;
      /** 원문에 적힌 표기. 하이라이팅과 무관하게 화면에 라벨로 보여 준다. */
      rawLanguage: string;
      value: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
      /** 바로 뒤 `::caption` 지시자가 있을 때만 채워진다. */
      caption: string | null;
    }
  | { type: "youtube"; videoId: string; title: string; source: string | null };

type ArticleDocument = { blocks: ArticleBlock[] };

/**
 * 발행을 막는 사유. 문구가 아니라 코드로만 다룬다 —
 * 관리자에게 보여 줄 한국어·영어 문장은 화면이 생기는 단계에서 사전을 거쳐 붙인다.
 */
type ArticleMarkdownIssueCode =
  /** 허용 목록에 없는 Markdown 요소. `detail` 에 원래 노드 종류가 들어간다. */
  | "unsupported-node"
  /** 본문 heading 은 h2~h4 만 쓴다. */
  | "heading-level"
  /** 이미지는 단독 블록일 때만 허용한다. 문장 중간 이미지는 배치가 깨진다. */
  | "inline-image"
  /** 대체 텍스트 없는 이미지. */
  | "image-alt-missing"
  /** 허용하지 않은 이미지 출처. */
  | "image-source-not-allowed"
  /** 허용하지 않은 링크 스킴. */
  | "link-not-allowed"
  /** 앞에 이미지가 없는 `::caption`. */
  | "caption-without-image"
  /** 앞 이미지에 이미 캡션이 붙어 있는 `::caption` — 어느 쪽을 남길지 글쓴이만 안다. */
  | "caption-duplicated"
  /** 설명이 비어 있는 `::caption` — 지우려던 것인지 쓰다 만 것인지 구분할 수 없다. */
  | "caption-empty"
  /** 영상 ID 를 뽑을 수 없는 `::youtube` 주소. */
  | "youtube-url-invalid"
  /** `title` 없는 `::youtube` — facade 와 iframe 의 accessible name 이 비어 버린다. */
  | "youtube-title-missing"
  /** 이름을 모르는 지시자. */
  | "unknown-directive"
  /** `[글자][라벨]` 참조 문법. 별도 정의 줄을 함께 읽어야 주소가 정해져 지원 범위 밖이다. */
  | "reference-not-supported"
  /** 중첩이 허용 깊이를 넘었다. 문서마다 한 번만 보고한다. */
  | "nesting-too-deep";

type ArticleMarkdownIssue = {
  code: ArticleMarkdownIssueCode;
  point: ArticleSourcePoint;
  /** 원인을 좁히는 값. 노드 종류, 거부된 주소처럼 그대로 화면에 보여 줘도 되는 것만 담는다. */
  detail?: string;
};

export type {
  ArticleBlock,
  ArticleDocument,
  ArticleInline,
  ArticleLinkTarget,
  ArticleMarkdownIssue,
  ArticleMarkdownIssueCode,
  ArticleSourcePoint,
};
