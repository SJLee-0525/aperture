import { beforeEach, describe, expect, it, vi } from "vitest";

const imageCompression = vi.hoisted(() => vi.fn());

// 라이브러리는 파일 선택 시점에 동적 import 된다. 모듈 경계가 그대로라 여기서 가로챈다.
vi.mock("browser-image-compression", () => ({ default: imageCompression }));

import {
  compressPreviewToWebp,
  compressThumbnailToWebp,
  compressToWebp,
} from "@/features/image-upload/_lib/compress";

const optionsOf = (call: number) =>
  imageCompression.mock.calls[call]?.[1] as { maxWidthOrHeight: number; fileType: string };

beforeEach(() => {
  vi.clearAllMocks();
  imageCompression.mockImplementation(async (file: File) => file);
});

describe("compressToWebp", () => {
  it("세 파생본의 긴 변이 2048·960·320 이고 모두 webp 다", async () => {
    // 저장 해상도가 곧 내보내기 기준이고 Storage 무료 한도를 정한다.
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    await compressToWebp(file);
    await compressPreviewToWebp(file);
    await compressThumbnailToWebp(file);

    expect(optionsOf(0)).toMatchObject({ maxWidthOrHeight: 2048, fileType: "image/webp" });
    expect(optionsOf(1)).toMatchObject({ maxWidthOrHeight: 960, fileType: "image/webp" });
    expect(optionsOf(2)).toMatchObject({ maxWidthOrHeight: 320, fileType: "image/webp" });
  });

  it("File 은 그대로 넘긴다", async () => {
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    await compressToWebp(file);

    expect(imageCompression.mock.calls[0]?.[0]).toBe(file);
  });

  it("이름 없는 Blob 은 File 로 감싼다", async () => {
    // 라이브러리가 `file.name` 을 읽어 결과 File 을 다시 만든다. Blob 을 그대로 넘기면
    // 파생본을 다시 줄이는 경로에서 실패한다.
    const blob = new Blob(["x"], { type: "image/webp" });

    await compressToWebp(blob);

    const passed = imageCompression.mock.calls[0]?.[0] as File;
    expect(passed).toBeInstanceOf(File);
    expect(passed.type).toBe("image/webp");
  });

  it("type 이 없는 Blob 도 webp 로 감싼다", async () => {
    await compressToWebp(new Blob(["x"]));

    expect((imageCompression.mock.calls[0]?.[0] as File).type).toBe("image/webp");
  });
});
