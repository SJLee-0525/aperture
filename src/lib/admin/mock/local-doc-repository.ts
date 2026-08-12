import {
  isRecord,
  readLocalStore,
  warnOnDiscard,
  writeLocalStore,
} from "@/lib/admin/mock/local-store";

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
  /**
   * 저장본에 없는 필드를 채울 **빈** 기본값 (`constants/empty-configs.ts`).
   *
   * mock seed 로 채우면 안 된다. 문서 타입에 필드가 새로 생겼을 때 관리자 화면이 mock 문구를
   * 실제 값처럼 보여 주고, 그대로 저장하면 그 문구가 영속된다 — live 읽기가 필드마다
   * `?? EMPTY_*` 를 쓰는 이유와 같다(`empty-configs.ts` 주석).
   */
  emptyDoc: TDoc;
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
 * 디코더를 두지 않는다. 저장본이 없으면 mock 으로 seed 하고, 있으면 **빈 기본값(`emptyDoc`)을
 * 깔고 그 위에 덮는다** — live 읽기가 필드마다 `?? EMPTY_*` 를 채우는 것과 같은 계약이다.
 * 문서 타입에 필드가 새로 생겨도 예전 저장본이 화면을 깨뜨리지 않고, 그 자리에 mock 문구가
 * 들어가 실제 값처럼 보이는 일도 없다.
 *
 * `merge` 는 **최상위 필드 단위 교체**다. live 의 `setDoc(..., { merge: true })` 는 중첩 map 까지
 * 병합하므로 `{ tagline: { ko } }` 처럼 일부만 보내면 기존 `en` 이 남는다. 관리자 폼은 어느
 * 화면이든 자기가 소유한 필드를 통째로 만들어 보내므로 지금은 두 동작이 같은 결과를 낸다.
 * 부분 중첩 쓰기를 하는 화면이 생기면 이 차이가 드러나므로 그때 함께 정한다.
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
    const discarded = warnOnDiscard(config.label);
    const existing = readLocalStore(storage, config.key, config.version, decode, discarded);
    // 저장본에 없는 필드는 **빈 기본값**으로 채운다. seed 로 채우면 관리자가 mock 문구를
    // 자기 값으로 착각해 그대로 저장하게 된다.
    if (existing) return { ...config.emptyDoc, ...existing };

    const seeded = await config.seed();
    save(seeded);
    // 다시 읽어 저장 형식을 거친 사본을 쓴다 — mock 모듈의 객체를 그대로 들고 있지 않는다.
    return (
      readLocalStore(config.getStorage(), config.key, config.version, decode, discarded) ?? seeded
    );
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
