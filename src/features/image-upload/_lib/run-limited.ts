/**
 * 입력 순서를 유지하면서 독립 작업을 제한 병렬 실행한다.
 * 각 작업의 실패를 보존해 호출자가 부분 성공 정책을 결정할 수 있다.
 */
const runLimited = async <Input, Output>(
  inputs: Input[],
  concurrency: number,
  task: (input: Input) => Promise<Output>,
): Promise<PromiseSettledResult<Output>[]> => {
  const results: PromiseSettledResult<Output>[] = new Array(inputs.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < inputs.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await task(inputs[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), inputs.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
};

export { runLimited };
