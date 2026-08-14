import { describe, expect, it } from "vitest";

import { emptyArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-form";
import {
  ARTICLE_RECOVERY_TTL_MS,
  clearArticleRecovery,
  readArticleRecovery,
  writeArticleRecovery,
} from "@/features/admin-dev-articles/_lib/dev-article-recovery";

import { adminDevArticleDraftKey } from "@/constants/storage-keys";

const NOW = Date.parse("2026-08-12T09:00:00.000Z");
const ARTICLE_ID = "a1";

/** 키까지 확인할 수 있는 최소 Storage 스텁. */
const createStorage = (initial: Record<string, string> = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    keys: () => [...map.keys()],
  };
};

const input = () => ({
  ...emptyArticleInput(),
  body: "쓰다 만 본문",
  title: { ko: "제목", en: "Title" },
  publishedAt: new Date("2026-08-10T00:00:00.000Z"),
});

describe("writeArticleRecovery · readArticleRecovery", () => {
  it("폼 값을 그대로 되돌린다", () => {
    const storage = createStorage();
    expect(writeArticleRecovery(storage, ARTICLE_ID, input(), NOW)).toBe(true);

    const restored = readArticleRecovery(storage, ARTICLE_ID, NOW);
    expect(restored?.savedAt).toBe(NOW);
    expect(restored?.input.body).toBe("쓰다 만 본문");
    expect(restored?.input.title).toEqual({ ko: "제목", en: "Title" });
  });

  it("발행 시각을 Date 로 되돌린다", () => {
    const storage = createStorage();
    writeArticleRecovery(storage, ARTICLE_ID, input(), NOW);

    const restored = readArticleRecovery(storage, ARTICLE_ID, NOW);
    expect(restored?.input.publishedAt).toBeInstanceOf(Date);
    expect(restored?.input.publishedAt?.toISOString()).toBe("2026-08-10T00:00:00.000Z");
    expect(restored?.input.firstPublishedAt).toBeNull();
  });

  it("글마다 다른 키를 쓴다", () => {
    const storage = createStorage();
    writeArticleRecovery(storage, "a1", input(), NOW);
    writeArticleRecovery(storage, "a2", input(), NOW);

    expect(storage.keys()).toEqual([adminDevArticleDraftKey("a1"), adminDevArticleDraftKey("a2")]);
    expect(readArticleRecovery(storage, "a3", NOW)).toBeNull();
  });

  it("저장한 값이 없으면 null 이다", () => {
    expect(readArticleRecovery(createStorage(), ARTICLE_ID, NOW)).toBeNull();
  });

  it("수명을 넘긴 복구본은 쓰지 않는다", () => {
    const storage = createStorage();
    writeArticleRecovery(storage, ARTICLE_ID, input(), NOW);

    expect(readArticleRecovery(storage, ARTICLE_ID, NOW + ARTICLE_RECOVERY_TTL_MS + 1)).toBeNull();
    expect(
      readArticleRecovery(storage, ARTICLE_ID, NOW + ARTICLE_RECOVERY_TTL_MS - 1),
    ).not.toBeNull();
  });

  it("미래에 저장된 값은 쓰지 않는다", () => {
    const storage = createStorage();
    writeArticleRecovery(storage, ARTICLE_ID, input(), NOW + 10_000);

    expect(readArticleRecovery(storage, ARTICLE_ID, NOW)).toBeNull();
  });

  it("JSON 이 아니거나 버전이 다르거나 본문이 없으면 버린다", () => {
    const key = adminDevArticleDraftKey(ARTICLE_ID);

    expect(readArticleRecovery(createStorage({ [key]: "{" }), ARTICLE_ID, NOW)).toBeNull();
    expect(
      readArticleRecovery(
        createStorage({ [key]: JSON.stringify({ version: 99, savedAt: NOW, input: input() }) }),
        ARTICLE_ID,
        NOW,
      ),
    ).toBeNull();
    expect(
      readArticleRecovery(
        createStorage({ [key]: JSON.stringify({ version: 1, savedAt: NOW, input: {} }) }),
        ARTICLE_ID,
        NOW,
      ),
    ).toBeNull();
  });

  it("저장소가 막혀 있으면 실패를 알리고 읽기는 null 이다", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };

    expect(writeArticleRecovery(blocked, ARTICLE_ID, input(), NOW)).toBe(false);
    expect(readArticleRecovery(blocked, ARTICLE_ID, NOW)).toBeNull();
    expect(() => clearArticleRecovery(blocked, ARTICLE_ID)).not.toThrow();
  });
});

describe("clearArticleRecovery", () => {
  it("저장에 성공한 뒤 복구본을 지운다", () => {
    const storage = createStorage();
    writeArticleRecovery(storage, ARTICLE_ID, input(), NOW);
    clearArticleRecovery(storage, ARTICLE_ID);

    expect(readArticleRecovery(storage, ARTICLE_ID, NOW)).toBeNull();
  });
});
