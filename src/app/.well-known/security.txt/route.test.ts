import { describe, expect, it } from "vitest";

import { expiresAt, GET } from "./route";

describe("security.txt", () => {
  it("RFC 9116의 필수 연락·만료·canonical 필드를 일반 텍스트로 제공한다", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body).toMatch(/^Contact: https?:\/\//m);
    expect(body).toContain("Preferred-Languages: ko, en");
    expect(body).toMatch(/^Canonical: https?:\/\//m);
  });

  it("만료일을 배포 시각에서 계산한다 — 날짜를 다시 박아 넣는 것을 막는다", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");

    // 고정 날짜로 되돌아가면 기준 시각을 바꿔도 값이 그대로라 이 단언이 깨진다.
    expect(expiresAt(from)).toBe("2026-06-30T00:00:00.000Z");
    expect(expiresAt(new Date("2027-01-01T00:00:00.000Z"))).toBe("2027-06-30T00:00:00.000Z");
  });

  it("응답의 Expires 는 미래 시각이다", async () => {
    const body = await GET().text();

    const expires = /^Expires: (.+)$/m.exec(body)?.[1] ?? "";
    expect(Number.isNaN(Date.parse(expires))).toBe(false);
    // 재배포가 곧 갱신이라, 180일 넘게 배포하지 않는 위험은 이 테스트가 잡지 않는다.
    expect(Date.parse(expires)).toBeGreaterThan(Date.now());
  });
});
