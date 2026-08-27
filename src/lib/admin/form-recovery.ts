import { adminFormDraftKey } from "@/constants/storage-keys";

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
 * 복구본 수명. 지난달에 덮어 둔 값이 오늘 편집을 덮어쓰는 일이 없게 짧게 잡되,
 * 주말을 넘겨 이어 쓰는 경우는 살린다.
 */
const FORM_RECOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredRecovery<T> = {
  version: number;
  savedAt: number;
  input: T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 폼 값을 복구본으로 떠 둔다.
 *
 * @param storage 쓸 저장소.
 * @param collection 컬렉션 이름. 문서 ID 와 함께 키를 이룬다.
 * @param id 편집 중인 문서 ID.
 * @param input 현재 폼 값.
 * @param now 저장 시각(ms).
 * @returns 저장 성공 여부. 실패해도 편집은 계속한다.
 */
const writeFormRecovery = <T>(
  storage: Pick<Storage, "setItem">,
  collection: string,
  id: string,
  input: T,
  now: number = Date.now(),
): boolean => {
  try {
    storage.setItem(
      adminFormDraftKey(collection, id),
      JSON.stringify({
        version: FORM_RECOVERY_VERSION,
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
  collection: string,
  id: string,
  revive: (input: Record<string, unknown>) => T,
  now: number = Date.now(),
): { savedAt: number; input: T } | null => {
  let raw: string | null;
  try {
    raw = storage.getItem(adminFormDraftKey(collection, id));
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
  if (!isRecord(parsed) || parsed.version !== FORM_RECOVERY_VERSION) return null;

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
const clearFormRecovery = (
  storage: Pick<Storage, "removeItem">,
  collection: string,
  id: string,
): void => {
  try {
    storage.removeItem(adminFormDraftKey(collection, id));
  } catch {
    // 지우지 못해도 편집을 막지 않는다. 다음 저장이 같은 키를 덮어쓴다.
  }
};

export {
  clearFormRecovery,
  FORM_RECOVERY_TTL_MS,
  FORM_RECOVERY_VERSION,
  readFormRecovery,
  writeFormRecovery,
};
