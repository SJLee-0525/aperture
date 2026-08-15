import { STORAGE_IMAGE_HOSTS } from "@/constants/security-headers";
import { supabaseUrl } from "@/lib/supabase/config";

/**
 * Firebase 다운로드 URL의 `/o/{percent-encoded path}` 구간에서 객체 경로를 찾는다.
 * 마이그레이션 이전에 저장된 본문이 아직 이 형태를 가질 수 있어 과도기 동안 유지한다.
 */
const FIREBASE_OBJECT_PATH_PATTERN = /\/o\/([^\s)"'<>\]?#]+)/;

/** Supabase 공개 객체 URL 의 경로 프리픽스. 서명 URL·변환 엔드포인트는 매칭되지 않는다. */
const SUPABASE_PUBLIC_PREFIX = "/storage/v1/object/public/media/";

/** Markdown 본문에서 URL 후보를 찾는 패턴. 공백·괄호·따옴표에서 끊는다. */
const URL_PATTERN = /https:\/\/[^\s)"'<>\]]+/g;

/**
 * Supabase 공개 URL 에서 객체 경로를 뽑는다. 경로 세그먼트가 그대로 남는 형태라
 * 정규식 대신 URL 파싱으로 origin·프리픽스를 정확히 대조한다.
 *
 * @param {string} candidate 본문에서 찾은 URL 후보.
 * @returns {string | null} 디코딩된 객체 경로. 이 프로젝트의 공개 객체가 아니면 `null`.
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
 * Firebase 다운로드 URL 에서 객체 경로를 뽑는다.
 *
 * @param {string} candidate 본문에서 찾은 URL 후보.
 * @returns {string | null} 디코딩된 객체 경로. 허용 호스트가 아니면 `null`.
 */
const firebaseObjectPath = (candidate: string): string | null => {
  if (!STORAGE_IMAGE_HOSTS.some((host) => candidate.startsWith(`${host}/`))) return null;
  const encoded = FIREBASE_OBJECT_PATH_PATTERN.exec(candidate)?.[1];
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
};

/**
 * 본문 Markdown 이 참조하는 블로그 Storage 객체 경로를 모두 찾는다.
 *
 * Supabase 공개 URL 과 마이그레이션 이전의 Firebase URL 을 모두 지원한다 — 한쪽이라도
 * 놓치면 참조 집합이 비어 **본문 이미지 전체가 미사용 삭제 후보가 된다.**
 * `dev-blog/` 경로만 반환하며, 디코딩할 수 없는 URL 과 다른 폴더는 정리 범위가 아니라 제외한다.
 *
 * @param {string} body 글의 Markdown 원문.
 * @returns {string[]} 중복을 제거한 `dev-blog/` 객체 경로 목록.
 */
const articleBodyStoragePaths = (body: string): string[] => {
  const paths = new Set<string>();
  for (const url of body.match(URL_PATTERN) ?? []) {
    const decoded = supabaseObjectPath(url) ?? firebaseObjectPath(url);
    if (decoded?.startsWith("dev-blog/")) paths.add(decoded);
  }
  return [...paths];
};

export { articleBodyStoragePaths };
