import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  collectRoutes,
  diff,
  measure,
  resolveChunkPath,
  uniqueChunkPaths,
} from "./bundle-report.mjs";

const created = [];

afterEach(() => {
  while (created.length > 0) rmSync(created.pop(), { recursive: true, force: true });
});

/**
 * 최소 dist 픽스처. 라우트마다 청크·HTML·RSC 를 실제 파일로 만들어
 * gzip 합산과 누락 처리 경로를 그대로 태운다.
 *
 * @param {{ distName?: string; routes: Record<string, { srcRoute: string; dataRoute: string }>; stats: object[]; chunks: Record<string, string>; pages: Record<string, { html?: string; rsc?: string }> }} spec
 * @returns {string} 만들어진 dist 경로.
 */
const makeDist = ({ distName = ".next-fixture", routes, stats, chunks, pages }) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "bundle-report-"));
  created.push(root);
  const dist = path.join(root, distName);

  mkdirSync(path.join(dist, "diagnostics"), { recursive: true });
  mkdirSync(path.join(dist, "static/chunks"), { recursive: true });
  writeFileSync(path.join(dist, "prerender-manifest.json"), JSON.stringify({ routes }));
  writeFileSync(
    path.join(dist, "diagnostics/route-bundle-stats.json"),
    JSON.stringify(Object.fromEntries(stats.map((s, i) => [String(i), s]))),
  );

  for (const [name, body] of Object.entries(chunks)) {
    writeFileSync(path.join(dist, "static/chunks", name), body);
  }
  for (const [page, files] of Object.entries(pages)) {
    const target = path.join(dist, "server/app", page);
    mkdirSync(path.dirname(target), { recursive: true });
    if (files.html !== undefined) writeFileSync(`${target}.html`, files.html);
    if (files.rsc !== undefined) writeFileSync(`${target}.rsc`, files.rsc);
  }
  return dist;
};

/** 한 라우트짜리 기본 픽스처. distName 으로 청크 경로의 dist 이름을 달리 할 수 있다. */
const singleRoute = ({ distName, chunkPaths }) =>
  makeDist({
    distName,
    routes: { "/ko/dev": { srcRoute: "/[lang]/dev", dataRoute: "/ko/dev.rsc" } },
    stats: [
      {
        route: "/[lang]/dev",
        firstLoadUncompressedJsBytes: 0,
        firstLoadChunkPaths: chunkPaths,
      },
    ],
    chunks: { "a.js": "a".repeat(500), "b.js": "b".repeat(500) },
    pages: { "ko/dev": { html: "<html>x</html>", rsc: "flight" } },
  });

describe("resolveChunkPath", () => {
  it("빌드 당시의 dist 이름을 대상 dist 로 바꾼다", () => {
    expect(resolveChunkPath("/tmp/after", ".next-playwright-v7/static/chunks/x.js")).toBe(
      "/tmp/after/static/chunks/x.js",
    );
  });

  it("static/ 구간이 없으면 조용히 넘기지 않고 던진다", () => {
    expect(() => resolveChunkPath("/tmp/after", "weird/path.js")).toThrow(/static\//);
  });
});

describe("uniqueChunkPaths", () => {
  it("같은 청크를 두 번 계산하지 않는다", () => {
    expect(uniqueChunkPaths(["a.js", "b.js", "a.js"])).toEqual(["a.js", "b.js"]);
  });
});

describe("collectRoutes", () => {
  it("구체 경로를 라우트 템플릿에 잇는다", () => {
    const dist = singleRoute({ chunkPaths: [".next-x/static/chunks/a.js"] });
    const rows = collectRoutes(dist);

    expect(rows).toHaveLength(1);
    expect(rows[0].page).toBe("/ko/dev");
    expect(rows[0].routeBundle).toBe("/[lang]/dev");
  });

  it("stats 에 없는 산출물(아이콘·robots 등)은 제외한다", () => {
    const dist = makeDist({
      routes: {
        "/ko/dev": { srcRoute: "/[lang]/dev", dataRoute: "/ko/dev.rsc" },
        "/robots.txt": { srcRoute: "/robots.txt", dataRoute: "/robots.txt.rsc" },
      },
      stats: [{ route: "/[lang]/dev", firstLoadUncompressedJsBytes: 0, firstLoadChunkPaths: [] }],
      chunks: {},
      pages: { "ko/dev": { html: "<html></html>", rsc: "f" } },
    });

    expect(collectRoutes(dist).map((r) => r.page)).toEqual(["/ko/dev"]);
  });
});

describe("measure", () => {
  it("청크를 파일 단위로 gzip 해 합산한다", () => {
    const dist = singleRoute({
      chunkPaths: [".next-x/static/chunks/a.js", ".next-x/static/chunks/b.js"],
    });
    const row = measure(dist).get("/ko/dev");

    // 이어 붙여 한 번에 압축하면 사전이 공유돼 훨씬 작아진다. 파일별 합이어야 한다.
    expect(row.firstLoadJs).toBeGreaterThan(20);
    expect(row.rawJs).toBe(1000);
    expect(row.html).toBeGreaterThan(0);
    expect(row.navigationRsc).toBeGreaterThan(0);
  });

  it("중복 청크는 한 번만 센다", () => {
    const once = measure(singleRoute({ chunkPaths: [".next-x/static/chunks/a.js"] })).get(
      "/ko/dev",
    );
    const twice = measure(
      singleRoute({ chunkPaths: [".next-x/static/chunks/a.js", ".next-x/static/chunks/a.js"] }),
    ).get("/ko/dev");

    expect(twice.rawJs).toBe(once.rawJs);
    expect(twice.firstLoadJs).toBe(once.firstLoadJs);
  });

  it("청크가 없으면 조용히 0 으로 넘기지 않고 던진다", () => {
    const dist = singleRoute({ chunkPaths: [".next-x/static/chunks/missing.js"] });

    expect(() => measure(dist)).toThrow(/청크 파일이 없다/);
  });

  it("dist 이름이 달라도 대상 dist 에서 청크를 찾는다", () => {
    const dist = singleRoute({
      distName: ".next-after",
      chunkPaths: [".next-playwright-v7/static/chunks/a.js"],
    });

    expect(measure(dist).get("/ko/dev").rawJs).toBe(500);
  });
});

describe("diff", () => {
  const row = (page, firstLoadJs) => ({
    page,
    routeBundle: "/x",
    firstLoadJs,
    html: 10,
    navigationRsc: 5,
  });

  it("양쪽 라우트의 합집합을 취한다", () => {
    const before = new Map([["/a", row("/a", 100)]]);
    const after = new Map([["/b", row("/b", 100)]]);

    expect(diff(before, after).map((r) => r.page)).toEqual(["/a", "/b"]);
  });

  it("신규·삭제 라우트를 표시한다", () => {
    const before = new Map([
      ["/keep", row("/keep", 100)],
      ["/gone", row("/gone", 100)],
    ]);
    const after = new Map([
      ["/keep", row("/keep", 90)],
      ["/new", row("/new", 50)],
    ]);

    const byPage = Object.fromEntries(diff(before, after).map((r) => [r.page, r.status]));
    expect(byPage).toEqual({ "/keep": "both", "/gone": "removed", "/new": "added" });
  });
});
