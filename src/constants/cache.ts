const CHAT_PROFILE_CACHE_TAG = "chat-profile-context";
/** 태그는 물리 테이블명이 아니라 COLLECTIONS 논리 이름으로 만든다 — 읽기·쓰기 양쪽이 공유한다. */
const DB_CACHE_TAG_PREFIX = "db";
const PUBLIC_CACHE_REVALIDATE_SECONDS = 3_600;
const PUBLIC_CACHE_STALE_SECONDS = 86_400;
const PUBLIC_CACHE_CONTROL =
  `public, max-age=0, s-maxage=${PUBLIC_CACHE_REVALIDATE_SECONDS}, ` +
  `stale-while-revalidate=${PUBLIC_CACHE_STALE_SECONDS}`;

const collectionCacheTag = (collectionId: string): string =>
  `${DB_CACHE_TAG_PREFIX}:${collectionId}`;

const documentCacheTag = (collectionId: string, documentId: string): string =>
  `${collectionCacheTag(collectionId)}:${documentId}`;

export {
  CHAT_PROFILE_CACHE_TAG,
  PUBLIC_CACHE_CONTROL,
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  collectionCacheTag,
  documentCacheTag,
};
