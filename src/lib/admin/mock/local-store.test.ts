import { describe, expect, it, vi } from "vitest";

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

  it("읽기 자체가 막히면 드러낸다 — 정상으로 보이는 빈 저장소를 만들지 않는다", () => {
    // null 로 바꾸면 "처음 여는 저장소" 와 구분되지 않는다. 그 상태에서 이어 간 편집은
    // 저장도 되지 않으므로, 관리자가 알아채야 하는 실패다.
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };

    expect(() => readLocalStore(throwing, KEY, VERSION, decodeStrings)).toThrow(
      "브라우저 저장소를 읽지 못했습니다",
    );
    expect(writeLocalStore(throwing, KEY, VERSION, [])).toBe(false);
  });

  it("저장본을 버릴 때 사유를 알린다", () => {
    const reasons: string[] = [];
    const collect = (reason: string) => reasons.push(reason);

    readLocalStore(memoryStorage({ [KEY]: "{broken" }), KEY, VERSION, decodeStrings, collect);

    const outdated = memoryStorage();
    writeLocalStore(outdated, KEY, VERSION, ["a"]);
    readLocalStore(outdated, KEY, VERSION + 1, decodeStrings, collect);

    const wrongShape = memoryStorage();
    writeLocalStore(wrongShape, KEY, VERSION, [1, 2]);
    readLocalStore(wrongShape, KEY, VERSION, decodeStrings, collect);

    expect(reasons).toEqual(["parse-failed", "version-mismatch", "decode-failed"]);
  });

  it("저장본이 없을 때는 버린 것이 아니므로 알리지 않는다", () => {
    const onDiscard = vi.fn();

    readLocalStore(memoryStorage(), KEY, VERSION, decodeStrings, onDiscard);

    expect(onDiscard).not.toHaveBeenCalled();
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
