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
 * 봉투를 열어 담긴 값을 되돌린다.
 *
 * @param {Pick<Storage, "getItem">} storage 읽을 저장소.
 * @param {string} key localStorage 키.
 * @param {number} version 기대하는 저장 형식 버전. 다르면 통째로 버린다.
 * @param {(value: unknown) => T | null} decode 담긴 값의 형 검증. 어긋나면 null 을 돌려준다.
 * @returns {T | null} 검증을 통과한 값. 없거나 버렸으면 null 이며 호출부는 mock 으로 다시 seed 한다.
 */
const readLocalStore = <T>(
  storage: Pick<Storage, "getItem">,
  key: string,
  version: number,
  decode: (value: unknown) => T | null,
): T | null => {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
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
  if (!isRecord(parsed) || parsed.version !== version) return null;

  return decode(parsed.value);
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

export { isRecord, readLocalStore, writeLocalStore };
