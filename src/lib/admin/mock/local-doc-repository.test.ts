import { describe, expect, it } from "vitest";

import { createLocalDocRepository } from "@/lib/admin/mock/local-doc-repository";

type Doc = { bio: string; tagline: string; links: string[] };

const KEY = "ap-admin-test-doc:v1";

const SEED: Doc = { bio: "소개", tagline: "태그라인", links: ["https://a"] };

/** live 의 `EMPTY_*` config 에 해당하는 값 — 저장본에 없는 필드는 여기서 채운다. */
const EMPTY: Doc = { bio: "", tagline: "", links: [] };

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  } as Storage;
};

const repository = (storage: Storage) =>
  createLocalDocRepository<Doc>({
    key: KEY,
    version: 1,
    label: "테스트 설정",
    seed: async () => SEED,
    emptyDoc: EMPTY,
    getStorage: () => storage,
  });

describe("createLocalDocRepository", () => {
  it("빈 저장소를 seed 로 채운다", async () => {
    expect(await repository(memoryStorage()).get()).toEqual(SEED);
  });

  it("전체 저장이 왕복한다", async () => {
    const repo = repository(memoryStorage());
    const next: Doc = { bio: "새 소개", tagline: "새 태그라인", links: [] };

    await repo.set(next);
    expect(await repo.get()).toEqual(next);
  });

  it("병합은 준 필드만 바꾸고 나머지를 지킨다", async () => {
    const repo = repository(memoryStorage());

    await repo.merge({ bio: "화면 A 의 저장" });
    await repo.merge({ tagline: "화면 B 의 저장" });

    const doc = await repo.get();
    expect(doc.bio).toBe("화면 A 의 저장");
    expect(doc.tagline).toBe("화면 B 의 저장");
    expect(doc.links).toEqual(["https://a"]);
  });

  it("저장본에 없는 필드는 빈 기본값으로 채운다 — mock 문구를 끼워 넣지 않는다", async () => {
    // 문서 타입에 필드가 새로 생기면 이전 저장본에는 그 필드가 없다. live 읽기는 그 자리를
    // `?? EMPTY_*` 로 채운다. seed 로 채우면 관리자 화면이 mock 문구를 자기 값처럼 보여 주고,
    // 그 상태로 저장하면 그대로 영속된다.
    const partial = memoryStorage({
      [KEY]: JSON.stringify({ version: 1, value: { bio: "저장된 소개" } }),
    });

    const doc = await repository(partial).get();
    expect(doc.bio).toBe("저장된 소개");
    expect(doc.tagline).toBe("");
    expect(doc.links).toEqual([]);
    expect(doc.tagline).not.toBe(SEED.tagline);
  });

  it("버전이 다르거나 형이 깨지면 다시 seed 한다", async () => {
    const versioned = memoryStorage({ [KEY]: JSON.stringify({ version: 0, value: SEED }) });
    expect(await repository(versioned).get()).toEqual(SEED);

    const broken = memoryStorage({ [KEY]: JSON.stringify({ version: 1, value: "문서 아님" }) });
    expect(await repository(broken).get()).toEqual(SEED);
  });

  it("저장이 막히면 실패를 드러낸다", async () => {
    const storage = memoryStorage();
    const repo = repository(storage);
    await repo.get(); // seed

    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    await expect(repo.merge({ bio: "저장 안 됨" })).rejects.toThrow("저장 공간이 부족");
  });
});
