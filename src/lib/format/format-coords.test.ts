import { describe, expect, it } from "vitest";

import { formatCoords } from "@/lib/format/format-coords";

describe("formatCoords", () => {
  it("북위와 동경 좌표를 네 자리 정밀도로 표시한다", () => {
    expect(formatCoords({ lat: 35.65858, lng: 139.745433 })).toBe("35.6586° N, 139.7454° E");
  });

  it("음수 좌표를 절댓값의 남위와 서경으로 표시한다", () => {
    expect(formatCoords({ lat: -33.86882, lng: -151.209296 })).toBe("33.8688° S, 151.2093° W");
  });

  it("0도는 북위와 동경으로 표시한다", () => {
    expect(formatCoords({ lat: 0, lng: 0 })).toBe("0.0000° N, 0.0000° E");
  });
});
