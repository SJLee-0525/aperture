import { adminDevArticleDraftKey, adminFormDraftKey } from "@/constants/storage-keys";

/**
 * 편집 중 잃지 않기 위한 로컬 복구본.
 *
 * 저장 버튼과는 다른 것이다. 저장은 저장소에 쓰고, 복구본은 브라우저가 닫히거나 새로고침될 때를
 * 대비해 폼 값을 그대로 떠 두는 자리다. 저장에 성공하면 지운다.
 * 이미지 바이너리는 넣지 않는다. 폼이 들고 있는 것도 이미 업로드가 끝난 URL 뿐이다.
 *
 * Date 는 JSON 을 지나면 문자열이 된다. 되돌리는 방법은 폼마다 달라서 이 모듈이 하지 않고
 * 호출부가 `revive` 로 넘긴다.
 */

/** 복구본 형식 버전. 폼 필드가 바뀌면 올리고 과거 값은 복구하지 않는다. */
const FORM_RECOVERY_VERSION = 1;

/**
 * 블로그 편집기의 복구본 버전. 다른 폼과 따로 센다.
 *
 * 블로그는 이 공용 모듈보다 먼저 자체 저장소를 갖고 세 번 형식을 올렸다. 기본 버전으로
 * 바꾸면 관리자 브라우저에 남아 있는 복구본이 전부 형식 불일치로 버려진다.
 */
const DEV_ARTICLE_RECOVERY_VERSION = 3;

/**
 * 복구본 수명. 지난달에 덮어 둔 값이 오늘 편집을 덮어쓰는 일이 없게 짧게 잡되,
 * 주말을 넘겨 이어 쓰는 경우는 살린다.
 */
const FORM_RECOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredRecovery<T> = {
  version: number;
  savedAt: number;
  input: T;
};

/** 복구본이 놓이는 자리. 키와 형식 버전이 한 쌍으로 움직인다. */
type RecoverySlot = { key: string; version: number };

/** 엔티티 폼과 설정 편집기가 쓰는 기본 슬롯. */
const formRecoverySlot = (collection: string, id: string): RecoverySlot => ({
  key: adminFormDraftKey(collection, id),
  version: FORM_RECOVERY_VERSION,
});

/** 블로그 편집기 전용 슬롯. 접두사와 버전이 공용과 다른 이유는 위 상수 주석에 있다. */
const articleRecoverySlot = (articleId: string): RecoverySlot => ({
  key: adminDevArticleDraftKey(articleId),
  version: DEV_ARTICLE_RECOVERY_VERSION,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 폼 값을 복구본으로 떠 둔다.
 *
 * @param storage 쓸 저장소.
 * @param slot 저장 자리(키와 형식 버전).
 * @param input 현재 폼 값.
 * @param now 저장 시각(ms).
 * @returns 저장 성공 여부. 실패해도 편집은 계속한다.
 */
const writeFormRecovery = <T>(
  storage: Pick<Storage, "setItem">,
  slot: RecoverySlot,
  input: T,
  now: number = Date.now(),
): boolean => {
  try {
    storage.setItem(
      slot.key,
      JSON.stringify({
        version: slot.version,
        savedAt: now,
        input,
      } satisfies StoredRecovery<T>),
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * 복구본을 읽는다. 읽기만 하고 지우지 않는다. 복구할지는 관리자가 고른다.
 *
 * @param revive JSON 이 문자열로 바꾼 Date 등을 폼 값으로 되돌린다.
 * @returns 복구본과 저장 시각. 값이 없거나 형이 어긋나거나 만료됐으면 null.
 */
const readFormRecovery = <T>(
  storage: Pick<Storage, "getItem">,
  slot: RecoverySlot,
  revive: (input: Record<string, unknown>) => T,
  now: number = Date.now(),
): { savedAt: number; input: T } | null => {
  let raw: string | null;
  try {
    raw = storage.getItem(slot.key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== slot.version) return null;

  const { savedAt, input } = parsed;
  if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
  // 시계 조작·손상 값 방어: 미래에 저장됐거나 수명을 넘긴 값은 쓰지 않는다.
  if (savedAt > now || now - savedAt > FORM_RECOVERY_TTL_MS) return null;
  if (!isRecord(input)) return null;

  return { savedAt, input: revive(input) };
};

/**
 * 복구본을 지운다. 저장에 성공했거나 관리자가 복구를 거절했을 때 부른다.
 */
const clearFormRecovery = (storage: Pick<Storage, "removeItem">, slot: RecoverySlot): void => {
  try {
    storage.removeItem(slot.key);
  } catch {
    // 지우지 못해도 편집을 막지 않는다. 다음 저장이 같은 키를 덮어쓴다.
  }
};

export {
  articleRecoverySlot,
  clearFormRecovery,
  DEV_ARTICLE_RECOVERY_VERSION,
  FORM_RECOVERY_TTL_MS,
  FORM_RECOVERY_VERSION,
  formRecoverySlot,
  readFormRecovery,
  writeFormRecovery,
};
export type { RecoverySlot };
