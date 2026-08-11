import { SESSION_STORAGE_KEYS } from "@/constants/storage-keys";

import type { ContactDraft } from "@/types/chat";

/** 채팅 응답과 sessionStorage가 함께 사용하는 연락 초안 필드 길이 상한. */
const CONTACT_DRAFT_LIMITS = {
  name: 100,
  email: 254,
  message: 2_000,
} as const;

/** sessionStorage에 저장하는 탭 단위 일회성 연락 초안. */
type StoredContactDraftV1 = {
  version: 1;
  createdAt: number;
  expiresAt: number;
  name: string;
  email: string;
  message: string;
};

/** 연락 페이지로 이동하는 동안 초안을 보관하는 시간. */
const CONTACT_DRAFT_TTL_MS = 10 * 60 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 저장할 연락 필드의 형식과 길이를 검사한다.
 *
 * @param {string} name 이름. 빈 문자열을 허용한다.
 * @param {string} email 이메일. 빈 문자열을 허용한다.
 * @param {string} message 문의 내용.
 * @returns {boolean} 모든 필드가 저장 계약을 만족하면 true.
 */
const isValidFields = (name: string, email: string, message: string): boolean =>
  Boolean(message.trim()) &&
  message.length <= CONTACT_DRAFT_LIMITS.message &&
  name.length <= CONTACT_DRAFT_LIMITS.name &&
  (email === "" || (email.length <= CONTACT_DRAFT_LIMITS.email && EMAIL_PATTERN.test(email)));

/**
 * 연락 초안을 검증해 sessionStorage에 저장한다.
 * storage 예외(SecurityError 등)는 실패(false)로 삼키고, 호출부는 실패해도
 * 일반 /contact 링크로 이동을 계속한다.
 *
 * @param {Pick<Storage, "setItem">} storage
 * @param {ContactDraft} draft
 * @param {number} [now]
 * @returns {boolean} 저장 성공 여부.
 */
const writeContactDraft = (
  storage: Pick<Storage, "setItem">,
  draft: ContactDraft,
  now = Date.now(),
): boolean => {
  const name = draft.name ?? "";
  const email = draft.email ?? "";
  if (!isValidFields(name, email, draft.message)) return false;

  const stored: StoredContactDraftV1 = {
    version: 1,
    createdAt: now,
    expiresAt: now + CONTACT_DRAFT_TTL_MS,
    name,
    email,
    message: draft.message,
  };
  try {
    storage.setItem(SESSION_STORAGE_KEYS.CONTACT_DRAFT, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

/**
 * 배열이 아닌 객체인지 확인한다.
 *
 * @param {unknown} value 확인할 값.
 * @returns {value is Record<string, unknown>} 일반 객체이면 true.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 저장된 JSON을 읽어 아직 유효한 연락 필드만 반환한다.
 *
 * @param {string} raw sessionStorage에서 읽은 JSON 문자열.
 * @param {number} now 만료 여부를 판단할 현재 시각(ms).
 * @returns {Pick<StoredContactDraftV1, "name" | "email" | "message"> | null} 유효한 초안 필드. 검증에 실패하면 null.
 */
const parseStored = (
  raw: string,
  now: number,
): Pick<StoredContactDraftV1, "name" | "email" | "message"> | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== 1) return null;
  const { createdAt, expiresAt, name, email, message } = parsed;
  if (!Number.isInteger(createdAt) || !Number.isInteger(expiresAt)) return null;
  // 시계 조작·손상 값 방어: 만료 전이어야 하고, 생성이 미래이거나 수명이 TTL을 넘으면 거부.
  if (
    (expiresAt as number) <= now ||
    (createdAt as number) > now ||
    (expiresAt as number) - (createdAt as number) > CONTACT_DRAFT_TTL_MS
  ) {
    return null;
  }
  if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    return null;
  }
  if (!isValidFields(name, email, message)) return null;
  return { name, email, message };
};

/**
 * 연락 초안을 한 번만 읽는다. 값을 읽은 직후 삭제하며, 삭제하지 못하면 사용하지 않는다.
 *
 * @param {Pick<Storage, "getItem" | "removeItem">} storage
 * @param {number} [now]
 * @returns {{ name: string; email: string; message: string } | null}
 */
const takeContactDraft = (
  storage: Pick<Storage, "getItem" | "removeItem">,
  now = Date.now(),
): Pick<StoredContactDraftV1, "name" | "email" | "message"> | null => {
  let raw: string | null;
  try {
    raw = storage.getItem(SESSION_STORAGE_KEYS.CONTACT_DRAFT);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    storage.removeItem(SESSION_STORAGE_KEYS.CONTACT_DRAFT);
  } catch {
    return null;
  }
  return parseStored(raw, now);
};

export { CONTACT_DRAFT_LIMITS, CONTACT_DRAFT_TTL_MS, takeContactDraft, writeContactDraft };
