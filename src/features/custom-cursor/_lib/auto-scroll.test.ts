import { describe, expect, it } from "vitest";

import { autoScrollDirection, autoScrollVelocity } from "./auto-scroll";

describe("custom cursor auto scroll", () => {
  it("앵커 주변 데드존에서는 멈춘다", () => {
    expect(autoScrollVelocity(18)).toBe(0);
    expect(autoScrollVelocity(-18)).toBe(0);
  });

  it("거리에 비례해 양방향 속도를 만든다", () => {
    expect(autoScrollVelocity(28)).toBe(80);
    expect(autoScrollVelocity(-28)).toBe(-80);
  });

  it("과도한 포인터 거리는 최대 속도로 제한한다", () => {
    expect(autoScrollVelocity(1000)).toBe(1800);
    expect(autoScrollVelocity(-1000)).toBe(-1800);
  });

  it("속도를 표시 방향으로 변환한다", () => {
    expect(autoScrollDirection(-1)).toBe("up");
    expect(autoScrollDirection(0)).toBe("idle");
    expect(autoScrollDirection(1)).toBe("down");
  });
});
