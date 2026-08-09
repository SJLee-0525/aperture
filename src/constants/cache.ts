const CHAT_PROFILE_CACHE_TAG = "chat-profile-context";
const FIRESTORE_CACHE_TAG_PREFIX = "firestore";
const PUBLIC_CACHE_REVALIDATE_SECONDS = 3_600;
const PUBLIC_CACHE_STALE_SECONDS = 86_400;
const PUBLIC_CACHE_CONTROL =
  `public, max-age=0, s-maxage=${PUBLIC_CACHE_REVALIDATE_SECONDS}, ` +
  `stale-while-revalidate=${PUBLIC_CACHE_STALE_SECONDS}`;

const firestoreCollectionCacheTag = (collectionId: string): string =>
  `${FIRESTORE_CACHE_TAG_PREFIX}:${collectionId}`;

const firestoreDocumentCacheTag = (collectionId: string, documentId: string): string =>
  `${firestoreCollectionCacheTag(collectionId)}:${documentId}`;

export {
  CHAT_PROFILE_CACHE_TAG,
  PUBLIC_CACHE_CONTROL,
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  firestoreCollectionCacheTag,
  firestoreDocumentCacheTag,
};
