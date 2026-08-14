import { STORAGE_IMAGE_HOSTS } from "@/constants/security-headers";

/**
 * 다운로드 URL의 `/o/{percent-encoded path}` 구간에서 객체 경로를 찾는다.
 * 업로더(`getDownloadURL`)와 mock fixture 가 만드는 주소가 모두 이 형태다.
 * `storage.googleapis.com/{bucket}/{path}` 직접 형태는 이 저장소가 만들지 않으므로 다루지 않는다.
 */
const OBJECT_PATH_PATTERN = /\/o\/([^\s)"'<>\]?#]+)/;

/** Markdown 본문에서 URL 후보를 찾는 패턴. 공백·괄호·따옴표에서 끊는다. */
const URL_PATTERN = /https:\/\/[^\s)"'<>\]]+/g;

/**
 * 본문 Markdown 이 참조하는 블로그 Storage 객체 경로를 모두 찾는다.
 *
 * 허용한 Storage 호스트의 `dev-blog/` 경로만 반환한다. 디코딩할 수 없는 URL과 다른 폴더는
 * 정리 범위가 아니므로 제외한다.
 *
 * @param {string} body 글의 Markdown 원문.
 * @returns {string[]} 중복을 제거한 `dev-blog/` 객체 경로 목록.
 */
const articleBodyStoragePaths = (body: string): string[] => {
  const paths = new Set<string>();
  for (const url of body.match(URL_PATTERN) ?? []) {
    if (!STORAGE_IMAGE_HOSTS.some((host) => url.startsWith(`${host}/`))) continue;
    const encoded = OBJECT_PATH_PATTERN.exec(url)?.[1];
    if (!encoded) continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(encoded);
    } catch {
      continue;
    }
    if (decoded.startsWith("dev-blog/")) paths.add(decoded);
  }
  return [...paths];
};

export { articleBodyStoragePaths };
