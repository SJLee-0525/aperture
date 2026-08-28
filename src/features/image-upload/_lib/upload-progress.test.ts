import { describe, expect, it } from "vitest";

import { UPLOAD_STAGE_LABEL } from "@/features/image-upload/_lib/upload-progress";

describe("UPLOAD_STAGE_LABEL", () => {
  it("idle 은 빈 문구라 화면에 아무것도 남기지 않는다", () => {
    expect(UPLOAD_STAGE_LABEL.idle).toBe("");
  });

  it("진행 단계마다 다른 문구를 준다", () => {
    const labels = [
      UPLOAD_STAGE_LABEL.reading,
      UPLOAD_STAGE_LABEL.compressing,
      UPLOAD_STAGE_LABEL.uploading,
    ];

    expect(new Set(labels).size).toBe(3);
    expect(labels.every((label) => label.length > 0)).toBe(true);
  });
});
