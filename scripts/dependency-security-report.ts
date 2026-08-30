import { readFile } from "node:fs/promises";

import { buildDependencySecurityReport } from "../src/lib/dependency-security/discord-report";
import { fetchDependabotAlerts } from "../src/lib/dependency-security/github-alerts";
import { addLockfileContext } from "../src/lib/dependency-security/lockfile-context";
import { sendDiscordCard } from "../src/lib/discord/send-webhook";

const main = async () => {
  const lockfile = JSON.parse(await readFile("package-lock.json", "utf8")) as unknown;
  const facts = (
    await fetchDependabotAlerts(process.env.GITHUB_REPOSITORY ?? "", process.env.GITHUB_TOKEN ?? "")
  ).map((fact) => addLockfileContext(fact, lockfile));
  const sent = await sendDiscordCard(
    process.env.DISCORD_SECURITY_WEBHOOK_URL,
    buildDependencySecurityReport(facts),
    { configName: "DISCORD_SECURITY_WEBHOOK_URL" },
  );
  if (!sent.ok) throw new Error(sent.error.replace(/https?:\/\/\S+/g, "[redacted-url]"));
  console.log(`Dependency security report sent (${facts.length} open alert(s)).`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Dependency security report failed");
  process.exitCode = 1;
});
