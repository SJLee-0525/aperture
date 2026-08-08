/**
 * 원본 URL이 지정한 Firebase Storage 버킷의 HTTPS 객체 URL인지 검사한다.
 *
 * @param {string} rawUrl 검사할 원본 URL.
 * @param {string} bucket 허용할 Firebase Storage 버킷 이름.
 * @returns {boolean} 호스트, 경로와 인증 정보 조건을 모두 만족하면 `true`다.
 */
const isAllowedStorageSourceUrl = (rawUrl: string, bucket: string): boolean => {
  if (!bucket) return false;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;

    if (url.hostname === "firebasestorage.googleapis.com") {
      return url.pathname.startsWith(`/v0/b/${encodeURIComponent(bucket)}/o/`);
    }
    if (url.hostname === "storage.googleapis.com") {
      return url.pathname.startsWith(`/${encodeURIComponent(bucket)}/`);
    }
    return false;
  } catch {
    return false;
  }
};

export { isAllowedStorageSourceUrl };
