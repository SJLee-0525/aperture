import { CONTACT_DRAFT_LIMITS } from "@/lib/contact/draft-storage";

import type { ContactDraft } from "@/types/chat";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 배열이 아닌 객체인지 확인한다.
 *
 * @param {unknown} value 확인할 값.
 * @returns {value is Record<string, unknown>} 일반 객체이면 true.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 모델이 반환한 contactDraft를 검증한다. 필드 하나라도 형식에 맞지 않으면 null을 반환한다.
 * 이름·메일이 null이어도 message가 있으면 초안으로 인정한다(나머지는 방문자가 채운다).
 *
 * @param {unknown} value provider가 반환한 contactDraft 후보.
 * @returns {ContactDraft | null} 검증된 초안. 형식이 맞지 않으면 null.
 */
const parseContactDraft = (value: unknown): ContactDraft | null => {
  if (!isRecord(value)) return null;

  if (typeof value.message !== "string") return null;
  const message = value.message.trim();
  if (!message || message.length > CONTACT_DRAFT_LIMITS.message) return null;

  if (value.name !== null && typeof value.name !== "string") return null;
  const name = typeof value.name === "string" ? value.name.trim() : null;
  if (name && name.length > CONTACT_DRAFT_LIMITS.name) return null;

  if (value.email !== null && typeof value.email !== "string") return null;
  const email = typeof value.email === "string" ? value.email.trim() : null;
  if (email && (email.length > CONTACT_DRAFT_LIMITS.email || !EMAIL_PATTERN.test(email))) {
    return null;
  }

  return { name: name || null, email: email || null, message };
};

export { CONTACT_DRAFT_LIMITS, parseContactDraft };
