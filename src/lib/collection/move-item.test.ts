import { describe, expect, it } from "vitest";

import { moveItem } from "@/lib/collection/move-item";

describe("moveItem", () => {
  it("이웃과 맞바꾼다", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("첫 항목을 위로 올리면 원본을 그대로 돌려준다", () => {
    const list = ["a", "b"];

    expect(moveItem(list, 0, -1)).toBe(list);
  });

  it("마지막 항목을 아래로 내려도 원본이다", () => {
    const list = ["a", "b"];

    expect(moveItem(list, 1, 1)).toBe(list);
  });

  it("원본을 바꾸지 않는다", () => {
    const list = ["a", "b"];

    moveItem(list, 0, 1);

    expect(list).toEqual(["a", "b"]);
  });

  it("범위를 벗어나지 않으면 새 배열이다", () => {
    const list = ["a", "b"];

    expect(moveItem(list, 0, 1)).not.toBe(list);
  });
});
