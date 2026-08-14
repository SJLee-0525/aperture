import { describe, expect, it } from "vitest";

import { normalizeCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";

describe("normalizeCodeLanguage", () => {
  it("같은 언어의 별칭을 하나로 모은다", () => {
    ["js", "JS", " javascript ", "mjs", "cjs", "node"].forEach((alias) =>
      expect(normalizeCodeLanguage(alias)).toBe("javascript"),
    );
    ["ts", "typescript"].forEach((alias) =>
      expect(normalizeCodeLanguage(alias)).toBe("typescript"),
    );
    ["cpp", "c++", "cc", "hpp"].forEach((alias) =>
      expect(normalizeCodeLanguage(alias)).toBe("cpp"),
    );
    ["sh", "bash", "shell", "zsh", "console"].forEach((alias) =>
      expect(normalizeCodeLanguage(alias)).toBe("bash"),
    );
  });

  it("JSX·TSX 는 별도 문법으로 남긴다", () => {
    expect(normalizeCodeLanguage("jsx")).toBe("jsx");
    expect(normalizeCodeLanguage("tsx")).toBe("tsx");
  });

  it("계획에 적힌 여섯 언어를 모두 안다", () => {
    ["javascript", "typescript", "java", "c", "cpp", "python"].forEach((language) =>
      expect(normalizeCodeLanguage(language)).toBe(language),
    );
  });

  it("모르는 표기와 빈 값은 null 이다", () => {
    ["brainfuck", "", "   ", "언어"].forEach((raw) =>
      expect(normalizeCodeLanguage(raw)).toBeNull(),
    );
  });
});
