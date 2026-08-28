import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findCssClassClashes, readCssFile, ROOT, toPosix } from "./find-css-class-clashes.mjs";

const collectFiles = async () => {
  const files = [];
  for await (const entry of glob("src/**/*.tsx", { cwd: ROOT })) {
    if (entry.endsWith(".test.tsx")) continue;
    const path = toPosix(join(ROOT, entry));
    files.push({ path, source: readFileSync(path, "utf8") });
  }
  return files;
};

describe("한 요소에 얹힌 클래스들의 속성 충돌", () => {
  /**
   * 클래스 하나짜리 셀렉터는 명시도가 같아 승자를 스타일시트 삽입 순서가 정한다. 서로 다른
   * 스타일시트끼리는 그 순서가 청크 로딩에 달려 있어 라우트 진입 경로에 따라 뒤집힌다.
   * 실제로 두 번 물렸다 — 글 상세의 깨진 이미지 자리표시자와 지도 컨테이너다.
   */
  it("서로 다른 스타일시트의 클래스가 같은 속성을 다투지 않는다", async () => {
    const findings = findCssClassClashes({ files: await collectFiles(), readCss: readCssFile });
    const report = findings
      .map(({ file, line, left, right, properties }) => {
        return `${file}:${line}  ${left} <-> ${right}  (${properties.join(", ")})`;
      })
      .join("\n");

    expect(report).toBe("");
  });
});
