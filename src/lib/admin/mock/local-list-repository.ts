import { isRecord, readLocalStore, writeLocalStore } from "@/lib/admin/mock/local-store";

/** 목록 컬렉션의 공통 필드 — 정렬·공개 토글이 기대는 최소 계약. */
type ListEntity = { id: string; order: number; published: boolean };

type LocalListRepositoryConfig<TEntity extends ListEntity, TListItem> = {
  /** localStorage 키. `constants/storage-keys.ts` 의 값을 넘긴다. */
  key: string;
  /** 저장 형식 버전. 컬렉션 타입이 바뀌면 올리고 과거 값은 버린다. */
  version: number;
  /** 오류 문구에 넣을 항목 이름 — live 구현(listCrud)과 같은 톤을 쓴다. */
  label: string;
  /** JSON 왕복에서 Date 로 되살릴 최상위 필드. 값이 유효한 시각이 아니면 저장소를 버린다. */
  dateFields?: readonly string[];
  /** 저장소가 비었을 때 채울 mock. `mocks/*` 를 동적 import 해 첫 사용까지 로드를 미룬다. */
  seed: () => Promise<TEntity[]>;
  /**
   * 목록 행 투영. mock 도 본문·원본 이미지처럼 행에 필요 없는 필드를 빼야
   * B5 의 REST projection 으로 바뀔 때 화면이 받는 모양이 그대로다.
   */
  toListItem: (entity: TEntity) => TListItem;
  /** 저장소를 여는 함수 — 모듈 로드 시점이 아니라 호출 시점에 `window` 를 만진다. */
  getStorage: () => Storage;
};

/** 목록 컬렉션 mock 저장소가 제공하는 CRUD — live(listCrud + REST projection)와 같은 모양. */
type LocalListRepository<TEntity extends ListEntity, TListItem> = {
  newId: () => string;
  list: () => Promise<TListItem[]>;
  get: (id: string) => Promise<TEntity | null>;
  create: (id: string, input: Omit<TEntity, "id">) => Promise<void>;
  update: (id: string, input: Omit<TEntity, "id">) => Promise<void>;
  updateOrder: (id: string, order: number) => Promise<void>;
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
 * Firestore 를 대신하는 목록 컬렉션 mock 저장소 팩토리.
 *
 * 컬렉션마다 키·seed·목록 투영만 다르고 CRUD 절차는 같아서 한 곳으로 모은다 —
 * live 쪽에서 `listCrud` 가 하는 역할의 mock 판이다. 검증은 최소 불변조건만 본다:
 * `id`·`order`·`published` 와 선언한 Date 필드. 개발용 임시 저장소라 컬렉션별 전체
 * 디코더를 두지 않고, 어긋난 값을 만나면 전체를 버리고 mock 으로 다시 seed 한다.
 *
 * 저장 후처리(`requestPublicRevalidate`·`requestRagSync`)는 부르지 않는다 — mock 저장은
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
   * 변경을 덮어쓴다 — Firestore 의 per-document 쓰기에는 없는 mock 고유의 경합이다.
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
    const existing = readLocalStore(storage, config.key, config.version, decode);
    if (existing) return existing;

    const seeded = await config.seed();
    writeLocalStore(storage, config.key, config.version, seeded);
    // 다시 읽어 저장 형식을 거친 사본을 쓴다 — mock 모듈의 객체를 그대로 들고 있지 않는다.
    return readLocalStore(config.getStorage(), config.key, config.version, decode) ?? seeded;
  };

  /**
   * 저장소를 덮어쓴다. 실패는 사용자에게 드러낸다 — 저장한 줄 알았는데 남지 않는
   * 상황이 관리자에게 가장 나쁘다.
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

    // live 목록(orderBy("order"))과 같은 순서로 돌려준다.
    list: async () =>
      (await load())
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(config.toListItem),

    get: async (id) => (await load()).find((entity) => entity.id === id) ?? null,

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

    updateOrder: (id, order) => enqueue(() => patch(id, (entity) => ({ ...entity, order }))),

    setPublished: (id, published) =>
      enqueue(() => patch(id, (entity) => ({ ...entity, published }))),

    remove: (id) =>
      enqueue(async () => {
        const entities = await load();
        save(entities.filter((entity) => entity.id !== id));
      }),
  };
};

export { createLocalListRepository };
