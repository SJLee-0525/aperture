import {
  isRecord,
  readLocalStore,
  warnOnDiscard,
  writeLocalStore,
} from "@/lib/admin/mock/local-store";

/** 정렬과 공개 상태 변경에 필요한 공통 필드. */
type ListEntity = { id: string; order: number; published: boolean };

/**
 * `order`가 같을 때 문서 ID로 정렬한다.
 *
 * live 정렬은 id 를 코드 포인트 순으로 비교한다. `localeCompare` 는 로케일에 따라
 * 대소문자·기호 순서가 달라져 같은 데이터가 브라우저마다 다른 순서로 보일 수 있다.
 *
 * @param {string} a 앞 문서 ID.
 * @param {string} b 뒤 문서 ID.
 * @returns {number} `Array.prototype.sort` 비교 결과.
 */
const compareDocumentId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

type LocalListRepositoryConfig<TEntity extends ListEntity, TListItem> = {
  /** localStorage 키. `constants/storage-keys.ts` 의 값을 넘긴다. */
  key: string;
  /** 저장 형식 버전. 컬렉션 타입이 바뀌면 올리고 과거 값은 버린다. */
  version: number;
  /** 오류 메시지에 넣을 항목 이름. */
  label: string;
  /** JSON 왕복에서 Date 로 되살릴 최상위 필드. 값이 유효한 시각이 아니면 저장소를 버린다. */
  dateFields?: readonly string[];
  /** 저장소가 비었을 때 채울 mock. `mocks/*` 를 동적 import 해 첫 사용까지 로드를 미룬다. */
  seed: () => Promise<TEntity[]>;
  /**
   * 목록에 필요 없는 본문과 원본 이미지 필드를 제외한다.
   */
  toListItem: (entity: TEntity) => TListItem;
  /** 호출 시점에 브라우저 저장소를 연다. */
  getStorage: () => Storage;
};

