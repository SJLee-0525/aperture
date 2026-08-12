import { isRecord, readLocalStore, writeLocalStore } from "@/lib/admin/mock/local-store";

/** 설정 문서 mock 저장소 — 전체 저장(set)과 화면 소유 필드 병합(merge)을 모두 제공한다. */
type LocalDocRepository<TDoc extends Record<string, unknown>> = {
  get: () => Promise<TDoc>;
  set: (doc: TDoc) => Promise<void>;
  merge: (fields: Partial<TDoc>) => Promise<void>;
};

type LocalDocRepositoryConfig<TDoc extends Record<string, unknown>> = {
  /** localStorage 키. `constants/storage-keys.ts` 의 값을 넘긴다. */
  key: string;
  /** 저장 형식 버전. 문서 타입이 바뀌면 올리고 과거 값은 버린다. */
  version: number;
  /** 오류 문구에 넣을 문서 이름 — live 구현과 같은 톤을 쓴다. */
  label: string;
  /** 저장소가 비었을 때 채울 mock 문서. */
  seed: () => Promise<TDoc>;
  /** 저장소를 여는 함수 — 모듈 로드 시점이 아니라 호출 시점에 `window` 를 만진다. */
  getStorage: () => Storage;
};

/**
 * `site` 컬렉션의 고정 문서(config·music·dev)를 대신하는 mock 저장소 팩토리.
 *
 * 목록 컬렉션과 달리 문서가 하나뿐이라 CRUD 대신 읽기·전체 저장·부분 병합만 있다.
 * `merge` 는 live 의 `updateSiteConfigFields` 병합 계약과 같은 자리다 — 서로 다른 관리자
 * 화면이 오래된 전체 snapshot 으로 다른 화면의 최신 변경을 덮어쓰지 않게 한다.
 *
 * 검증은 객체인지만 본다. 세 문서 모두 Date 필드가 없고, 개발용 임시 저장소라 필드별
 * 디코더를 두지 않는다. 버전이 다르거나 형이 깨지면 mock 으로 다시 seed 하고, 형이 맞는
 * 저장본은 **seed 를 기본값으로 깔고 그 위에 덮는다** — live 읽기가 필드마다 `?? EMPTY_*`
 * 기본값을 채우는 것의 mock 판이다. 문서 타입에 필드가 새로 생겨도 버전을 올리기 전의
 * 저장본이 화면을 깨뜨리지 않는다.
 *
 * @param {LocalDocRepositoryConfig<TDoc>} config 문서별 선언.
 * @returns {LocalDocRepository<TDoc>} 로컬 저장소에 붙은 설정 문서 읽기·쓰기.
 */
const createLocalDocRepository = <TDoc extends Record<string, unknown>>(
  config: LocalDocRepositoryConfig<TDoc>,
): LocalDocRepository<TDoc> => {
  const decode = (value: unknown): TDoc | null => (isRecord(value) ? (value as TDoc) : null);

  /**
   * 저장소를 읽고, 비어 있거나 형이 깨졌으면 mock 으로 다시 채운다.
   *
   * @returns {Promise<TDoc>} seed 기본값 위에 저장본을 덮은 현재 문서.
   */
  const load = async (): Promise<TDoc> => {
    const storage = config.getStorage();
    const seeded = await config.seed();
    const existing = readLocalStore(storage, config.key, config.version, decode);
    if (existing) return { ...seeded, ...existing };

    writeLocalStore(storage, config.key, config.version, seeded);
    // 다시 읽어 저장 형식을 거친 사본을 쓴다 — mock 모듈의 객체를 그대로 들고 있지 않는다.
    return readLocalStore(config.getStorage(), config.key, config.version, decode) ?? seeded;
  };

  /**
   * 문서를 덮어쓴다. 실패는 사용자에게 드러낸다.
   *
   * @param {TDoc} doc 저장할 문서 전체.
   * @returns {void}
   */
  const save = (doc: TDoc): void => {
    if (writeLocalStore(config.getStorage(), config.key, config.version, doc)) return;
    throw new Error(`브라우저 저장 공간이 부족해 ${config.label}을 저장하지 못했습니다.`);
  };

  return {
    get: load,

    set: async (doc) => {
      // set 전에도 load 를 거친다 — seed 가 안 된 저장소에 부분 문서만 남는 상황을 막는다.
      await load();
      save(doc);
    },

    merge: async (fields) => {
      const current = await load();
      save({ ...current, ...fields });
    },
  };
};

export { createLocalDocRepository };
