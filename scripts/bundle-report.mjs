/**
 * 라우트별 전송량 보고서. Turbopack 빌드 출력에는 크기 컬럼이 없고 저장소에 analyzer 도 없어
 * 번들 변화를 판단할 근거가 없다. dist 하나를 주면 표를, 둘을 주면 diff 를 낸다.
 *
 * 사용:
 *   node scripts/bundle-report.mjs <dist>
 *   node scripts/bundle-report.mjs <before-dist> <after-dist>
 *   node scripts/bundle-report.mjs <dist> --json
 *
 * 세 지표를 더하지 않는다. 초기 RSC(flight) 데이터는 이미 HTML 에 인라인되고 별도 `.rsc` 는
 * client navigation 에서만 쓰이므로, 둘을 합치면 서로 다른 탐색 시나리오를 중복 계산한다.
 *   cold full load       = html + firstLoadJs
 *   cached full load     = html
 *   client navigation    = navigationRsc + 그 이동에서 새로 받는 JS
 *
 * 노이즈 바닥: 같은 커밋을 같은 env 로 두 번 빌드해 비교하면 라우트당 최대 5 bytes 차이가 난다
 * (90개 라우트, 95분위 3 bytes). 청크 해시가 달라지며 gzip 결과가 미세하게 흔들린다.
 * 20 bytes 이하의 차이는 신호로 읽지 않는다.
 *
 * 전후 비교는 `git worktree` 로 두 커밋을 각각 체크아웃해 **같은 env 로** 빌드한다.
 *   - node_modules 는 symlink 가 아니라 `cp -al` 하드링크로 넣는다.
 *     Turbopack 이 프로젝트 밖을 가리키는 symlink 를 거부한다. 같은 볼륨에서만 되고,
 *     파일 데이터는 공유하지만 디렉터리 엔트리 비용은 든다.
 *   - 워크트리에는 `.env.local` 이 없다. 빌드 환경에만 주입하고(`set -a; . .env.local; set +a`)
 *     측정 전용 값(NEXT_PUBLIC_USE_MOCK 등)은 명시적으로 override 해 양쪽을 똑같이 고정한다.
 *   - 별도 NEXT_DIST_DIR 로 빌드하면 Next 가 그 경로를 tsconfig.json include 에 추가하고
 *     재포맷한다. 원 저장소에서 했다면 되돌린다.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

/** 모든 파일에 같은 압축 수준을 쓴다. 값이 다르면 전후 비교가 무의미해진다. */
const GZIP_LEVEL = 9;

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/**
 * gzip 크기(bytes). 파일 단위로 압축한다.
 * 여러 파일을 이어 붙인 뒤 한 번에 압축하면 사전이 공유돼 실제 전송량보다 작게 나온다.
 *
 * @param {string} file
 * @returns {number}
 */
const gzipSize = (file) => gzipSync(readFileSync(file), { level: GZIP_LEVEL }).length;

/**
 * stats 의 청크 경로를 대상 dist 기준으로 옮긴다.
 * 경로에 빌드 당시의 dist 이름이 박혀 있어(`.next-playwright-v7/static/chunks/x.js`)
 * 다른 dist 를 잴 때 그대로 쓰면 어긋난다.
 *
 * @param {string} distDir
 * @param {string} chunkPath
 * @returns {string}
 */
const resolveChunkPath = (distDir, chunkPath) => {
  const marker = chunkPath.indexOf("static/");
  if (marker === -1) {
    throw new Error(`청크 경로에 static/ 구간이 없다: ${chunkPath}`);
  }
  return path.join(distDir, chunkPath.slice(marker));
};

/** stats 에 같은 청크가 중복될 수 있으므로 전송량을 한 번만 계산한다. */
const uniqueChunkPaths = (paths) => [...new Set(paths)];

/**
 * prerender-manifest 의 구체 경로를 route-bundle-stats 의 라우트 템플릿에 잇는다.
 * stats 는 `/[lang]/dev` 를, HTML·RSC 는 `/ko/dev` 를 쓰므로 문자열 치환으로는 이을 수 없다.
 * 아이콘·robots·sitemap 처럼 client 번들이 없는 산출물은 stats 에 없어 제외된다.
 *
 * @param {string} distDir
 * @returns {{ page: string; routeBundle: string; chunkPaths: string[]; uncompressedJsBytes: number; htmlFile: string; rscFile: string }[]}
 */
const collectRoutes = (distDir) => {
  const prerender = readJson(path.join(distDir, "prerender-manifest.json"));
  const statsRaw = readJson(path.join(distDir, "diagnostics/route-bundle-stats.json"));
  const byTemplate = new Map(Object.values(statsRaw).map((entry) => [entry.route, entry]));

  const rows = [];
  for (const [page, entry] of Object.entries(prerender.routes ?? {})) {
    const stat = byTemplate.get(entry.srcRoute);
    if (!stat) continue;
    const htmlName = page === "/" ? "/index" : page;
    rows.push({
      page,
      routeBundle: entry.srcRoute,
      chunkPaths: uniqueChunkPaths(stat.firstLoadChunkPaths).map((p) =>
        resolveChunkPath(distDir, p),
      ),
      uncompressedJsBytes: stat.firstLoadUncompressedJsBytes,
      htmlFile: path.join(distDir, "server/app", `${htmlName}.html`),
      // dataRoute 를 그대로 쓴다. `*.segments/**/*.segment.rsc` 는 부분 prefetch 산출물이라
      // glob 으로 긁으면 과대 측정된다.
      rscFile: path.join(distDir, "server/app", entry.dataRoute ?? `${htmlName}.rsc`),
    });
  }
  return rows.sort((a, b) => a.page.localeCompare(b.page));
};

