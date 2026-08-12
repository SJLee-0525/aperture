/**
 * mock 단계의 관리자 저장소가 공유하는 localStorage 봉투.
 *
 * Firestore 를 대신하는 브라우저 저장소는 컬렉션마다 하나씩 생기는데, 버전 표기·JSON 직렬화·
 * 용량 초과 처리는 어느 컬렉션이든 같다. 그 공통 절차만 여기로 모으고, 담긴 값의 형 검증은
 * 각 저장소가 `decode` 로 가져온다 — 블로그처럼 엄격하게 볼 수도, 목록 컬렉션처럼 최소
 * 불변조건만 볼 수도 있다.
 *
 * 버전이 다르거나 JSON 이 깨졌으면 값 전체를 버린다(null). 일부만 살리면 어느 항목이
 * 사라졌는지 모른 채 편집을 이어가게 되고, 이 저장소는 어차피 mock seed 로 다시 채울 수 있다.
 */

/**
 * 배열이 아닌 객체인지 확인한다.
 *
 * @param {unknown} value 확인할 값.
 * @returns {value is Record<string, unknown>} 일반 객체이면 true.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 저장본이 있었지만 쓰지 못하고 버린 이유.
 *
 * "값이 없다" 와 "값이 있었는데 버렸다" 는 호출부에서 똑같이 null 로 보이지만 뜻이 다르다.
 * 앞은 처음 여는 저장소고, 뒤는 관리자가 편집해 둔 내용이 사라진 상황이다.
 */
type LocalStoreDiscardReason = "parse-failed" | "version-mismatch" | "decode-failed";

/**
 * 봉투를 열어 담긴 값을 되돌린다.
 *
 * `getItem` 이 던지면 삼키지 않는다. 저장소를 아예 읽을 수 없는 상태를 null 로 바꾸면
 * 화면에는 "처음 여는 빈 저장소" 와 구분되지 않는 모습이 나오고, 그 위에서 한 편집은
 * 저장도 되지 않는다. 정상으로 보이는 빈 저장소가 조용한 실패 중 가장 나쁘다.
 *
 * @param {Pick<Storage, "getItem">} storage 읽을 저장소.
 * @param {string} key localStorage 키.
 * @param {number} version 기대하는 저장 형식 버전. 다르면 통째로 버린다.
 * @param {(value: unknown) => T | null} decode 담긴 값의 형 검증. 어긋나면 null 을 돌려준다.
 * @param {(reason: LocalStoreDiscardReason) => void} [onDiscard] 저장본을 버릴 때 사유를 알린다.
 * @returns {T | null} 검증을 통과한 값. 저장본이 없거나 버렸으면 null 이며 호출부가 다시 seed 한다.
 * @throws {Error} 저장소 자체를 읽을 수 없을 때(차단·비활성).
 */
const readLocalStore = <T>(
  storage: Pick<Storage, "getItem">,
  key: string,
  version: number,
  decode: (value: unknown) => T | null,
  onDiscard?: (reason: LocalStoreDiscardReason) => void,
): T | null => {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (caught) {
    throw new Error(
      "브라우저 저장소를 읽지 못했습니다. 시크릿 창이거나 저장소가 차단된 상태일 수 있습니다.",
      { cause: caught },
    );
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    onDiscard?.("parse-failed");
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== version) {
    onDiscard?.("version-mismatch");
    return null;
  }

  const decoded = decode(parsed.value);
  if (decoded === null) onDiscard?.("decode-failed");
  return decoded;
};

/**
 * 값을 봉투에 담아 덮어쓴다. Date 는 JSON 직렬화에서 ISO 문자열이 되므로
 * 되살리는 쪽(decode)이 책임진다.
 *
 * @param {Pick<Storage, "setItem">} storage 쓸 저장소.
 * @param {string} key localStorage 키.
 * @param {number} version 저장 형식 버전.
 * @param {unknown} value 저장할 값 전체.
 * @returns {boolean} 저장 성공 여부. 용량 초과·차단이면 false 다.
 */
const writeLocalStore = (
  storage: Pick<Storage, "setItem">,
  key: string,
  version: number,
  value: unknown,
): boolean => {
  try {
    storage.setItem(key, JSON.stringify({ version, value }));
    return true;
  } catch {
    return false;
  }
};

/**
 * 저장본을 버릴 때 개발 콘솔에 사유를 남기는 기본 처리.
 *
 * mock 저장소는 개발·E2E 전용이라 관리자에게 배너를 띄우기보다, 편집분이 mock 으로
 * 되돌아간 사실을 콘솔에서 바로 잇는 편이 낫다. 아무것도 남기지 않으면 화면만 보고는
 * 되돌아갔다는 것 자체를 알 수 없다.
 *
 * @param {string} label 컬렉션·문서 이름.
 * @returns {(reason: LocalStoreDiscardReason) => void} 사유를 받는 콜백.
 */
const warnOnDiscard =
  (label: string) =>
  (reason: LocalStoreDiscardReason): void => {
    console.warn(
      `[admin mock] 저장된 ${label} 을(를) 쓰지 못해 mock 으로 되돌립니다 (${reason}). 편집한 내용은 남지 않습니다.`,
    );
  };

export { isRecord, readLocalStore, warnOnDiscard, writeLocalStore };
