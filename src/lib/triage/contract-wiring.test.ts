import { describe, expect, it, vi } from "vitest";

import { DEPENDENCY_TRIAGE_CONTRACT } from "@/lib/dependency-security/triage-provider";
import { PERFORMANCE_TRIAGE_CONTRACT } from "@/lib/performance-alerts/triage-provider";
import { SENTRY_TRIAGE_CONTRACT } from "@/lib/sentry-triage/triage-provider";
import { createGeminiAdapter } from "@/lib/triage/gemini";
import { createOpenAIAdapter } from "@/lib/triage/openai";

import type { DependencySecurityFact } from "@/lib/dependency-security/types";
import type { PerformanceTriageInput } from "@/lib/performance-alerts/triage-prompt";
import type { TriageContract } from "@/lib/triage/contract";
import type { SentryAlertSummary } from "@/types/sentry-alert";

/**
 * 세 실제 계약을 두 실제 어댑터에 통과시킨다. 계약 필드 테스트와 어댑터 단위 테스트가
 * 각각 통과해도, 어댑터가 계약의 어느 필드를 어디에 배선하는지는 여기서만 고정된다.
 */

const sentrySummary: SentryAlertSummary = {
  issueId: "1",
  eventId: "2",
  title: "EvalError: capture",
  environment: "production",
  release: "aperture@abc1234",
  tags: { app_runtime: "browser", area: "public" },
  exceptionType: "EvalError",
  exceptionValue: "capture",
  frames: [{ filename: "app.ts", function: "handle", lineno: 12 }],
};

const sentryVerdict = {
  severity: "high",
  isNoise: false,
  userImpact: "화면이 비어 있다",
  probableCause: "빈 문서를 참조한다",
  suspectArea: "app.ts",
  recommendedActions: ["필터한다"],
  confidence: "medium",
};

const dependencyFact: DependencySecurityFact = {
  alertNumber: 7,
  packageName: "left-pad",
  installedVersions: ["1.0.0"],
  vulnerableInstalledVersions: ["1.0.0"],
  vulnerableVersionRange: "<2.0.0",
  firstPatchedVersion: "2.0.0",
  scope: "runtime",
  relationship: "direct",
  lockfileLocations: ["node_modules/left-pad"],
  severity: "high",
  cvssScore: 7.5,
  epssPercentage: 12,
  ghsaId: "GHSA-aaaa-bbbb-cccc",
  cveId: "CVE-2026-0001",
  summary: "취약점 요약",
  createdAt: "2026-08-01T00:00:00Z",
  alertUrl: "https://github.com/o/r/security/dependabot/7",
  priority: "immediate",
  isNew: true,
};

const dependencyVerdicts = {
  results: [
    {
      alertNumber: 7,
      impact: "런타임 의존이라 영향이 있다",
      priorityReason: "직접 의존이고 수정 버전이 있다",
      recommendedChecks: ["npm ls left-pad 로 사용 위치를 확인한다"],
      confidence: "medium",
    },
  ],
};

const performanceInput: PerformanceTriageInput = {
  target: "https://example.com/ko",
  scope: "url",
  formFactor: "PHONE",
  collectionPeriod: null,
  release: null,
  metrics: [{ source: "field", metric: "LCP", current: 4_500, previous: 3_000, status: "poor" }],
  diagnostics: [],
};

const performanceVerdict = {
  commonSummary: "LCP 회귀",
  commonCauses: [],
  targets: [
    {
      targetIndex: 0,
      summary: "LCP 가 나빠졌다",
      userImpact: "첫 화면이 늦게 보인다",
      likelyCauses: ["이미지 지연"],
      inspectFirst: ["히어로 이미지"],
      recommendedChecks: ["npm run test:lighthouse:production"],
      confidence: "medium",
    },
  ],
};

type WiringCase<In, Out> = {
  name: string;
  contract: TriageContract<In, Out>;
  request: In;
  responseText: string;
};

const cases = [
  {
    name: "sentry",
    contract: SENTRY_TRIAGE_CONTRACT,
    request: sentrySummary,
    responseText: JSON.stringify(sentryVerdict),
  },
  {
    name: "dependency",
    contract: DEPENDENCY_TRIAGE_CONTRACT,
    request: [dependencyFact],
    responseText: JSON.stringify(dependencyVerdicts),
  },
  {
    name: "performance",
    contract: PERFORMANCE_TRIAGE_CONTRACT,
    request: [performanceInput],
    responseText: JSON.stringify(performanceVerdict),
  },
] as unknown as WiringCase<unknown, unknown>[];

