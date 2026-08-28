import { describe, expect, it } from "vitest";

import { sectionFromPath } from "@/lib/navigation/section-from-path";

describe("sectionFromPath", () => {
  it("로케일 프리픽스(/ko·/en)를 벗기고 섹션을 판별한다", () => {
    expect(sectionFromPath("/ko/photo")).toBe("photo");
    expect(sectionFromPath("/en/music/career")).toBe("music");
    expect(sectionFromPath("/ko/dev")).toBe("dev");
    expect(sectionFromPath("/ko/dev/projects")).toBe("dev");
    expect(sectionFromPath("/ko/dev/career")).toBe("dev");
    // 블로그 상세는 slug 한 단계가 더 붙어도 개발 섹션 액센트를 유지해야 한다.
    expect(sectionFromPath("/ko/dev/articles")).toBe("dev");
    expect(sectionFromPath("/en/dev/articles/my-first-post")).toBe("dev");
    expect(sectionFromPath("/en/contact")).toBe("contact");
    expect(sectionFromPath("/ko/privacy")).toBe("legal");
    expect(sectionFromPath("/en/terms")).toBe("legal");
    expect(sectionFromPath("/ko/accessibility")).toBe("legal");
    expect(sectionFromPath("/ko")).toBe("home");
  });

  it("무-로케일 경로도 동작한다 (관리자 등 로케일 밖 경로)", () => {
    expect(sectionFromPath("/photo/albums")).toBe("photo");
    expect(sectionFromPath("/")).toBe("home");
    expect(sectionFromPath("/admin/photos")).toBe("home");
  });
});
