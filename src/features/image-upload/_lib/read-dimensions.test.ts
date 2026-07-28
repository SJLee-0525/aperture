import { afterEach, describe, expect, it, vi } from "vitest";

import { readDimensions } from "@/features/image-upload/_lib/read-dimensions";

describe("readDimensions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("이미지 bitmap의 픽셀 크기를 반환하고 자원을 닫는다", async () => {
    const close = vi.fn();
    const createImageBitmap = vi.fn().mockResolvedValue({ width: 2048, height: 1365, close });
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const source = new Blob(["image"]);

    await expect(readDimensions(source)).resolves.toEqual({ w: 2048, h: 1365 });
    expect(createImageBitmap).toHaveBeenCalledWith(source);
    expect(close).toHaveBeenCalledOnce();
  });

  it("bitmap 생성 실패를 호출자에게 전달한다", async () => {
    const failure = new Error("invalid image");
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(failure));

    await expect(readDimensions(new Blob())).rejects.toBe(failure);
  });
});
