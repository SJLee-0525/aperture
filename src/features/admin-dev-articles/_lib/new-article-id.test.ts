import { describe, expect, it, vi } from "vitest";

import {
  clearNewArticleId,
  resolveNewArticleId,
} from "@/features/admin-dev-articles/_lib/new-article-id";

import { SESSION_STORAGE_KEYS } from "@/constants/storage-keys";

const createStorage = (initial: Record<string, string> = {}): Storage => {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => map.delete(key),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};

/** getItem·setItem·removeItem 이 모두 막힌 저장소(시크릿 모드 등). */
const blockedStorage = (): Storage =>
  new Proxy(createStorage(), {
    get: () => () => {
      throw new Error("SecurityError");
    },
  });

describe("resolveNewArticleId", () => {
  it("처음에는 새 ID를 만들어 저장한다", () => {
    const storage = createStorage();
    const id = resolveNewArticleId(storage, () => "generated");

    expect(id).toBe("generated");
    expect(storage.getItem(SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID)).toBe("generated");
  });

  it("새로고침해도 같은 ID를 이어 쓴다", () => {
    const storage = createStorage();
    resolveNewArticleId(storage, () => "first");
    const createId = vi.fn(() => "second");

    expect(resolveNewArticleId(storage, createId)).toBe("first");
    expect(createId).not.toHaveBeenCalled();
  });

  it("저장소가 막혀 있어도 ID는 준다", () => {
    expect(resolveNewArticleId(blockedStorage(), () => "generated")).toBe("generated");
  });
});

describe("clearNewArticleId", () => {
  it("저장에 성공하면 보관하던 ID를 지운다", () => {
    const storage = createStorage();
    resolveNewArticleId(storage, () => "first");
    clearNewArticleId(storage);

    expect(storage.getItem(SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID)).toBeNull();
    expect(resolveNewArticleId(storage, () => "second")).toBe("second");
  });

  it("저장소가 막혀 있어도 실패로 끝내지 않는다", () => {
    expect(() => clearNewArticleId(blockedStorage())).not.toThrow();
  });
});
