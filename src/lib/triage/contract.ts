type TriageProviderName = "openai" | "gemini" | "mock";

/**
 * 한 계열의 단발 JSON 판정 계약. 전송(제공자 선택·폴백·타임아웃·HTTP)은 `lib/triage` 가
 * 소유하고, 이 계약은 계열이 소유한다.
 */
type TriageContract<In, Out> = {
  /** `${envPrefix}_PROVIDER` 계열 6종의 환경변수를 읽는다. 로그 라벨도 여기서 파생한다. */
  envPrefix: string;
  /** OpenAI json_schema 의 name. 오류 메시지에도 넣어 같은 로그에서 계열을 구분한다. */
  schemaName: string;
  instructions: string;
  buildInput(request: In): string;
  /** strict=true 는 OpenAI(additionalProperties 요구), false 는 Gemini 요청에 쓴다. */
  schema(strict: boolean): Record<string, unknown>;
  /** 계약을 어긴 응답은 null. 호출자는 판정 없는 기본 경로로 넘어간다. */
  parse(text: string, request: In): Out | null;
  outputTokens(request: In): number;
  /** base 는 primary 20초 / fallback 15초 구간이다. 요청 크기에 따라 늘릴 수 있다. */
  timeoutMs(request: In, base: number): number;
  /** 없으면 `${envPrefix}_PROVIDER=mock` 을 미설정으로 본다. */
  mockResult?(request: In): Out;
};

/** 어느 제공자가 답했는지 함께 돌려준다. 폴백으로 넘어간 사실이 카드와 기록에 남아야 한다. */
type TriageResponse<Out> = {
  result: Out;
  provider: TriageProviderName;
  model: string;
};

type TriageProvider<In, Out> = (request: In, signal: AbortSignal) => Promise<TriageResponse<Out>>;

export type { TriageContract, TriageProvider, TriageResponse };
