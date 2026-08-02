const CHAT_PROFILE_CACHE_TAG = "chat-profile-context";
const FIRESTORE_CACHE_TAG_PREFIX = "firestore";

const firestoreCollectionCacheTag = (collectionId: string): string =>
  `${FIRESTORE_CACHE_TAG_PREFIX}:${collectionId}`;

const firestoreDocumentCacheTag = (collectionId: string, documentId: string): string =>
  `${firestoreCollectionCacheTag(collectionId)}:${documentId}`;

export { CHAT_PROFILE_CACHE_TAG, firestoreCollectionCacheTag, firestoreDocumentCacheTag };
