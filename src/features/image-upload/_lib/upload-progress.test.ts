import { describe, expect, it } from "vitest";

import {
  checkUploadSize,
  UPLOAD_STAGE_LABEL,
} from "@/features/image-upload/_lib/upload-progress";

const fileOf = (size: number): File =>
  ({ size, name: "photo.jpg", type: "image/jpeg" }) as unknown as File;

describe("checkUploadSize", () => {
  it("상한 이하는 통과한다", () => {
    expect(checkUploadSize(fileOf(40 * 1024 * 1024))).toBeNull();
  });

  it("상한을 넘으면 실제 크기와 상한을 함께 알린다", () => {
    const message = checkUploadSize(fileOf(40 * 1024 * 1024 + 1024 * 1024));

    expect(message).toContain("41MB");
    expect(message).toContain("40MB");
  });
});

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
