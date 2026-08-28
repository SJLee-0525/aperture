import { describe, expect, it } from "vitest";

import { fromStoredArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-recovery";

import { ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX } from "@/constants/storage-keys";
import {
  articleRecoverySlot,
  DEV_ARTICLE_RECOVERY_VERSION,
  readFormRecovery,
  writeFormRecovery,
} from "@/lib/admin/form-recovery";

const NOW = Date.parse("2026-03-14T00:00:00.000Z");
const SLOT = articleRecoverySlot("a1");

const createStorage = (entries: Record<string, string> = {}) => {
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

describe("articleRecoverySlot", () => {
  it("공용 폼과 다른 접두사와 버전을 쓴다", () => {
    // 기본 슬롯으로 바꾸면 관리자 브라우저에 남은 복구본이 전부 버려진다.
    expect(SLOT.key).toBe(`${ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX}a1`);
    expect(SLOT.version).toBe(DEV_ARTICLE_RECOVERY_VERSION);
    expect(DEV_ARTICLE_RECOVERY_VERSION).toBe(3);
  });

  it("이전 형식으로 저장된 값은 복구하지 않는다", () => {
    const storage = createStorage({
      [SLOT.key]: JSON.stringify({ version: 2, savedAt: NOW, input: { body: "옛 형식" } }),
    });

    expect(readFormRecovery(storage, SLOT, fromStoredArticleInput, NOW)).toBeNull();
  });
});

describe("fromStoredArticleInput", () => {
  it("발행 시각을 Date 로 되돌린다", () => {
    const storage = createStorage();
    writeFormRecovery(
      storage,
      SLOT,
      { body: "본문", publishedAt: new Date(NOW), firstPublishedAt: null },
      NOW,
    );

    const restored = readFormRecovery(storage, SLOT, fromStoredArticleInput, NOW);

    expect(restored?.input.publishedAt).toBeInstanceOf(Date);
    expect(restored?.input.publishedAt?.getTime()).toBe(NOW);
    expect(restored?.input.firstPublishedAt).toBeNull();
  });

  it("날짜가 아닌 값은 null 로 읽는다", () => {
    const restored = fromStoredArticleInput({
      body: "본문",
      publishedAt: "날짜아님",
      firstPublishedAt: undefined,
    });

    expect(restored.publishedAt).toBeNull();
    expect(restored.firstPublishedAt).toBeNull();
  });
});
