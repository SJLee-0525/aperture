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
