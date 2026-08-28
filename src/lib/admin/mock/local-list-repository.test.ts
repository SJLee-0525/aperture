import { describe, expect, it } from "vitest";

import { createLocalListRepository } from "@/lib/admin/mock/local-list-repository";

/** 테스트 컬렉션 — 목록 투영에서 빠져야 하는 큰 필드(body)와 Date 필드(shotAt)를 갖춘다. */
type Item = {
  id: string;
  order: number;
  published: boolean;
  title: string;
  body: string;
  shotAt: Date;
};

type Row = Pick<Item, "id" | "order" | "published" | "title">;

const KEY = "ap-admin-test:v1";

const item = (overrides: Partial<Item> = {}): Item => ({
  id: "a",
  order: 0,
  published: true,
  title: "첫 항목",
  body: "본문 전체",
  shotAt: new Date("2026-03-01T09:00:00.000Z"),
  ...overrides,
});

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
};

const repository = (storage: Storage, seed: Item[] = [item(), item({ id: "b", order: 1 })]) =>
  createLocalListRepository<Item, Row>({
    key: KEY,
    version: 1,
    label: "항목",
    dateFields: ["shotAt"],
    seed: async () => seed,
    toListItem: ({ id, order, published, title }) => ({ id, order, published, title }),
    getStorage: () => storage,
  });

describe("createLocalListRepository", () => {
  it("빈 저장소를 seed 로 채우고 order 순으로 나열한다", async () => {
    const repo = repository(memoryStorage(), [
      item({ id: "b", order: 1, title: "둘째" }),
      item({ id: "a", order: 0, title: "첫째" }),
    ]);

    const rows = await repo.list();
    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("목록 투영은 선언한 필드만 담는다", async () => {
    const repo = repository(memoryStorage());

    const [row] = await repo.list();
    expect(row).not.toHaveProperty("body");
    expect(row).not.toHaveProperty("shotAt");
  });

  it("get 은 전체 항목을 Date 까지 되살려 돌려준다", async () => {
    const repo = repository(memoryStorage());

    const found = await repo.get("a");
    expect(found?.body).toBe("본문 전체");
    expect(found?.shotAt).toBeInstanceOf(Date);
    expect(found?.shotAt.toISOString()).toBe("2026-03-01T09:00:00.000Z");
    expect(await repo.get("없는-id")).toBeNull();
  });

  it("생성·수정·삭제가 저장소를 거쳐 왕복한다", async () => {
    const storage = memoryStorage();
    const repo = repository(storage);

    const id = repo.newId();
    await repo.create(id, {
      order: 2,
      published: false,
      title: "새 항목",
      body: "",
      shotAt: new Date(),
    });
    expect((await repo.list()).map((row) => row.id)).toContain(id);

    await repo.update(id, {
      order: 2,
      published: false,
      title: "고친 제목",
      body: "",
      shotAt: new Date(),
    });
    expect((await repo.get(id))?.title).toBe("고친 제목");

    await repo.remove(id);
    expect(await repo.get(id)).toBeNull();
  });

  it("같은 ID 생성과 없는 항목 수정을 거부한다", async () => {
    const repo = repository(memoryStorage());

    await expect(
      repo.create("a", { order: 9, published: false, title: "", body: "", shotAt: new Date() }),
    ).rejects.toThrow("이미 있습니다");
    await expect(repo.setPublished("없는-id", true)).rejects.toThrow("찾지 못했습니다");
  });

  it("없는 항목 삭제를 live 와 같이 실패로 처리한다", async () => {
    const repo = repository(memoryStorage());

    await expect(repo.remove("없는-id")).rejects.toThrow("찾지 못했습니다");
  });

  it("순서와 공개 상태만 바꾼다", async () => {
    const repo = repository(memoryStorage());

    await repo.updateOrder([{ id: "a", order: 5 }]);
    await repo.setPublished("a", false);

    const changed = await repo.get("a");
    expect(changed?.order).toBe(5);
    expect(changed?.published).toBe(false);
    expect(changed?.title).toBe("첫 항목");
  });

  it("일괄 정렬은 한 번의 저장으로 전 항목을 반영한다", async () => {
    // live 의 정렬 RPC 와 같은 계약 — 드래그 1회의 변경 목록이 통째로 들어온다.
    const repo = repository(memoryStorage());

    await repo.updateOrder([
      { id: "a", order: 1 },
      { id: "b", order: 0 },
    ]);

    expect((await repo.get("a"))?.order).toBe(1);
    expect((await repo.get("b"))?.order).toBe(0);
  });

  it("없는 항목이 섞인 일괄 정렬은 저장하지 않는다", async () => {
    // live RPC 의 행 수 검증과 같은 의미 — 부분 반영을 성공으로 위장하지 않는다.
    const repo = repository(memoryStorage());

    await expect(
      repo.updateOrder([
        { id: "a", order: 1 },
        { id: "없는-id", order: 2 },
      ]),
    ).rejects.toThrow("찾지 못했습니다");
    expect((await repo.get("a"))?.order).toBe(0);
  });

  it("병렬 쓰기가 서로의 변경을 덮어쓰지 않는다", async () => {
    // 배열 전체를 다시 쓰는 저장소에서 직렬화 큐가 없으면 마지막 쓰기가 앞의 쓰기를 지운다.
    const repo = repository(memoryStorage());

    await Promise.all([repo.updateOrder([{ id: "a", order: 1 }]), repo.setPublished("b", false)]);

    expect((await repo.get("a"))?.order).toBe(1);
    expect((await repo.get("b"))?.published).toBe(false);
  });

  it("불변조건이 깨진 저장소는 통째로 버리고 다시 seed 한다", async () => {
    const storage = memoryStorage({
      [KEY]: JSON.stringify({
        version: 1,
        value: [{ ...item(), shotAt: item().shotAt.toISOString(), order: "숫자 아님" }],
      }),
    });
    const repo = repository(storage, [item({ id: "seeded" })]);

    expect((await repo.list()).map((row) => row.id)).toEqual(["seeded"]);
  });

  it("버전이 다르면 다시 seed 한다", async () => {
    const storage = memoryStorage({
      [KEY]: JSON.stringify({ version: 0, value: [] }),
    });
    const repo = repository(storage, [item({ id: "seeded" })]);

    expect(await repo.get("seeded")).not.toBeNull();
  });

  it("저장이 막히면 실패를 드러낸다", async () => {
    const storage = memoryStorage();
    const repo = repository(storage);
    await repo.list(); // seed

    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    await expect(repo.updateOrder([{ id: "a", order: 3 }])).rejects.toThrow("저장 공간이 부족");
  });
});
