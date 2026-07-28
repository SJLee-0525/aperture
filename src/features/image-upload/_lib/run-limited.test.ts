import { describe, expect, it } from "vitest";

import { runLimited } from "@/features/image-upload/_lib/run-limited";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("runLimited", () => {
  it("작업 완료 순서와 관계없이 입력 순서대로 결과를 반환한다", async () => {
    const gates = [deferred(), deferred(), deferred()];
    const running = runLimited([0, 1, 2], 3, async (index) => {
      await gates[index].promise;
      return `result-${index}`;
    });

    gates[2].resolve();
    gates[0].resolve();
    gates[1].resolve();

    await expect(running).resolves.toEqual([
      { status: "fulfilled", value: "result-0" },
      { status: "fulfilled", value: "result-1" },
      { status: "fulfilled", value: "result-2" },
    ]);
  });

  it("실행 중인 작업 수를 지정한 동시성 이하로 제한한다", async () => {
    let active = 0;
    let maximum = 0;

    await runLimited([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active -= 1;
      return value;
    });

    expect(maximum).toBe(2);
  });

  it("일부 실패를 보존하면서 나머지 작업을 계속한다", async () => {
    const failure = new Error("upload failed");

    const results = await runLimited([1, 2, 3], 2, async (value) => {
      if (value === 2) throw failure;
      return value * 10;
    });

    expect(results).toEqual([
      { status: "fulfilled", value: 10 },
      { status: "rejected", reason: failure },
      { status: "fulfilled", value: 30 },
    ]);
  });

  it.each([0, -2])("동시성 %i는 최소 한 작업으로 보정한다", async (concurrency) => {
    await expect(runLimited([1, 2], concurrency, async (value) => value)).resolves.toEqual([
      { status: "fulfilled", value: 1 },
      { status: "fulfilled", value: 2 },
    ]);
  });

  it("입력이 비어 있으면 작업을 호출하지 않고 빈 결과를 반환한다", async () => {
    let calls = 0;

    const result = await runLimited([], 3, async () => {
      calls += 1;
    });

    expect(result).toEqual([]);
    expect(calls).toBe(0);
  });
});
