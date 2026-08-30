import { readFile } from "node:fs/promises";

import { buildDependencySecurityReport } from "../src/lib/dependency-security/discord-report";
import { fetchDependabotAlerts } from "../src/lib/dependency-security/github-alerts";
import { addLockfileContext } from "../src/lib/dependency-security/lockfile-context";
import { sortForTriage } from "../src/lib/dependency-security/priority";
import { getDependencyTriageProvider } from "../src/lib/dependency-security/triage-provider";
import { sendDiscordCard } from "../src/lib/discord/send-webhook";

const main = async () => {
  const lockfile = JSON.parse(await readFile("package-lock.json", "utf8")) as unknown;
  const facts = (
    await fetchDependabotAlerts(process.env.GITHUB_REPOSITORY ?? "", process.env.GITHUB_TOKEN ?? "")
  ).map((fact) => addLockfileContext(fact, lockfile));
  const maxAlerts = Math.max(
    0,
    Number.parseInt(process.env.DEPENDENCY_TRIAGE_MAX_ALERTS ?? "10", 10) || 10,
  );
  const provider = getDependencyTriageProvider();
  let triage: Awaited<ReturnType<NonNullable<typeof provider>>> | null = null;
  if (provider && facts.length > 0 && maxAlerts > 0) {
    try {
      triage = await provider({
        facts: sortForTriage(facts).slice(0, maxAlerts),
        signal: AbortSignal.timeout(35_000),
      });
    } catch {
      console.warn("[dependency-triage] AI analysis unavailable; sending the base report");
    }
  }
  const sent = await sendDiscordCard(
    process.env.DISCORD_SECURITY_WEBHOOK_URL,
    buildDependencySecurityReport(
      facts,
      new Date(),
      triage?.results,
      triage ? `${triage.provider}/${triage.model}` : undefined,
    ),
    { configName: "DISCORD_SECURITY_WEBHOOK_URL" },
  );
  if (!sent.ok) throw new Error(sent.error.replace(/https?:\/\/\S+/g, "[redacted-url]"));
  console.log(`Dependency security report sent (${facts.length} open alert(s)).`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Dependency security report failed");
  process.exitCode = 1;
});
