import { supabaseUrl } from "@/lib/supabase/config";

/** Supabase 공개 객체 URL 의 경로 프리픽스. 서명 URL·변환 엔드포인트는 매칭되지 않는다. */
const SUPABASE_PUBLIC_PREFIX = "/storage/v1/object/public/media/";

/** Markdown 본문에서 URL 후보를 찾는 패턴. 공백·괄호·따옴표에서 끊는다. */
const URL_PATTERN = /https:\/\/[^\s)"'<>\]]+/g;

/**
 * Supabase 공개 URL 에서 객체 경로를 뽑는다. 경로 세그먼트가 그대로 남는 형태라
 * 정규식 대신 URL 파싱으로 origin·프리픽스를 정확히 대조한다.
 *
 * @param candidate 본문에서 찾은 URL 후보.
 * @returns 디코딩된 객체 경로. 이 프로젝트의 공개 객체가 아니면 `null`.
 */
const supabaseObjectPath = (candidate: string): string | null => {
  const origin = supabaseUrl();
  if (!origin) return null;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.origin !== origin || !url.pathname.startsWith(SUPABASE_PUBLIC_PREFIX)) return null;
  try {
    return decodeURIComponent(url.pathname.slice(SUPABASE_PUBLIC_PREFIX.length));
  } catch {
    return null;
  }
};

/**
 * 본문 Markdown 이 참조하는 블로그 Storage 객체 경로를 모두 찾는다.
 *
 * Supabase 공개 URL 중 `dev-blog/` 경로만 반환한다. 디코딩할 수 없는 URL과 다른 폴더는
 * 정리 범위가 아니므로 제외한다.
 *
 * @param body 글의 Markdown 원문.
 * @returns 중복을 제거한 `dev-blog/` 객체 경로 목록.
 */
const articleBodyStoragePaths = (body: string): string[] => {
  const paths = new Set<string>();
  for (const url of body.match(URL_PATTERN) ?? []) {
    const decoded = supabaseObjectPath(url);
    if (decoded?.startsWith("dev-blog/")) paths.add(decoded);
  }
  return [...paths];
};

export { articleBodyStoragePaths };