const openaiResponse = (text: string) =>
  new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text }] }] }));

const geminiResponse = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));

const callBoth = async ({ contract, request, responseText }: WiringCase<unknown, unknown>) => {
  const openaiFetch = vi.fn(async () => openaiResponse(responseText));
  const geminiFetch = vi.fn(async () => geminiResponse(responseText));
  const openai = await createOpenAIAdapter(
    contract,
    "key",
    "model-a",
    openaiFetch as typeof fetch,
  )(request, new AbortController().signal);
  const gemini = await createGeminiAdapter(
    contract,
    "key",
    "model-b",
    geminiFetch as typeof fetch,
  )(request, new AbortController().signal);
  const bodyOf = (calls: unknown[]): Record<string, never> =>
    JSON.parse(((calls as [string, RequestInit][])[0]![1] as RequestInit).body as string) as Record<
      string,
      never
    >;
  const openaiBody = bodyOf(openaiFetch.mock.calls);
  const geminiBody = bodyOf(geminiFetch.mock.calls);
  return { openai, gemini, openaiBody, geminiBody };
};

describe.each(cases)("계약 배선: $name", (wiring) => {
  it("지시문과 직렬화한 입력이 두 요청의 같은 자리에 들어간다", async () => {
    const { openaiBody, geminiBody } = await callBoth(wiring);
    const input = wiring.contract.buildInput(wiring.request);

    expect((openaiBody.input as Array<{ content: string }>)[0]!.content).toBe(input);
    expect(
      (geminiBody.contents as Array<{ parts: Array<{ text: string }> }>)[0]!.parts[0]!.text,
    ).toBe(input);
    expect(openaiBody.instructions).toBe(wiring.contract.instructions);
    expect(
      (geminiBody.systemInstruction as { parts: Array<{ text: string }> }).parts[0]!.text,
    ).toBe(wiring.contract.instructions);
  });

  it("OpenAI 는 strict schema 와 계약 이름을, Gemini 는 비 strict schema 를 쓴다", async () => {
    const { openaiBody, geminiBody } = await callBoth(wiring);
    const format = (openaiBody.text as { format: Record<string, unknown> }).format;

    expect(format.name).toBe(wiring.contract.schemaName);
    expect(format.schema).toEqual(wiring.contract.schema(true));
    expect((geminiBody.generationConfig as Record<string, unknown>).responseJsonSchema).toEqual(
      wiring.contract.schema(false),
    );
  });

  it("계약의 출력 예산이 두 요청에 같은 값으로 들어간다", async () => {
    const { openaiBody, geminiBody } = await callBoth(wiring);
    const budget = wiring.contract.outputTokens(wiring.request);

    expect(openaiBody.max_output_tokens).toBe(budget);
    expect((geminiBody.generationConfig as Record<string, unknown>).maxOutputTokens).toBe(budget);
  });

  it("두 어댑터가 같은 판정 결과를 provider 이름만 다르게 돌려준다", async () => {
    const { openai, gemini } = await callBoth(wiring);

    expect(openai.result).toEqual(gemini.result);
    expect(openai.result).toEqual(wiring.contract.parse(wiring.responseText, wiring.request));
    expect(openai.provider).toBe("openai");
    expect(gemini.provider).toBe("gemini");
    expect(Object.keys(openai).sort()).toEqual(Object.keys(gemini).sort());
  });
});

describe("parse 가 응답 text 와 원래 request 를 함께 받는다", () => {
  it("performance 계약은 요청 대상 수와 다른 응답을 거부한다", async () => {
    // targets 가 2개인 응답을 대상 1개짜리 요청에 돌려주면 parse(text, request) 가 null 을
    // 내고 어댑터가 던진다. request 가 parse 에 전달되지 않으면 이 거부가 성립하지 않는다.
    const twoTargets = JSON.stringify({
      ...performanceVerdict,
      targets: [
        performanceVerdict.targets[0],
        { ...performanceVerdict.targets[0], targetIndex: 1 },
      ],
    });
    const fetcher = vi.fn(async () => openaiResponse(twoTargets));

    const run = createOpenAIAdapter(
      PERFORMANCE_TRIAGE_CONTRACT,
      "key",
      "model-a",
      fetcher as typeof fetch,
    )([performanceInput], new AbortController().signal);

    await expect(run).rejects.toThrow(/unusable performance_triage/);
  });
});
