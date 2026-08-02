import { describe, expect, it } from "vitest";

import { cosineSimilarity } from "@/lib/ai/rag-search";

describe("cosineSimilarity", () => {
  it("동일 벡터는 1, 직교 벡터와 차원이 다른 벡터는 0을 반환한다", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 0])).toBe(0);
  });
});
