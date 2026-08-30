type PreviousSnapshotResult =
  | { status: "loaded"; snapshot: unknown }
  | { status: "cold_start" }
  | { status: "comparison_skipped"; reason: string };

type CollectionResult = { complete: boolean; value: unknown };
type ReportDecision = {
  cards: unknown[];
  snapshot: unknown;
  summary: string;
};

type ReportDependencies = {
  preflight: () => Promise<void>;
  loadPreviousSnapshot: () => Promise<PreviousSnapshotResult>;
  collectCrux: () => Promise<CollectionResult>;
  collectLighthouse: () => Promise<CollectionResult>;
  judge: (input: {
    previous: PreviousSnapshotResult;
    crux: unknown;
    lighthouse: unknown;
  }) => Promise<ReportDecision> | ReportDecision;
  sendCard: (card: unknown) => Promise<{ ok: true } | { ok: false; error: string }>;
  writeSnapshot: (snapshot: unknown) => Promise<void>;
  appendSummary: (summary: string) => Promise<void>;
};

/** 외부 오류가 Actions log와 summary에 query 또는 secret 형태를 남기지 않게 한다. */
const redactPerformanceError = (value: unknown): string => {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(/https?:\/\/[^\s?#]+[^\s]*/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return "[redacted-url]";
      }
    })
    .replace(/\b(?:AIza[\w-]{20,}|gh[opsu]_[\w]{20,})\b/g, "[redacted-secret]")
    .replace(/(api[_-]?key|token|webhook)(\s*[=:]\s*)[^\s]+/gi, "$1$2[redacted-secret]");
};

/**
 * 이전 snapshot 조회 실패는 비교만 생략하지만 현재 측정과 Discord 전송 실패는 실행을 실패시킨다.
 * 모든 수집이 완전한 경우에만 다음 실행이 사용할 snapshot을 기록한다.
 */
const runCoreWebVitalsReport = async (dependencies: ReportDependencies): Promise<void> => {
  await dependencies.preflight();

  let previous: PreviousSnapshotResult;
  try {
    previous = await dependencies.loadPreviousSnapshot();
  } catch (error) {
    previous = { status: "comparison_skipped", reason: redactPerformanceError(error) };
  }
  if (previous.status !== "loaded") {
    const detail = previous.status === "cold_start" ? "이전 snapshot 없음" : previous.reason;
    await dependencies.appendSummary(`비교 생략: ${detail}`);
  }

  let crux: CollectionResult;
  try {
    crux = await dependencies.collectCrux();
  } catch (error) {
    await dependencies.appendSummary(`CrUX 전체 실패: ${redactPerformanceError(error)}`);
    throw new Error("CrUX collection failed");
  }

  const lighthouse = await dependencies.collectLighthouse();
  if (!lighthouse.complete) {
    await dependencies.appendSummary(
      "Lighthouse 측정이 완전하지 않아 snapshot을 저장하지 않습니다.",
    );
    throw new Error("Lighthouse collection failed");
  }

  const decision = await dependencies.judge({
    previous,
    crux: crux.value,
    lighthouse: lighthouse.value,
  });
  await dependencies.appendSummary(decision.summary);

  for (const card of decision.cards) {
    const sent = await dependencies.sendCard(card);
    if (!sent.ok) {
      const reason = redactPerformanceError(sent.error);
      await dependencies.appendSummary(`Discord 전송 실패: ${reason}`);
      throw new Error(`Discord delivery failed: ${reason}`);
    }
  }

  if (crux.complete && lighthouse.complete) {
    await dependencies.writeSnapshot(decision.snapshot);
  } else {
    await dependencies.appendSummary(
      "현재 측정이 불완전해 이전 정상 snapshot을 대체하지 않습니다.",
    );
  }
};

export { redactPerformanceError, runCoreWebVitalsReport };
