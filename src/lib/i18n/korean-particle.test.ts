import { describe, expect, it } from "vitest";

import { objectParticle } from "@/lib/i18n/korean-particle";

describe("objectParticle", () => {
  it("받침이 있으면 을 이다", () => {
    expect(objectParticle("사진")).toBe("을");
    expect(objectParticle("앨범")).toBe("을");
    expect(objectParticle("수상")).toBe("을");
    expect(objectParticle("글")).toBe("을");
  });

  it("받침이 없으면 를 이다", () => {
    expect(objectParticle("연주")).toBe("를");
    expect(objectParticle("프로젝트")).toBe("를");
  });

  it("한글이 아니면 를 로 둔다", () => {
    expect(objectParticle("photo")).toBe("를");
    expect(objectParticle("")).toBe("를");
  });
});
