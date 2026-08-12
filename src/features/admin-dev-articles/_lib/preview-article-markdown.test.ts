import { afterEach, describe, expect, it, vi } from "vitest";

import { previewArticleMarkdown } from "@/features/admin-dev-articles/_lib/preview-article-markdown";
import { articleCodeHighlightKey } from "@/features/dev-blog/_lib/markdown-highlight-map";

const verifyAdminIdToken = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/verify-admin-id-token", () => ({ verifyAdminIdToken }));

afterEach(() => {
  vi.unstubAllEnvs();
  verifyAdminIdToken.mockReset();
});

describe("previewArticleMarkdown", () => {
  it("관리자 토큰을 확인한 뒤에만 렌더한다", async () => {
    verifyAdminIdToken.mockResolvedValue(true);

    const result = await previewArticleMarkdown("token", "## 제목\n\n본문");

    expect(verifyAdminIdToken).toHaveBeenCalledWith("token");
    expect(result.document.blocks).toHaveLength(2);
    expect(result.issues).toEqual([]);
  });

  it("관리자가 아니면 거부한다", async () => {
    verifyAdminIdToken.mockResolvedValue(false);

    await expect(previewArticleMarkdown("", "본문")).rejects.toThrow("Unauthorized");
  });

  it("E2E 세션에서는 토큰 없이 통과한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_E2E_ADMIN_SESSION", "1");
    vi.stubEnv("NODE_ENV", "test");
    verifyAdminIdToken.mockResolvedValue(false);

    await expect(previewArticleMarkdown("", "본문")).resolves.toMatchObject({ issues: [] });
    expect(verifyAdminIdToken).not.toHaveBeenCalled();
  });

  it("색칠 결과를 본문과 함께 돌려준다", async () => {
    verifyAdminIdToken.mockResolvedValue(true);

    const { highlights } = await previewArticleMarkdown(
      "token",
      ["```ts", "const a = 1;", "```"].join("\n"),
    );

    expect(highlights[articleCodeHighlightKey("typescript", "const a = 1;")]).toBeTruthy();
  });

  it("검증에 걸린 곳을 원문 위치와 함께 돌려준다", async () => {
    verifyAdminIdToken.mockResolvedValue(true);

    const { issues } = await previewArticleMarkdown("token", "본문\n\n[링크](javascript:alert(1))");

    expect(issues[0]).toMatchObject({ code: "link-not-allowed", point: { line: 3 } });
  });

  it("본문이 상한을 넘으면 렌더하지 않는다", async () => {
    verifyAdminIdToken.mockResolvedValue(true);

    await expect(previewArticleMarkdown("token", "가".repeat(200_001))).rejects.toThrow(
      /본문이 너무 깁니다/,
    );
  });
});
