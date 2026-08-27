import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
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

  describe("본문 크기", () => {
    it("상한을 넘는 본문은 서명을 보기 전에 거절한다", () => {
      const big = "a".repeat(MAX_WEBHOOK_BODY_BYTES + 1);

      expect(verifySentrySignature(big, headersWith(sign(big)), SECRET)).toEqual({
        ok: false,
        reason: "body-too-large",
      });
    });

    it("길이를 코드 유닛이 아니라 바이트로 잰다", () => {
      // 한글은 UTF-8 에서 3바이트다. 코드 유닛으로 세면 상한의 1/3 만 채운 것으로 보인다.
      const korean = "가".repeat(40);

      expect(verifySentrySignature(korean, headersWith(sign(korean)), SECRET, 100)).toEqual({
        ok: false,
        reason: "body-too-large",
      });
      expect(korean.length).toBeLessThan(100);
    });

    it("상한과 같은 크기는 통과시킨다", () => {
      const body = "a".repeat(100);

      expect(verifySentrySignature(body, headersWith(sign(body)), SECRET, 100)).toEqual({
        ok: true,
      });
    });

    it("크기 거절이 시크릿 미설정보다 먼저다", () => {
      const big = "a".repeat(MAX_WEBHOOK_BODY_BYTES + 1);

      expect(verifySentrySignature(big, headersWith(null), undefined)).toEqual({
        ok: false,
        reason: "body-too-large",
      });
    });
  });
});

