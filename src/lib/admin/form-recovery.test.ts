import { describe, expect, it } from "vitest";

import { adminFormDraftKey } from "@/constants/storage-keys";
import {
  clearFormRecovery,
  FORM_RECOVERY_TTL_MS,
  FORM_RECOVERY_VERSION,
  readFormRecovery,
  writeFormRecovery,
} from "@/lib/admin/form-recovery";

const storageOf = (entries: Record<string, string> = {}) => {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    raw: map,
  };
};

const KEY = adminFormDraftKey("photos", "p1");
const NOW = 1_700_000_000_000;
const stored = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ version: FORM_RECOVERY_VERSION, savedAt: NOW, input: { title: "가" }, ...over });

describe("writeFormRecovery", () => {
  it("컬렉션과 문서 ID 로 키를 만든다", () => {
    const storage = storageOf();

    expect(writeFormRecovery(storage, "photos", "p1", { title: "가" }, NOW)).toBe(true);
    expect(storage.raw.has(KEY)).toBe(true);
  });

  it("쓰기가 막힌 저장소에서도 예외를 올리지 않는다", () => {
    const blocked = {
      setItem: () => {
        throw new Error("quota");
      },
    };

    expect(writeFormRecovery(blocked, "photos", "p1", {}, NOW)).toBe(false);
  });
});

describe("readFormRecovery", () => {
  const read = (raw: string, now = NOW) =>
    readFormRecovery(storageOf({ [KEY]: raw }), "photos", "p1", (input) => input, now);

  it("떠 둔 값을 그대로 돌려준다", () => {
    expect(read(stored())).toEqual({ savedAt: NOW, input: { title: "가" } });
  });

  it("값이 없으면 null 이다", () => {
    expect(readFormRecovery(storageOf(), "photos", "p1", (input) => input, NOW)).toBeNull();
  });

  it("JSON 이 깨졌으면 null 이다", () => {
    expect(read("{")).toBeNull();
  });

  it("형식 버전이 다르면 복구하지 않는다", () => {
    expect(read(stored({ version: FORM_RECOVERY_VERSION + 1 }))).toBeNull();
  });

  it("수명을 넘긴 값은 쓰지 않는다", () => {
    expect(read(stored(), NOW + FORM_RECOVERY_TTL_MS + 1)).toBeNull();
  });

  it("미래에 저장된 값은 시계 조작으로 보고 버린다", () => {
    expect(read(stored({ savedAt: NOW + 1 }))).toBeNull();
  });

  it("revive 로 Date 를 되돌린다", () => {
    const at = new Date(NOW).toISOString();
    const result = readFormRecovery(
      storageOf({ [KEY]: stored({ input: { shotAt: at } }) }),
      "photos",
      "p1",
      (input) => ({ shotAt: new Date(input.shotAt as string) }),
      NOW,
    );

    expect(result?.input.shotAt).toBeInstanceOf(Date);
    expect(result?.input.shotAt.toISOString()).toBe(at);
  });

  it("읽기가 막힌 저장소에서도 예외를 올리지 않는다", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
    };

    expect(readFormRecovery(blocked, "photos", "p1", (input) => input, NOW)).toBeNull();
  });
});

describe("clearFormRecovery", () => {
  it("해당 문서의 복구본만 지운다", () => {
    const other = adminFormDraftKey("photos", "p2");
    const storage = storageOf({ [KEY]: stored(), [other]: stored() });

    clearFormRecovery(storage, "photos", "p1");

    expect([...storage.raw.keys()]).toEqual([other]);
  });

  it("지우기가 막힌 저장소에서도 예외를 올리지 않는다", () => {
    expect(() =>
      clearFormRecovery(
        {
          removeItem: () => {
            throw new Error("blocked");
          },
        },
        "photos",
        "p1",
      ),
    ).not.toThrow();
  });
});
