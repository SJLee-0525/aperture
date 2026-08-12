import { describe, expect, it } from "vitest";

import { isRecord, readLocalStore, writeLocalStore } from "@/lib/admin/mock/local-store";

const KEY = "test-store";
const VERSION = 3;

/** 메모리 storage — DOM 없이 봉투 왕복을 검증한다. */
const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    dump: () => Object.fromEntries(data),
  };
};

/** 문자열 배열만 통과시키는 decode. */
const decodeStrings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : null;

describe("readLocalStore / writeLocalStore", () => {
  it("쓴 값을 그대로 읽는다", () => {
    const storage = memoryStorage();
    expect(writeLocalStore(storage, KEY, VERSION, ["a", "b"])).toBe(true);
    expect(readLocalStore(storage, KEY, VERSION, decodeStrings)).toEqual(["a", "b"]);
  });

  it("값이 없으면 null 이다", () => {
    expect(readLocalStore(memoryStorage(), KEY, VERSION, decodeStrings)).toBeNull();
  });

  it("버전이 다르면 통째로 버린다", () => {
    const storage = memoryStorage();
    writeLocalStore(storage, KEY, VERSION, ["a"]);
    expect(readLocalStore(storage, KEY, VERSION + 1, decodeStrings)).toBeNull();
  });

  it("깨진 JSON 과 봉투가 아닌 값을 버린다", () => {
    const storage = memoryStorage({ [KEY]: "{broken" });
    expect(readLocalStore(storage, KEY, VERSION, decodeStrings)).toBeNull();

    const bare = memoryStorage({ [KEY]: JSON.stringify(["no-envelope"]) });
    expect(readLocalStore(bare, KEY, VERSION, decodeStrings)).toBeNull();
  });

  it("decode 가 거부하면 null 이다", () => {
    const storage = memoryStorage();
    writeLocalStore(storage, KEY, VERSION, [1, 2]);
    expect(readLocalStore(storage, KEY, VERSION, decodeStrings)).toBeNull();
  });

  it("storage 접근이 던져도 조용히 실패한다", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(readLocalStore(throwing, KEY, VERSION, decodeStrings)).toBeNull();
    expect(writeLocalStore(throwing, KEY, VERSION, [])).toBe(false);
  });
});

describe("isRecord", () => {
  it("일반 객체만 통과시킨다", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("text")).toBe(false);
  });
});
