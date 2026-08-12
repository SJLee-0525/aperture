import { describe, expect, it } from "vitest";

import { createLocalDocRepository } from "@/lib/admin/mock/local-doc-repository";

type Doc = { bio: string; tagline: string; links: string[] };

const KEY = "ap-admin-test-doc:v1";

const SEED: Doc = { bio: "소개", tagline: "태그라인", links: ["https://a"] };

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

  it("저장본에 없는 필드는 seed 기본값으로 채운다", async () => {
    // 문서 타입에 필드가 새로 생기면 이전 저장본에는 그 필드가 없다 — live 읽기의
    // `?? EMPTY_*` 기본값 보강처럼 seed 가 빈 자리를 메워야 화면이 깨지지 않는다.
    const partial = memoryStorage({
      [KEY]: JSON.stringify({ version: 1, value: { bio: "저장된 소개" } }),
    });

    const doc = await repository(partial).get();
    expect(doc.bio).toBe("저장된 소개");
    expect(doc.tagline).toBe(SEED.tagline);
    expect(doc.links).toEqual(SEED.links);
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
