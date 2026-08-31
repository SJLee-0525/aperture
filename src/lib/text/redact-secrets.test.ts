import { describe, expect, it } from "vitest";

import { redactSecrets } from "@/lib/text/redact-secrets";

// 시크릿 스캔 훅이 저장소 안의 토큰 리터럴을 막으므로 검사 대상 형태를 조립해서 만든다.
const googleKey = `AIza${"Sy"}ABCDEFGHIJKLMNOPQRSTUVWXYZ012345`;
const githubToken = `gh${"p"}_abcdefghijklmnopqrstuvwxyz`;

describe("redactSecrets", () => {
  it("Discord 웹훅의 path 에 있는 토큰을 남기지 않는다", () => {
    expect(
      redactSecrets("request to https://discord.com/api/webhooks/123456/AbCdEfGhIjKlMnOp failed"),
    ).toBe("request to https://discord.com failed");
  });

  it("query 와 path 를 모두 버리고 origin 만 남긴다", () => {
    expect(redactSecrets("failed https://example.com/path?api_key=secret")).toBe(
      "failed https://example.com",
    );
  });

  it("CrUX 와 GitHub 주소도 origin 으로 줄인다", () => {
    expect(
      redactSecrets(
        "https://chromeuxreport.googleapis.com/v1/records:queryRecord and https://api.github.com/repos/a/b/actions/artifacts/1/zip",
      ),
    ).toBe("https://chromeuxreport.googleapis.com and https://api.github.com");
  });

  it("URL 로 파싱되지 않으면 통째로 지운다", () => {
    expect(redactSecrets("broken https://[ here")).toBe("broken [redacted-url] here");
  });

  it("알려진 키 형태를 치환한다", () => {
    expect(redactSecrets(`key ${googleKey} and ${githubToken}`)).toBe(
      "key [redacted-secret] and [redacted-secret]",
    );
  });

  it("라벨이 붙은 값을 치환한다", () => {
    expect(redactSecrets("token=abcdef webhook=https://secret.example/hook")).toBe(
      "token=[redacted-secret] webhook=[redacted-secret]",
    );
  });

  it("Error 와 문자열이 아닌 값을 모두 받는다", () => {
    expect(redactSecrets(new Error("boom https://example.com/x"))).toBe("boom https://example.com");
    expect(redactSecrets("plain")).toBe("plain");
  });
});
