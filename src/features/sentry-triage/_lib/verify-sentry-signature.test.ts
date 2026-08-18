import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  declaredBodyTooLarge,
  MAX_WEBHOOK_BODY_BYTES,
  verifySentrySignature,
} from "@/features/sentry-triage/_lib/verify-sentry-signature";

/** 테스트 고정값. 실제 Client Secret 과 무관하다. */
const SECRET = "hook-value";
const BODY = JSON.stringify({ action: "triggered", data: { event: { issue_id: "1" } } });

const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body, "utf8").digest("hex");

const headersWith = (signature: string | null, extra: Record<string, string> = {}) => {
  const headers = new Headers(extra);
  if (signature !== null) headers.set("sentry-hook-signature", signature);
  return headers;
};

describe("verifySentrySignature", () => {
  it("본문으로 계산한 서명이 맞으면 통과한다", () => {
    expect(verifySentrySignature(BODY, headersWith(sign(BODY)), SECRET)).toEqual({ ok: true });
  });

  it("본문이 한 글자만 달라도 거절한다", () => {
    const tampered = `${BODY} `;

    expect(verifySentrySignature(tampered, headersWith(sign(BODY)), SECRET)).toEqual({
      ok: false,
      reason: "signature-mismatch",
    });
  });

  it("키 순서를 바꿔 재직렬화한 본문은 통과하지 못한다", () => {
    const reserialized = JSON.stringify(JSON.parse(BODY), ["data", "action"]);

    expect(verifySentrySignature(reserialized, headersWith(sign(BODY)), SECRET).ok).toBe(false);
  });

  it("다른 시크릿으로 만든 서명을 거절한다", () => {
    expect(verifySentrySignature(BODY, headersWith(sign(BODY, "other")), SECRET).ok).toBe(false);
  });

  it("서명 헤더가 없으면 사유를 구분해서 돌려준다", () => {
    expect(verifySentrySignature(BODY, headersWith(null), SECRET)).toEqual({
      ok: false,
      reason: "missing-signature",
    });
  });

  it("빈 서명 헤더도 누락으로 본다", () => {
    expect(verifySentrySignature(BODY, headersWith("   "), SECRET)).toEqual({
      ok: false,
      reason: "missing-signature",
    });
  });

  it("시크릿이 없으면 설정 오류로 구분한다", () => {
    expect(verifySentrySignature(BODY, headersWith(sign(BODY)), undefined)).toEqual({
      ok: false,
      reason: "missing-secret",
    });
  });

  it("공백만 있는 시크릿도 설정 오류로 본다", () => {
    expect(verifySentrySignature(BODY, headersWith(sign(BODY)), "  ").ok).toBe(false);
  });

  it("대문자 hex 서명도 받아들인다", () => {
    const upper = sign(BODY).toUpperCase();

    expect(verifySentrySignature(BODY, headersWith(upper), SECRET)).toEqual({ ok: true });
  });

  it("길이가 다른 서명에 예외를 던지지 않는다", () => {
    expect(verifySentrySignature(BODY, headersWith("abc"), SECRET)).toEqual({
      ok: false,
      reason: "signature-mismatch",
    });
  });

  it("길이는 같지만 hex 가 아닌 값에도 예외를 던지지 않는다", () => {
    const garbage = "z".repeat(64);

    expect(verifySentrySignature(BODY, headersWith(garbage), SECRET)).toEqual({
      ok: false,
      reason: "signature-mismatch",
    });
  });

  it("빈 본문도 서명이 맞으면 통과한다", () => {
    expect(verifySentrySignature("", headersWith(sign("")), SECRET)).toEqual({ ok: true });
  });
});

describe("declaredBodyTooLarge", () => {
  it("선언된 크기가 상한을 넘으면 참이다", () => {
    const headers = new Headers({ "content-length": String(MAX_WEBHOOK_BODY_BYTES + 1) });

    expect(declaredBodyTooLarge(headers)).toBe(true);
  });

  it("상한과 같으면 통과시킨다", () => {
    const headers = new Headers({ "content-length": String(MAX_WEBHOOK_BODY_BYTES) });

    expect(declaredBodyTooLarge(headers)).toBe(false);
  });

  it("Content-Length 가 없으면 판단하지 않는다", () => {
    expect(declaredBodyTooLarge(new Headers())).toBe(false);
  });

  it("숫자가 아닌 값도 판단하지 않는다", () => {
    const headers = new Headers({ "content-length": "lots" });

    expect(declaredBodyTooLarge(headers)).toBe(false);
  });

  it("상한을 인자로 낮출 수 있다", () => {
    const headers = new Headers({ "content-length": "100" });

    expect(declaredBodyTooLarge(headers, 50)).toBe(true);
  });
});
