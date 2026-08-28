import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteMockImageFolder,
  deleteMockImages,
  uploadMockImage,
} from "@/lib/admin/mock/mock-image-store";

/** node 환경에는 objectURL API 가 없어 발급·회수를 스텁으로 관찰한다. */
const created: string[] = [];
const revoked: string[] = [];
let sequence = 0;

beforeEach(() => {
  created.length = 0;
  revoked.length = 0;
  vi.stubGlobal("URL", {
    createObjectURL: () => {
      const url = `blob:mock/${(sequence += 1)}`;
      created.push(url);
      return url;
    },
    revokeObjectURL: (url: string) => {
      revoked.push(url);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const blob = new Blob(["webp"]);

describe("uploadMockImage", () => {
  it("live 와 같은 규칙의 경로와 objectURL 을 돌려준다", () => {
    const stored = uploadMockImage("photos/p1", blob);

    expect(stored.path).toMatch(/^photos\/p1\/[0-9a-f-]+\.webp$/);
    expect(stored.url).toBe(created[0]);
  });
});

describe("deleteMockImages", () => {
  it("아는 경로만 revoke 하고 모르는 경로는 조용히 넘긴다", () => {
    const stored = uploadMockImage("music/w1", blob);

    deleteMockImages([stored.path, "music/w1/design-sample.webp"]);
    expect(revoked).toEqual([stored.url]);

    // 이미 지운 경로를 다시 지워도 revoke 가 중복되지 않는다.
    deleteMockImages([stored.path]);
    expect(revoked).toEqual([stored.url]);
  });
});

describe("deleteMockImageFolder", () => {
  it("하위 폴더까지 폴더 아래 전부를 지운다", () => {
    const main = uploadMockImage("dev/d1", blob);
    const preview = uploadMockImage("dev/d1/previews", blob);
    const other = uploadMockImage("dev/d2", blob);

    deleteMockImageFolder("dev/d1");

    expect(revoked).toContain(main.url);
    expect(revoked).toContain(preview.url);
    expect(revoked).not.toContain(other.url);
  });
});
