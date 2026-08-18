/** LLM 판정 심각도. DB CHECK 제약과 같은 집합이다. */
type TriageSeverity = "critical" | "high" | "medium" | "low";

type TriageConfidence = "high" | "medium" | "low";

/**
 * Sentry 웹훅에서 화이트리스트로 추린 요약.
 * 이 타입에 없는 값은 LLM 에도 Discord 에도 가지 않는다. 요청 URL·헤더·본문·방문자
 * 식별자는 여기서 걸러진다 (ADR-0004 의 최소 수집 원칙을 LLM 제공자까지 확장).
 */
type SentryAlertSummary = {
  /** 중복 판정 키의 앞부분. */
  issueId: string;
  /** 중복 판정 키의 뒷부분. 페이로드에 없으면 본문 해시로 대체한다. */
  eventId: string;
  shortId?: string;
  title: string;
  culprit?: string;
  level?: string;
  environment?: string;
  release?: string;
  webUrl?: string;
  /** 발동한 Alert Rule 이름. 어떤 조건이 걸렸는지 카드에 남긴다. */
  triggeredRule?: string;
  /** `app_runtime`·`area`·`transaction` 세 개만 담는다. */
  tags: Record<string, string>;
  exceptionType?: string;
  exceptionValue?: string;
  /** in-app 프레임만, 최대 15개. */
  frames: SentryFrame[];
};

type SentryFrame = {
  filename?: string;
  function?: string;
  lineno?: number;
};

/** LLM 이 JSON 스키마로 강제 생성하는 판정 결과. */
type TriageResult = {
  severity: TriageSeverity;
  /** 브라우저 확장·외부 스크립트처럼 고칠 대상이 아닌 이벤트. */
  isNoise: boolean;
  userImpact: string;
  probableCause: string;
  suspectArea: string;
  recommendedActions: string[];
  confidence: TriageConfidence;
};

/** 판정에 성공한 카드와 판정 없이 나가는 카드를 한 타입으로 다룬다. */
type TriageOutcome =
  | { status: "ok"; result: TriageResult; provider: string; model: string; latencyMs: number }
  | { status: "failed" | "skipped"; reason: string };

export type { SentryAlertSummary, TriageOutcome, TriageResult, TriageSeverity };