/** 목록 컬렉션 mock 저장소가 제공하는 CRUD — live(sortableListCrud + REST projection)와 같은 모양. */
type LocalListRepository<TEntity extends ListEntity, TListItem> = {
  newId: () => string;
  list: () => Promise<TListItem[]>;
  get: (id: string) => Promise<TEntity | null>;
  create: (id: string, input: Omit<TEntity, "id">) => Promise<void>;
  update: (id: string, input: Omit<TEntity, "id">) => Promise<void>;
  updateOrder: (orders: Array<{ id: string; order: number }>) => Promise<void>;
  setPublished: (id: string, published: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

/**
 * ISO 문자열을 Date 로 되돌린다.
 *
 * @param {unknown} value 저장된 시각 값.
 * @returns {Date | null} 유효한 시각. 형식이 어긋나면 null.
 */
const toDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * live 저장소를 대신하는 목록 컬렉션 mock 저장소 팩토리.
 *
 * 컬렉션마다 다른 키, seed, 목록 투영을 받아 공통 CRUD를 제공한다. 검증은
 * 최소 불변조건만 확인한다.
 * `id`·`order`·`published` 와 선언한 Date 필드. 개발용 임시 저장소라 컬렉션별 전체
 * 디코더를 두지 않고, 어긋난 값을 만나면 전체를 버리고 mock 으로 다시 seed 한다.
 *
 * mock 저장은 브라우저에만 남으므로 공개 캐시와 RAG 후처리를 호출하지 않는다.
 * 브라우저에만 남고 공개 화면·RAG 에 반영되지 않으며, 그 사실은 관리자 배지가 알린다.
 *
 * @param {LocalListRepositoryConfig<TEntity, TListItem>} config 컬렉션별 선언.
 * @returns {LocalListRepository<TEntity, TListItem>} 로컬 저장소에 붙은 관리자 CRUD.
 */
const createLocalListRepository = <TEntity extends ListEntity, TListItem>(
  config: LocalListRepositoryConfig<TEntity, TListItem>,
): LocalListRepository<TEntity, TListItem> => {
  /**
   * 쓰기 직렬화 큐. 이 저장소는 문서 단위가 아니라 배열 전체를 읽고 다시 쓰므로,
   * 동시 쓰기(드래그 정렬은 바뀐 항목마다 `updateOrder` 를 병렬로 부른다)가 서로의
   * 변경을 덮어쓸 수 있다. 큐는 쓰기를 차례로 실행해 이 경합을 막는다.
   * 앞선 쓰기가 실패해도 다음 쓰기는 이어 간다.
   */
  let writeQueue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = writeQueue.then(operation, operation);
    writeQueue = result.catch(() => undefined);
    return result;
  };

  /**
   * 항목 하나의 최소 불변조건을 확인하고 Date 필드를 되살린다.
   *
   * @param {unknown} value 저장된 항목.
   * @returns {TEntity | null} 계약을 만족하면 항목, 아니면 null.
   */
  const toEntity = (value: unknown): TEntity | null => {
    if (!isRecord(value)) return null;
    if (typeof value.id !== "string" || !value.id) return null;
    if (typeof value.order !== "number" || typeof value.published !== "boolean") return null;

    const revived: Record<string, unknown> = { ...value };
    for (const field of config.dateFields ?? []) {
      const date = toDate(value[field]);
      if (!date) return null;
      revived[field] = date;
    }
    return revived as TEntity;
  };

  /**
   * 봉투에서 꺼낸 값을 항목 배열로 되돌린다. 하나라도 어긋나면 전체를 버린다.
   *
   * @param {unknown} value 봉투에 담겨 있던 값.
   * @returns {TEntity[] | null} 검증을 통과한 전체 항목, 아니면 null.
   */
  const decode = (value: unknown): TEntity[] | null => {
    if (!Array.isArray(value)) return null;
    const entities = value.map(toEntity);
    return entities.some((entity) => entity === null) ? null : (entities as TEntity[]);
  };

  /**
   * 저장소를 읽고, 비어 있거나 형이 깨졌으면 mock 으로 다시 채운다.
   *
   * @returns {Promise<TEntity[]>} 현재 전체 항목.
   */
  const load = async (): Promise<TEntity[]> => {
    const storage = config.getStorage();
    const discarded = warnOnDiscard(config.label);
    const existing = readLocalStore(storage, config.key, config.version, decode, discarded);
    if (existing) return existing;

    const seeded = await config.seed();
    // seed 쓰기 실패를 무시하면 매 호출 mock 을 다시 만들어 편집이 전혀 남지 않는다.
    save(seeded);
    // 저장 형식으로 다시 읽은 사본을 사용한다.
    return (
      readLocalStore(config.getStorage(), config.key, config.version, decode, discarded) ?? seeded
    );
  };

  /**
   * 저장소를 덮어쓰고 실패하면 오류를 반환한다.
   *
   * @param {TEntity[]} entities 저장할 전체 항목.
   * @returns {void}
   */
  const save = (entities: TEntity[]): void => {
    if (writeLocalStore(config.getStorage(), config.key, config.version, entities)) return;
    throw new Error(
      `브라우저 저장 공간이 부족해 ${config.label}을(를) 저장하지 못했습니다. 오래된 항목을 지우세요.`,
    );
  };

  /**
   * 항목 하나를 바꾼 사본을 저장한다. 대상이 없으면 실패를 알린다.
   *
   * @param {string} id 바꿀 항목의 ID.
   * @param {(entity: TEntity) => TEntity} mutate 바꾼 항목을 돌려주는 함수.
   * @returns {Promise<void>}
   */
  const patch = async (id: string, mutate: (entity: TEntity) => TEntity): Promise<void> => {
    const entities = await load();
    if (!entities.some((entity) => entity.id === id)) {
      throw new Error(`수정할 ${config.label}을(를) 찾지 못했습니다.`);
    }
    save(entities.map((entity) => (entity.id === id ? mutate(entity) : entity)));
  };

  return {
    newId: () => crypto.randomUUID(),

    // live 목록과 같이 order, 문서 ID 순서로 정렬한다.
    list: async () =>
      (await load())
        .slice()
        .sort((a, b) => a.order - b.order || compareDocumentId(a.id, b.id))
        .map(config.toListItem),

    get: async (id) => (await load()).find((entity) => entity.id === id) ?? null,

    // ID 충돌은 기존 항목을 덮어쓰지 않고 오류로 처리한다.
    create: (id, input) =>
      enqueue(async () => {
        const entities = await load();
        if (entities.some((entity) => entity.id === id)) {
          throw new Error(`같은 ID의 ${config.label}이(가) 이미 있습니다.`);
        }
        save([...entities, { ...input, id } as TEntity]);
      }),

    update: (id, input) =>
      enqueue(() => patch(id, (entity) => ({ ...entity, ...input, id: entity.id }))),

    // live 의 정렬 RPC 처럼 한 번의 쓰기로 전 항목을 반영한다. 하나라도 없으면 저장하지 않는다.
    updateOrder: (orders) =>
      enqueue(async () => {
        if (orders.length === 0) return;
        const entities = await load();
        const orderById = new Map(orders.map(({ id, order }) => [id, order]));
        const missing = [...orderById.keys()].filter(
          (id) => !entities.some((entity) => entity.id === id),
        );
        if (missing.length > 0) {
          throw new Error(`수정할 ${config.label}을(를) 찾지 못했습니다.`);
        }
        save(
          entities.map((entity) => {
            const order = orderById.get(entity.id);
            return order === undefined ? entity : { ...entity, order };
          }),
        );
      }),

    setPublished: (id, published) =>
      enqueue(() => patch(id, (entity) => ({ ...entity, published }))),

    // live 는 삭제된 행 수가 0 이면 실패로 처리한다. 여기서 조용히 성공하면 없는 항목을
    // 지운 화면이 mock 에서만 정상으로 보인다.
    remove: (id) =>
      enqueue(async () => {
        const entities = await load();
        if (!entities.some((entity) => entity.id === id)) {
          throw new Error(`삭제할 ${config.label}을(를) 찾지 못했습니다.`);
        }
        save(entities.filter((entity) => entity.id !== id));
      }),
  };
};

export { createLocalListRepository };
