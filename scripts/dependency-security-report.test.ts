import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/dependency-security/github-alerts", () => ({
  fetchDependabotAlerts: vi.fn(),
}));
vi.mock("../src/lib/discord/send-webhook", () => ({ sendDiscordCard: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn(async () => "{}") }));

const { fetchDependabotAlerts } = await import("../src/lib/dependency-security/github-alerts");
const { sendDiscordCard } = await import("../src/lib/discord/send-webhook");
const { main, runCli } = await import("./dependency-security-report");

const webhookUrl = "https://discord.com/api/webhooks/123456/AbCdEfGhIjKlMnOp";

describe("dependency-security-report", () => {
  const exitCode = process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchDependabotAlerts).mockResolvedValue([]);
    vi.mocked(sendDiscordCard).mockResolvedValue({ ok: true });
    vi.stubEnv("DEPENDENCY_TRIAGE_PROVIDER", "");
  });

  afterEach(() => {
    process.exitCode = exitCode;
    vi.unstubAllEnvs();
  });

  it("Discord 전송 실패 오류에 웹훅 주소를 남기지 않는다", async () => {
    vi.mocked(sendDiscordCard).mockResolvedValue({ ok: false, error: `POST ${webhookUrl} failed` });

    await expect(main()).rejects.toThrow("POST https://discord.com failed");
  });

  it("CLI 진입점이 최상위 예외도 치환해서 출력한다", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchDependabotAlerts).mockRejectedValue(new Error(`GET ${webhookUrl} failed`));

    await runCli();

    expect(error).toHaveBeenCalledWith("GET https://discord.com failed");
    expect(process.exitCode).toBe(1);
    error.mockRestore();
  });

  it("전송에 성공하면 예외를 던지지 않는다", async () => {
    await expect(main()).resolves.toBeUndefined();
  });
});
