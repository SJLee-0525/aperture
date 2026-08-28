import { describe, expect, it } from "vitest";

import {
  adminDevArticleDraftKey,
  adminFormDraftKey,
  SESSION_STORAGE_KEYS,
  STORAGE_KEYS,
} from "@/constants/storage-keys";
import { clearAdminWorkspace } from "@/lib/admin/clear-admin-workspace";

const storageOf = (entries: Record<string, string>) => {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    keys: () => [...map.keys()],
  };
};

describe("clearAdminWorkspace", () => {
  it("글 복구본과 재검증 실패 기록, 새 글 세션 ID 를 지운다", () => {
    const local = storageOf({
      [adminDevArticleDraftKey("a1")]: "{}",
      [adminDevArticleDraftKey("a2")]: "{}",
      [STORAGE_KEYS.ADMIN_REVALIDATE_FAILURE]: "{}",
    });
    const session = storageOf({ [SESSION_STORAGE_KEYS.NEW_DEV_ARTICLE_ID]: "a3" });

    clearAdminWorkspace(local, session);

    expect(local.keys()).toEqual([]);
    expect(session.keys()).toEqual([]);
  });

  it("mock CMS 저장소는 같은 ap-admin- 접두사를 써도 남긴다", () => {
    const local = storageOf({
      [STORAGE_KEYS.ADMIN_PHOTOS]: "[]",
      [STORAGE_KEYS.ADMIN_ALBUMS]: "[]",
      [STORAGE_KEYS.ADMIN_DEV_ARTICLES]: "[]",
      [STORAGE_KEYS.ADMIN_SITE_CONFIG]: "{}",
      [adminDevArticleDraftKey("a1")]: "{}",
    });

    clearAdminWorkspace(local, storageOf({}));

    expect(local.keys()).toEqual([
      STORAGE_KEYS.ADMIN_PHOTOS,
      STORAGE_KEYS.ADMIN_ALBUMS,
      STORAGE_KEYS.ADMIN_DEV_ARTICLES,
      STORAGE_KEYS.ADMIN_SITE_CONFIG,
    ]);
  });

  it("방문자 설정은 건드리지 않는다", () => {
    const local = storageOf({
      [STORAGE_KEYS.THEME]: "dark",
      [STORAGE_KEYS.LANG]: "ko",
      [STORAGE_KEYS.CONSENT]: "{}",
    });

    clearAdminWorkspace(local, storageOf({}));

    expect(local.keys()).toEqual([STORAGE_KEYS.THEME, STORAGE_KEYS.LANG, STORAGE_KEYS.CONSENT]);
  });

  it("저장소 접근이 막혀도 예외를 던지지 않는다", () => {
    const blocked = {
      get length(): number {
        throw new Error("access denied");
      },
      key: () => null,
      removeItem: () => {
        throw new Error("access denied");
      },
    };

    expect(() => clearAdminWorkspace(blocked, blocked)).not.toThrow();
  });

  it("엔티티 폼과 설정 편집기의 복구본도 지운다", () => {
    const local = storageOf({
      [adminFormDraftKey("photos", "p1")]: "{}",
      [adminFormDraftKey("devConfig", "devConfig")]: "{}",
      [STORAGE_KEYS.ADMIN_PHOTOS]: "[]",
    });

    clearAdminWorkspace(local, storageOf({}));

    expect(local.keys()).toEqual([STORAGE_KEYS.ADMIN_PHOTOS]);
  });
});
