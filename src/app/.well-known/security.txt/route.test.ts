import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("security.txt", () => {
  it("RFC 9116의 필수 연락·만료·canonical 필드를 일반 텍스트로 제공한다", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body).toMatch(/^Contact: https?:\/\//m);
    expect(body).toContain("Preferred-Languages: ko, en");
    expect(body).toMatch(/^Canonical: https?:\/\//m);
  });

  it("Expires 가 충분히 미래여야 만료 직전 배포가 게이트에 걸린다", async () => {
    const body = await GET().text();

    const expires = /^Expires: (.+)$/m.exec(body)?.[1] ?? "";
    const remainingDays = (Date.parse(expires) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(Number.isNaN(Date.parse(expires))).toBe(false);
    // 90일 아래로 내려가면 이 테스트가 재배포를 요구한다.
    expect(remainingDays).toBeGreaterThan(90);
  });
});
