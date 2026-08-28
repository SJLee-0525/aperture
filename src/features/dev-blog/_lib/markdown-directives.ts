import type { ArticleMarkdownIssueCode } from "@/features/dev-blog/_lib/markdown-nodes";

/** 영상 ID 는 11 자의 URL-safe base64 조각이다. 길이가 다르면 embed 주소를 만들어도 재생되지 않는다. */
const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/;

/** iframe 으로 바꿔 줄 출처. 전역 CSP `frame-src` 가 허용하는 범위 안이어야 한다. */
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"] as const;

type ArticleDirectiveResult =
  | { kind: "caption"; text: string }
  | { kind: "youtube"; videoId: string; title: string; source: string | null }
  | { kind: "issue"; code: ArticleMarkdownIssueCode; detail?: string };

/**
 * YouTube 주소에서 영상 ID 를 뽑는다. 임의 iframe 을 허용하지 않으므로 이 함수가
 * 통과시킨 ID 로만 embed 주소를 조립한다.
 *
 * `youtu.be/{id}`, `youtube.com/watch?v={id}`, `youtube.com/embed/{id}`, `/shorts/{id}` 를 받는다.
 *
 * @param raw 관리자가 붙여 넣은 주소.
 * @returns 11 자 영상 ID, 형식이 맞지 않으면 null.
 */
const extractYouTubeVideoId = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!YOUTUBE_HOSTS.some((host) => host === url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const candidate =
    url.hostname === "youtu.be"
      ? segments[0]
      : (url.searchParams.get("v") ??
        (segments[0] === "embed" || segments[0] === "shorts" ? segments[1] : undefined));

  return candidate && YOUTUBE_VIDEO_ID.test(candidate) ? candidate : null;
};

/**
 * `::caption[…]` 과 `::youtube[…]{…}` 두 전용 문법만 해석한다.
 *
 * mdast 를 직접 받지 않고 이름·라벨·속성만 받는다. 지시자 판정 규칙이 파서 구조와
 * 분리돼 있어야 관리자 도움말과 테스트가 같은 함수를 그대로 쓸 수 있다.
 * 이미지와의 연결(캡션이 바로 앞 이미지에 붙는지)은 블록 순서를 아는 정규화 단계가 판단한다.
 *
 * @param name 지시자 이름.
 * @param label 대괄호 안의 평문. caption 은 설명, youtube 는 주소다.
 * @param attributes 중괄호 속성.
 * @returns 해석 결과 또는 발행을 막을 issue.
 */
const resolveArticleDirective = (
  name: string,
  label: string,
  attributes: Record<string, string | null | undefined>,
): ArticleDirectiveResult => {
  if (name === "caption") {
    const text = label.trim();
    return text ? { kind: "caption", text } : { kind: "issue", code: "caption-empty" };
  }

  if (name === "youtube") {
    const videoId = extractYouTubeVideoId(label);
    if (!videoId) {
      return { kind: "issue", code: "youtube-url-invalid", detail: label.trim() || undefined };
    }
    const title = (attributes.title ?? "").trim();
    if (!title) return { kind: "issue", code: "youtube-title-missing", detail: videoId };

    const source = (attributes.source ?? "").trim();
    return { kind: "youtube", videoId, title, source: source || null };
  }

  return { kind: "issue", code: "unknown-directive", detail: name };
};

export { extractYouTubeVideoId, resolveArticleDirective };
