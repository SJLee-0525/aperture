import { STORAGE_KEYS } from "@/constants/storage-keys";

/**
 * 이 브라우저가 좋아요한 사진 id 집합을 localStorage 로 영속하는 외부 스토어.
 * useSyncExternalStore 로 구독 — SSR 기본 미좋아요(getServerSnapshot=false)라 하이드레이션 불일치가 없고,
 * setState-in-effect 없이 mount 후 실제 상태로 자연히 재조정된다.
 */
const listeners = new Set<() => void>();

const read = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.LIKED_PHOTOS);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const write = (ids: Set<string>): void => {
  try {
    window.localStorage.setItem(STORAGE_KEYS.LIKED_PHOTOS, JSON.stringify([...ids]));
  } catch {
    // 사생활 모드 등 localStorage 불가 — 무시(서버 카운트는 이미 반영됨).
  }
};

const emit = (): void => listeners.forEach((listener) => listener());

/** useSyncExternalStore subscribe — 클라이언트에서만 호출된다(다른 탭 변경도 storage 이벤트로 반영). */
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.LIKED_PHOTOS) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** getSnapshot 용 — primitive boolean 이라 별도 캐시 불필요. */
const hasLiked = (photoId: string): boolean => read().has(photoId);

const addLiked = (photoId: string): void => {
  const next = read();
  next.add(photoId);
  write(next);
  emit();
};

const removeLiked = (photoId: string): void => {
  const next = read();
  next.delete(photoId);
  write(next);
  emit();
};

export { addLiked, hasLiked, removeLiked, subscribe };
