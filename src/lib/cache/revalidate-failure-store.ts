import { STORAGE_KEYS } from "@/constants/storage-keys";

/** 재검증에 실패해 아직 지우지 못한 캐시 대상. */
type RevalidateFailure = {
  tags: string[];
  paths: string[];
  /** 마지막 실패 시각(ISO). 표시용이며 재시도 판단에는 쓰지 않는다. */
  failedAt: string;
  /** 마지막 실패 사유. 서버가 준 메시지를 그대로 담는다. */
  reason: string;
};

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * 저장소를 읽는다. 형식이 깨진 값은 없는 것으로 본다.
 *
 * @returns {RevalidateFailure | null} 남아 있는 실패 기록.
 */
const readRevalidateFailure = (): RevalidateFailure | null => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RevalidateFailure>;
    if (!Array.isArray(parsed.tags) || !Array.isArray(parsed.paths)) return null;
    return {
      tags: parsed.tags.filter((tag): tag is string => typeof tag === "string"),
      paths: parsed.paths.filter((path): path is string => typeof path === "string"),
      failedAt: typeof parsed.failedAt === "string" ? parsed.failedAt : "",
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return null;
  }
};

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

/**
 * 실패한 대상을 누적한다.
 *
 * 저장 자체는 이미 DB 에 반영된 뒤이므로 이 기록은 "공개 화면이 아직 옛 내용"이라는
 * 뜻이다. 여러 번 실패하면 대상이 합쳐져 한 번의 재시도로 전부 다시 시도할 수 있다.
 *
 * @param {{ tags: string[]; paths: string[]; reason: string }} failure 이번에 실패한 대상과 사유.
 * @returns {void}
 */
const recordRevalidateFailure = (failure: {
  tags: string[];
  paths: string[];
  reason: string;
}): void => {
  if (typeof localStorage === "undefined") return;
  const previous = readRevalidateFailure();
  const merged: RevalidateFailure = {
    tags: [...new Set([...(previous?.tags ?? []), ...failure.tags])],
    paths: [...new Set([...(previous?.paths ?? []), ...failure.paths])],
    failedAt: new Date().toISOString(),
    reason: failure.reason,
  };
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE, JSON.stringify(merged));
  } catch {
    // Safari 프라이빗 모드와 쿼터 초과에서 던진다. 이 함수는 이탈 핸들러에서도 불리므로
    // 미처리 예외가 되면 그 흐름이 끊긴다. 기록이 없으면 배너만 뜨지 않는다.
    return;
  }
  notify();
};

/**
 * 기록을 지운다. 재시도가 성공했을 때만 부른다.
 *
 * @returns {void}
 */
const clearRevalidateFailure = (): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE);
  notify();
};

/**
 * 기록 변화를 구독한다. 같은 탭의 저장 실패를 배너가 즉시 반영하는 데 쓴다.
 *
 * @param {Listener} listener 변화 시 호출할 함수.
 * @returns {() => void} 구독 해제 함수.
 */
const subscribeRevalidateFailure = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export {
  clearRevalidateFailure,
  readRevalidateFailure,
  recordRevalidateFailure,
  subscribeRevalidateFailure,
};
export type { RevalidateFailure };
