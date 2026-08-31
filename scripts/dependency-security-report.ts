import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildDependencySecurityReport } from "../src/lib/dependency-security/discord-report";
import { fetchDependabotAlerts } from "../src/lib/dependency-security/github-alerts";
import { addLockfileContext } from "../src/lib/dependency-security/lockfile-context";
import { sortForTriage } from "../src/lib/dependency-security/priority";
import { getDependencyTriageProvider } from "../src/lib/dependency-security/triage-provider";
import { sendDiscordCard } from "../src/lib/discord/send-webhook";
import { redactSecrets } from "../src/lib/text/redact-secrets";

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
  let triage: Awaited<ReturnType<typeof provider>> | null = null;
  if (facts.length > 0 && maxAlerts > 0) {
    try {
      triage = await provider(
        sortForTriage(facts).slice(0, maxAlerts),
        AbortSignal.timeout(35_000),
      );
    } catch {
      console.warn("[dependency-triage] AI analysis unavailable; sending the base report");
    }
  }
  const sent = await sendDiscordCard(
    process.env.DISCORD_SECURITY_WEBHOOK_URL,
    buildDependencySecurityReport(
      facts,
      new Date(),
      triage?.result,
      triage ? `${triage.provider}/${triage.model}` : undefined,
    ),
    { configName: "DISCORD_SECURITY_WEBHOOK_URL" },
  );
  if (!sent.ok) throw new Error(redactSecrets(sent.error));
  console.log(`Dependency security report sent (${facts.length} open alert(s)).`);
};

/** main 이 던진 오류에 시크릿이 남지 않게 치환한 뒤 종료 코드를 세운다. */
const runCli = async (): Promise<void> => {
  try {
    await main();
  } catch (error: unknown) {
    console.error(redactSecrets(error));
    process.exitCode = 1;
  }
};

// import 만으로 실행되면 테스트가 main 을 호출할 수 없으므로 CLI 진입일 때만 돌린다.
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) void runCli();

export { main, runCli };
