import { buildTriageInput, INSTRUCTIONS } from "@/lib/dependency-security/triage-prompt";
import { parseTriageResults, schemaFor } from "@/lib/dependency-security/triage-schema";

import type { DependencyTriageProvider } from "@/lib/dependency-security/triage-provider";

type ResponseBody = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

/** Responses API에는 결과를 저장하지 않고 strict JSON schema 출력만 허용한다. */
const createOpenAIProvider =
  (apiKey: string, model: string): DependencyTriageProvider =>
  async ({ facts, signal }) => {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: INSTRUCTIONS,
        input: [{ role: "user", content: buildTriageInput(facts) }],
        reasoning: { effort: "low" },
        max_output_tokens: 3_000,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "dependency_triage",
            strict: true,
            schema: schemaFor(true),
          },
        },
      }),
      signal,
    });
    if (!response.ok) throw new Error(`OpenAI dependency triage failed (${response.status})`);
    const body = (await response.json()) as ResponseBody;
    const text = body.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text ?? "")
      .join("");
    const results = parseTriageResults(text ?? "");
    if (!results) throw new Error("OpenAI returned an unusable dependency triage result");
    return { results, provider: "openai", model };
  };

export { createOpenAIProvider };