/**
 * 라우트별 지표를 잰다. 누락된 산출물은 조용히 0 으로 넘기지 않고 모아서 던진다.
 *
 * @param {string} distDir
 * @returns {Map<string, { page: string; routeBundle: string; firstLoadJs: number; html: number; navigationRsc: number; rawJs: number; uncompressedJsBytes: number }>}
 */
const measure = (distDir) => {
  const missing = [];
  const measured = new Map();

  for (const row of collectRoutes(distDir)) {
    for (const chunk of row.chunkPaths) {
      if (!existsSync(chunk)) missing.push(chunk);
    }
    if (missing.length > 0) continue;

    measured.set(row.page, {
      page: row.page,
      routeBundle: row.routeBundle,
      firstLoadJs: row.chunkPaths.reduce((sum, file) => sum + gzipSize(file), 0),
      rawJs: row.chunkPaths.reduce((sum, file) => sum + readFileSync(file).length, 0),
      uncompressedJsBytes: row.uncompressedJsBytes,
      html: existsSync(row.htmlFile) ? gzipSize(row.htmlFile) : null,
      navigationRsc: existsSync(row.rscFile) ? gzipSize(row.rscFile) : null,
    });
  }

  if (missing.length > 0) {
    throw new Error(
      `청크 파일이 없다 (${missing.length}개):\n  ${[...new Set(missing)].join("\n  ")}`,
    );
  }
  return measured;
};

/**
 * 전후 보고서를 합친다. 어느 한쪽에만 있는 라우트도 남겨 신규·삭제를 드러낸다.
 *
 * @param {Map} before
 * @param {Map} after
 * @returns {{ page: string; status: "both" | "added" | "removed"; before: object | null; after: object | null }[]}
 */
const diff = (before, after) => {
  const pages = [...new Set([...before.keys(), ...after.keys()])].sort();
  return pages.map((page) => {
    const b = before.get(page) ?? null;
    const a = after.get(page) ?? null;
    const status = b && a ? "both" : a ? "added" : "removed";
    return { page, status, before: b, after: a };
  });
};

const pad = (text, width) => String(text).padEnd(width);
const num = (value) => (value === null || value === undefined ? "-" : String(value));
const delta = (b, a) => (b === null || a === null ? "-" : `${a - b >= 0 ? "+" : ""}${a - b}`);

const printSingle = (measured) => {
  console.log("단위: bytes (gzip). 세 지표는 서로 다른 시나리오이므로 더하지 않는다.\n");
  console.log(
    `${pad("page", 34)}${pad("route bundle", 30)}${pad("first-load JS", 15)}${pad("HTML", 10)}navigation RSC`,
  );
  for (const row of measured.values()) {
    console.log(
      `${pad(row.page, 34)}${pad(row.routeBundle, 30)}${pad(row.firstLoadJs, 15)}${pad(num(row.html), 10)}${num(row.navigationRsc)}`,
    );
  }
  const mismatched = [...measured.values()].filter((r) => r.rawJs !== r.uncompressedJsBytes);
  if (mismatched.length > 0) {
    console.log(
      `\n[sanity] 직접 합산한 raw JS 와 firstLoadUncompressedJsBytes 가 다른 라우트 ${mismatched.length}개.`,
    );
    for (const row of mismatched.slice(0, 5)) {
      console.log(`  ${row.page}: raw ${row.rawJs} vs stats ${row.uncompressedJsBytes}`);
    }
  }
};

const printDiff = (rows) => {
  console.log("단위: bytes (gzip). 음수가 감소.\n");
  console.log(
    `${pad("page", 34)}${pad("status", 9)}${pad("first-load JS", 15)}${pad("HTML", 12)}navigation RSC`,
  );
  for (const row of rows) {
    if (row.status !== "both") {
      console.log(`${pad(row.page, 34)}${pad(row.status, 9)}-              -           -`);
      continue;
    }
    console.log(
      `${pad(row.page, 34)}${pad("", 9)}${pad(delta(row.before.firstLoadJs, row.after.firstLoadJs), 15)}` +
        `${pad(delta(row.before.html, row.after.html), 12)}${delta(row.before.navigationRsc, row.after.navigationRsc)}`,
    );
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const dists = args.filter((a) => !a.startsWith("--"));

  if (dists.length === 0 || dists.length > 2) {
    console.error("사용: node scripts/bundle-report.mjs <dist> [<after-dist>] [--json]");
    process.exit(1);
  }

  if (dists.length === 1) {
    const measured = measure(dists[0]);
    if (json) console.log(JSON.stringify([...measured.values()], null, 2));
    else printSingle(measured);
    return;
  }

  const rows = diff(measure(dists[0]), measure(dists[1]));
  if (json) console.log(JSON.stringify(rows, null, 2));
  else printDiff(rows);
};

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}

export { collectRoutes, diff, measure, resolveChunkPath, uniqueChunkPaths };
