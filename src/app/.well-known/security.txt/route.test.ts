import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("security.txt", () => {
  it("RFC 9116의 필수 연락·만료·canonical 필드를 일반 텍스트로 제공한다", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(body).toMatch(/^Contact: https?:\/\//m);
    expect(body).toContain("Preferred-Languages: ko, en");
    expect(body).toContain("Expires: 2027-02-10T00:00:00.000Z");
    expect(body).toMatch(/^Canonical: https?:\/\//m);
  });
});
