import { describe, expect, it, vi } from "vitest";

import { SESSION_STORAGE_KEYS } from "@/constants/storage-keys";
import {
  CONTACT_DRAFT_TTL_MS,
  takeContactDraft,
  writeContactDraft,
} from "@/lib/contact-draft-storage";

const KEY = SESSION_STORAGE_KEYS.CONTACT_DRAFT;
const NOW = 1_700_000_000_000;

const memoryStorage = () => {
  const store = new Map<string, string>();
  return {
    setItem: (key: string, value: string) => void store.set(key, value),
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => void store.delete(key),
    store,
  };
};

describe("writeContactDraft", () => {
  it("검증을 통과한 초안을 version·만료와 함께 저장한다", () => {
    const storage = memoryStorage();

    expect(
      writeContactDraft(storage, { name: "이성준", email: "sj@example.com", message: "문의" }, NOW),
    ).toBe(true);
    expect(JSON.parse(storage.store.get(KEY)!)).toEqual({
      version: 1,
      createdAt: NOW,
      expiresAt: NOW + CONTACT_DRAFT_TTL_MS,
      name: "이성준",
      email: "sj@example.com",
      message: "문의",
    });
  });

  it("클라이언트 경계에서도 재검증한다 — 불량 값은 저장하지 않는다", () => {
    const storage = memoryStorage();

    expect(writeContactDraft(storage, { name: null, email: null, message: "  " }, NOW)).toBe(false);
    expect(writeContactDraft(storage, { name: null, email: "broken", message: "문의" }, NOW)).toBe(
      false,
    );
    expect(storage.store.size).toBe(0);
  });

  it("storage 예외는 false로 삼킨다 — 이동은 계속돼야 한다", () => {
    const storage = {
      setItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      removeItem: () => undefined,
    };

    expect(writeContactDraft(storage, { name: null, email: null, message: "문의" }, NOW)).toBe(
      false,
    );
  });
});

describe("takeContactDraft", () => {
  const storedOf = (overrides?: Record<string, unknown>) =>
    JSON.stringify({
      version: 1,
      createdAt: NOW - 1_000,
      expiresAt: NOW + 60_000,
      name: "이성준",
      email: "sj@example.com",
      message: "문의",
      ...overrides,
    });

  it("정상 값을 한 번만 읽고 즉시 삭제한다 (one-shot)", () => {
    const storage = memoryStorage();
    storage.store.set(KEY, storedOf());

    expect(takeContactDraft(storage, NOW)).toEqual({
      name: "이성준",
      email: "sj@example.com",
      message: "문의",
    });
    expect(storage.store.has(KEY)).toBe(false);
    expect(takeContactDraft(storage, NOW)).toBeNull();
  });

  it.each([
    ["만료된 값", storedOf({ expiresAt: NOW - 1 })],
    ["미래 createdAt", storedOf({ createdAt: NOW + 60_000 })],
    ["TTL 초과 수명", storedOf({ expiresAt: NOW + CONTACT_DRAFT_TTL_MS * 2 })],
    ["정수 아닌 시간", storedOf({ createdAt: "yesterday" })],
    ["알 수 없는 version", storedOf({ version: 2 })],
    ["깨진 JSON", "{broken"],
    ["필드 타입 오류", storedOf({ message: 42 })],
    ["불량 email", storedOf({ email: "broken" })],
  ])("%s은 폼에 넣지 않되 storage에서는 삭제한다", (_, raw) => {
    const storage = memoryStorage();
    storage.store.set(KEY, raw);

    expect(takeContactDraft(storage, NOW)).toBeNull();
    expect(storage.store.has(KEY)).toBe(false);
  });

  it("getItem이 예외를 던지면 null — 일반 연락 폼으로 동작한다", () => {
    const storage = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      removeItem: vi.fn(),
    };

    expect(takeContactDraft(storage, NOW)).toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("removeItem이 실패하면 one-shot을 우선해 초안을 사용하지 않는다 — 값이 남아 반복 미사용", () => {
    const storage = memoryStorage();
    storage.store.set(KEY, storedOf());
    const failing = {
      getItem: storage.getItem,
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };

    expect(takeContactDraft(failing, NOW)).toBeNull();
    // 값이 남았고, 다음 진입에서도 같은 이유로 초안은 쓰이지 않는다.
    expect(storage.store.has(KEY)).toBe(true);
    expect(takeContactDraft(failing, NOW)).toBeNull();
  });
});
