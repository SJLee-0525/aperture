import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectRepository } from "@/lib/admin/select-repository";
import { shouldUseMockContent } from "@/lib/content/content-source";

vi.mock("@/lib/content/content-source", () => ({ shouldUseMockContent: vi.fn() }));

const mockedShouldUseMock = vi.mocked(shouldUseMockContent);

describe("selectRepository", () => {
  beforeEach(() => {
    mockedShouldUseMock.mockReset();
  });

  it("호출 전에는 콘텐츠 소스를 판별하지 않는다", () => {
    selectRepository(
      () => "mock",
      () => "live",
    );
    expect(mockedShouldUseMock).not.toHaveBeenCalled();
  });

  it("mock 소스면 mock 구현을 고른다", () => {
    mockedShouldUseMock.mockReturnValue(true);
    const get = selectRepository(
      () => "mock",
      () => "live",
    );
    expect(get()).toBe("mock");
  });

  it("live 소스면 live 구현을 고른다", () => {
    mockedShouldUseMock.mockReturnValue(false);
    const get = selectRepository(
      () => "mock",
      () => "live",
    );
    expect(get()).toBe("live");
  });

  it("첫 결과를 재사용해 같은 객체를 돌려준다", () => {
    mockedShouldUseMock.mockReturnValue(true);
    const createMock = vi.fn(() => ({ marker: true }));
    const get = selectRepository(createMock, () => ({ marker: false }));

    expect(get()).toBe(get());
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(mockedShouldUseMock).toHaveBeenCalledTimes(1);
  });
});
